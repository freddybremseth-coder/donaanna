import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.donaanna.com';
const DESTINATIONS: Record<string, { label: string; heading: string; description: string }> = {
  magasin: { label: 'Magasin', heading: 'Doña Anna Magasin', description: 'Olivenolje, kvalitet, gårdsliv og smaker fra Biar i Alicante.' },
  artikler: { label: 'Artikler', heading: 'Kunnskap om olivenolje', description: 'Fagartikler, råvarer og praktisk veiledning for kokker og matinteresserte.' },
  blogg: { label: 'Blogg', heading: 'Notater fra gården', description: 'Historier fra olivenlunden, kjøkkenet og markedet.' },
  oppskrifter: { label: 'Oppskrifter', heading: 'Oppskrifter med olivenolje', description: 'Serveringsideer, smakskombinasjoner og praktiske oppskrifter.' },
};

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo',
  }).format(new Date(value));
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  const destination = typeof req.query?.destination === 'string' ? req.query.destination : '';
  const config = DESTINATIONS[destination];
  if (!config) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !roleKey) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }

  const supabase = createClient(url, roleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('website_posts')
    .select('slug,title,summary,image_url,published_at')
    .eq('brand_id', 'donaanna')
    .eq('destination_id', destination)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }

  const articles = (data || []).filter(post =>
    post.slug && /^[a-z0-9][a-z0-9-]{0,89}$/.test(String(post.slug))
  );
  const cards = articles.map(post => {
    const href = '/' + destination + '/' + encodeURIComponent(String(post.slug));
    const title = escapeHtml(post.title);
    const summary = escapeHtml(post.summary);
    const date = formatDate(post.published_at);
    let image = '';
    try {
      const parsed = new URL(String(post.image_url || ''), SITE);
      if (parsed.protocol === 'https:') image = parsed.href;
    } catch {}
    return '<article class="card">' +
      (image ? '<a href="' + href + '"><img src="' + escapeHtml(image) + '" alt="' + title + '" loading="lazy"></a>' : '') +
      '<div class="card-body">' +
      (date ? '<p class="date">' + escapeHtml(date) + '</p>' : '') +
      '<h2><a href="' + href + '">' + title + '</a></h2>' +
      (summary ? '<p>' + summary + '</p>' : '') +
      '<p><a href="' + href + '">Les ' + title + ' →</a></p></div></article>';
  }).join('');

  const canonical = SITE + '/' + destination;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': canonical + '#collection',
    url: canonical,
    name: config.heading,
    description: config.description,
    isPartOf: { '@id': SITE + '/#website' },
  };
  const css = 'body{background:#0d0d0d;color:#f7f1df;margin:0;font-family:Arial,sans-serif;line-height:1.7}' +
    'header{border-bottom:1px solid #39342d;padding:20px 5%}a{color:#d4af37}nav a{margin-right:20px}' +
    'main{max-width:1200px;margin:0 auto;padding:50px 24px 90px}' +
    'h1,h2{font-family:Georgia,serif;line-height:1.22}h1{font-size:clamp(2.1rem,5vw,4rem)}' +
    '.intro{max-width:750px;color:#d8cab0;font-size:1.2rem}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:22px;margin-top:42px}' +
    '.card{border:1px solid #39342d;background:#17130d}.card img{width:100%;height:200px;object-fit:cover}.card-body{padding:25px}' +
    '.card h2{font-size:1.65rem}.card p{color:#dbd2c3}.card .date{color:#d4af37;font-size:.8rem;text-transform:uppercase}';
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(config.heading) + ' | Doña Anna</title>' +
    '<meta name="description" content="' + escapeHtml(config.description) + '">' +
    '<link rel="canonical" href="' + canonical + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="' + canonical + '">' +
    '<meta property="og:title" content="' + escapeHtml(config.heading) + ' | Doña Anna">' +
    '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' +
    '<style>' + css + '</style></head><body>' +
    '<header><nav><a href="/">DOÑA ANNA</a><a href="/magasin">Magasin</a>' +
    '<a href="/artikler">Artikler</a><a href="/blogg">Blogg</a><a href="/oppskrifter">Oppskrifter</a></nav></header>' +
    '<main><h1>' + escapeHtml(config.heading) + '</h1><p class="intro">' + escapeHtml(config.description) + '</p>' +
    (cards ? '<section class="cards" aria-label="' + escapeHtml(config.label) + '">' + cards + '</section>'
      : '<p>Her finner du publiserte saker når de er klare.</p>') +
    '</main></body></html>';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  });
  res.end(html);
}
