import { createHmac, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Server-only, disabled-by-default transport to the existing RealtyFlow Doña Anna
 * inquiry endpoint. No shared secret, IP/email digest salt, or raw IP is sent
 * to the browser, and submissions are not accepted until both ends are configured.
 */
type Payload = Record<string, unknown>;
const MAX_BYTES = 4096;
const REALTYFLOW_ENDPOINT = 'https://realtyflow.chatgenius.pro/api/integrations/donaanna/public-inquiry';

function send(res: ServerResponse, status: number, code: string, accepted = false) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ accepted, code }));
}

async function parseJson(req: IncomingMessage): Promise<Payload | null> {
  let raw = '';
  try {
    for await (const chunk of req) {
      raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return null;
    }
    const data: unknown = JSON.parse(raw);
    return data && typeof data === 'object' && !Array.isArray(data) ? data as Payload : null;
  } catch {
    return null;
  }
}

function field(value: unknown, max = 254): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const enabled = process.env.DONAANNA_PUBLIC_INQUIRY_ENABLED === 'true';
  const shared = process.env.DONAANNA_INQUIRY_SHARED_SECRET;
  const pepper = process.env.DONAANNA_INQUIRY_HMAC_SECRET;
  const configured = enabled && Boolean(shared && pepper && pepper.length >= 32);
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ enabled: configured }));
    return;
  }
  if (req.method !== 'POST') return send(res, 405, 'method_not_allowed');
  if (!configured) return send(res, 503, 'not_configured');
  if (!/^application\/json(?:\s*;|\s*$)/i.test(String(req.headers['content-type'] ?? ''))) return send(res, 415, 'invalid_content_type');
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return send(res, 413, 'too_large');

  const data = await parseJson(req);
  if (!data || field(data.website, 150)) return send(res, 400, 'invalid_fields');
  const company = field(data.company, 120);
  const name = field(data.name, 100);
  const email = field(data.email, 254).toLowerCase();
  const role = field(data.role, 100);
  const product = field(data.product, 100);
  const address = field(data.address, 150);
  const message = field(data.message, 1000);
  if (!company || !name || !role || !address || !product || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return send(res, 400, 'invalid_fields');
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!ip) return send(res, 503, 'rate_limit_unavailable');
  const digest = (value: string) => createHmac('sha256', pepper).update(value).digest('hex');

  // UTM values originate from the landing URL. Invalid/absent values are
  // omitted entirely, not guessed or substituted with a generic brand lead.
  const utmContent = field(data.utmContent, 240);
  const utmSource = field(data.utmSource, 20).toLowerCase();
  const tracked = /^[a-zA-Z0-9_:.-]{1,240}$/.test(utmContent) && ['facebook', 'instagram'].includes(utmSource);
  const payload: Payload = {
    kind: 'tasting', audience: 'business', company, name, email, role, area: address,
    message: message || 'Forespørsel om smaksprøve fra donaanna.com',
    product,
    rateIdentityIp: digest('ip:' + ip),
    rateIdentityEmail: digest('email:' + email),
    ...(tracked ? { utmContent, utmSource, trackingEventId: randomUUID() } : {}),
  };
  try {
    const upstream = await fetch(REALTYFLOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-donaanna-inquiry-secret': shared },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (upstream.ok) {
      const body: unknown = await upstream.json().catch(() => null);
      if (body && typeof body === 'object' && (body as { accepted?: unknown }).accepted === true) {
        return send(res, 200, 'accepted', true);
      }
    }
    // Do not reveal provider, token, internal URL or customer PII.
    return send(res, upstream.status === 429 ? 429 : 503, upstream.status === 429 ? 'rate_limited' : 'delivery_unavailable');
  } catch {
    return send(res, 503, 'delivery_unavailable');
  }
}
