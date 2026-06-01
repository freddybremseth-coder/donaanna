import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';

const GEMINI_HOST = 'generativelanguage.googleapis.com';
const OPENAI_HOST = 'api.openai.com';
const ANTHROPIC_HOST = 'api.anthropic.com';
const CATASTRO_HOST = 'ovc.catastro.meh.es';
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

type VercelRequest = IncomingMessage & { url: string; method?: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getForwardPath(req: VercelRequest, prefix: string, fallback: string) {
  const raw = req.url ?? fallback;
  const url = new URL(raw, 'https://olivia.local');
  const rewrittenPath = url.searchParams.get('path');
  if (rewrittenPath) {
    url.searchParams.delete('path');
    const path = rewrittenPath.startsWith('/') ? rewrittenPath : `/${rewrittenPath}`;
    const query = url.searchParams.toString();
    return query ? `${path}?${query}` : path;
  }
  return raw.replace(new RegExp(`^${escapeRegExp(prefix)}`), '') || fallback;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}

function handleOptions(res: ServerResponse, methods: string, headers: string) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
  });
  res.end();
}

function proxyHttps(
  req: VercelRequest,
  res: ServerResponse,
  options: {
    hostname: string;
    path: string;
    method: string;
    headers: Record<string, string | string[]>;
    body?: Buffer;
    cacheControl?: string;
  },
) {
  const proxyReq = https.request(
    {
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      headers: options.headers,
    },
    (proxyRes) => {
      const respHeaders: Record<string, string | string[]> = {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': options.cacheControl ?? 'no-store',
      };
      if (proxyRes.headers['content-type']) respHeaders['Content-Type'] = proxyRes.headers['content-type'];
      res.writeHead(proxyRes.statusCode ?? 200, respHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
  });

  if (options.body) proxyReq.write(options.body);
  proxyReq.end();
}

export async function geminiHandler(req: VercelRequest, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    handleOptions(res, 'GET,POST,OPTIONS', 'Content-Type, x-goog-api-key');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  const withoutPrefix = getForwardPath(req, '/api/ai/gemini', '/');
  const upstream = new URL(`https://${GEMINI_HOST}${withoutPrefix}`);
  upstream.searchParams.set('key', apiKey);
  const body = req.method && req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : undefined;
  const headers: Record<string, string | string[]> = { 'User-Agent': 'Olivia/1.0' };
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;
  if (body) headers['Content-Length'] = String(body.length);

  proxyHttps(req, res, {
    hostname: GEMINI_HOST,
    path: upstream.pathname + upstream.search,
    method: req.method ?? 'GET',
    headers,
    body,
  });
}

export async function openaiHandler(req: VercelRequest, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    handleOptions(res, 'POST,OPTIONS', 'Content-Type, Authorization');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'OPENAI_API_KEY is not configured on the server' });
    return;
  }

  const path = getForwardPath(req, '/api/ai/openai', '/v1/chat/completions');
  const body = req.method && req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : undefined;
  const headers: Record<string, string | string[]> = {
    Authorization: `Bearer ${apiKey}`,
    'User-Agent': 'Olivia/1.0',
  };
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;
  if (body) headers['Content-Length'] = String(body.length);

  proxyHttps(req, res, {
    hostname: OPENAI_HOST,
    path,
    method: req.method ?? 'POST',
    headers,
    body,
  });
}

export async function anthropicHandler(req: VercelRequest, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    handleOptions(res, 'POST,OPTIONS', 'Content-Type, anthropic-version');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'ANTHROPIC_API_KEY is not configured on the server' });
    return;
  }

  const path = getForwardPath(req, '/api/ai/anthropic', '/v1/messages');
  const body = req.method && req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : undefined;
  const headers: Record<string, string | string[]> = {
    'x-api-key': apiKey,
    'anthropic-version': (req.headers['anthropic-version'] as string) || DEFAULT_ANTHROPIC_VERSION,
    'User-Agent': 'Olivia/1.0',
  };
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;
  if (body) headers['Content-Length'] = String(body.length);

  proxyHttps(req, res, {
    hostname: ANTHROPIC_HOST,
    path,
    method: req.method ?? 'POST',
    headers,
    body,
  });
}

export function catastroHandler(req: VercelRequest, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    handleOptions(res, 'GET,HEAD,OPTIONS', 'Content-Type');
    return;
  }

  proxyHttps(req, res, {
    hostname: CATASTRO_HOST,
    path: getForwardPath(req, '/api/catastro', '/'),
    method: req.method ?? 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Olivia/1.0)',
      Accept: 'text/xml,application/xml,*/*',
    },
    cacheControl: 's-maxage=60',
  });
}
