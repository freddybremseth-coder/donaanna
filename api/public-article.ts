import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.donaanna.com';
const DESTINATIONS = new Set(['magasin', 'artikler', 'blogg', 'oppskrifter']);

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch] || ch));
}

function articleMarkup(markdown: string) {
  const lines = String(markdown || '').split(/\r?\n/);
  const output: string[] = [];
  let items: string[] = [];
  let firstHeading = true;
  function flushList() {
    if (!items.length) return;
    output.push('<ul>' + items.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>');
    items = [];
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    if (/^[-*]\s+/.test(line)) {
      items.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushList();
    const heading = line.match(/^#{1,6}\s+(.+)/);
    if (heading) {
      if (firstHeading) { firstHeading = false; continue; }
      output.push('<h2>' + escapeHtml(heading[1]) + '</h2>');
    } else {
      firstHeading = false;
      output.push('<p>' + escapeHtml(line) + '</p>');
    }
  }
  flushList();
  return output.join('\n');
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  const destination = typeof req.query?.destination === 'string' ? req.query.destination : '';
  const slug = typeof req.query?.slug === 'string' ? req.query.slug : '';
  if (!DESTINATIONS.has(destination) || !/^[a-z0-9][a-z0-9-]{0,89}$/.test(slug)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('website_posts')
    .select('title,slug,summary,markdown,image_url,published_at,updated_at')
    .eq('brand_id', 'donaanna')
    .eq('destination_id', destination)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }
  if (!data) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  const title = String(data.title || '');
  const summary = String(data.summary || 'Les om oliven, olivenolje og livet på Doña Anna i Biar, Alicante.').slice(0, 250);
  const canonical = SITE + '/' + destination + '/' + encodeURIComponent(slug);
  let image = '';
  try {
    const source = String(data.image_url || '').trim();
    if (source) {
      const parsed = new URL(source, SITE);
      if (parsed.protocol === 'https:') image = parsed.href;
    }
  } catch {}

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': canonical + '#article',
    headline: title,
    description: summary,
    url: canonical,
    mainEntityOfPage: canonical,
    image: image || undefined,
    datePublished: data.published_at || undefined,
    dateModified: data.updated_at || data.published_at || undefined,
    author: { '@type': 'Organization', '@id': SITE + '/#organization', name: 'Doña Anna' },
    publisher: { '@type': 'Organization', '@id': SITE + '/#organization', name: 'Doña Anna' },
  };

  const css = 'body{background:#0d0d0d;color:#f7f1df;margin:0;font-family:Arial,sans-serif;line-height:1.75}' +
    'header{border-bottom:1px solid #39342d;padding:20px 5%}a{color:#d4af37}' +
    'main{max-width:900px;margin:0 auto;padding:45px 22px 100px}h1,h2{font-family:Georgia,serif;line-height:1.2}' +
    'h1{font-size:clamp(2.2rem,6vw,4.4rem)}h2{font-size:2rem;margin-top:2.3rem}' +
    'p,li{font-size:1.1rem}.summary{color:#d8cab0;font-size:1.25rem}' +
    'img{max-width:100%;height:auto;margin:22px 0}nav a{margin-right:20px}';
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(title) + ' | Doña Anna</title>' +
    '<meta name="description" content="' + escapeHtml(summary) + '">' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    '<meta property="og:type" content="article">' +
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">' +
    '<meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(summary) + '">' +
    (image ? '<meta property="og:image" content="' + escapeHtml(image) + '">' : '') +
    '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' +
    '<style>' + css + '</style></head><body>' +
    '<header><nav><a href="/">DOÑA ANNA</a><a href="/' + destination + '">Til ' + escapeHtml(destination) + '</a></nav></header>' +
    '<main><article><h1>' + escapeHtml(title) + '</h1><p class="summary">' + escapeHtml(summary) + '</p>' +
    (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '">' : '') +
    articleMarkup(String(data.markdown || '')) +
    '</article><p><a href="/' + destination + '">← Tilbake</a></p></main></body></html>';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  });
  res.end(html);
}
