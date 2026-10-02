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
  let unordered: string[] = [];
  let ordered: string[] = [];
  let firstHeading = true;

  function flushLists() {
    if (unordered.length) {
      output.push('<ul>' + unordered.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>');
      unordered = [];
    }
    if (ordered.length) {
      output.push('<ol>' + ordered.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ol>');
      ordered = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushLists(); continue; }

    if (/^[-*]\s+/.test(line)) {
      if (ordered.length) flushLists();
      unordered.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      if (unordered.length) flushLists();
      ordered.push(line.replace(/^\d+[.)]\s+/, ''));
      continue;
    }

    flushLists();
    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) {
      const level = heading[1].length;
      if (firstHeading && level === 1) { firstHeading = false; continue; }
      firstHeading = false;
      const htmlLevel = Math.min(4, Math.max(2, level));
      output.push('<h' + htmlLevel + '>' + escapeHtml(heading[2]) + '</h' + htmlLevel + '>');
    } else {
      firstHeading = false;
      output.push('<p>' + escapeHtml(line) + '</p>');
    }
  }

  flushLists();
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
    '@graph': [
      {
        '@type': 'Article',
        '@id': canonical + '#article',
        headline: title,
        description: summary,
        url: canonical,
        mainEntityOfPage: canonical,
        image: image || undefined,
        datePublished: data.published_at || undefined,
        dateModified: data.updated_at || data.published_at || undefined,
        author: { '@id': 'https://www.freddybremseth.com/#person' },
        publisher: { '@id': SITE + '/#organization' },
        isPartOf: { '@id': SITE + '/#website' },
      },
      {
        '@type': 'Person',
        '@id': 'https://www.freddybremseth.com/#person',
        name: 'Freddy Bremseth',
        url: 'https://www.freddybremseth.com/',
      },
      {
        '@type': 'Organization',
        '@id': SITE + '/#organization',
        name: 'Doña Anna',
        url: SITE + '/',
        founder: { '@id': 'https://www.freddybremseth.com/#person' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Doña Anna', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: destination, item: SITE + '/' + destination },
          { '@type': 'ListItem', position: 3, name: title, item: canonical },
        ],
      },
    ],
  };

  const css = 'body{background:#0d0d0d;color:#f7f1df;margin:0;font-family:Arial,sans-serif;line-height:1.75}' +
    'header{border-bottom:1px solid #39342d;padding:20px 5%}a{color:#d4af37}' +
    'main{max-width:900px;margin:0 auto;padding:45px 22px 100px}h1,h2{font-family:Georgia,serif;line-height:1.2}' +
    'h1{font-size:clamp(2.2rem,6vw,4.4rem)}h2{font-size:2rem;margin-top:2.3rem}' +
    'p,li{font-size:1.1rem}.summary{color:#d8cab0;font-size:1.25rem}.byline{color:#a99980;font-size:.95rem;margin:10px 0 26px}' +
    '.byline a{color:#d4af37}.author-card{border:1px solid #39342d;background:#17130d;padding:22px;margin:42px 0}' +
    '.network{border-top:1px solid #39342d;padding:28px 5%;color:#8f8372;font-size:.82rem}.network strong{display:block;color:#d4af37;margin-bottom:10px;letter-spacing:.12em;text-transform:uppercase}' +
    '.network a{margin-right:16px;white-space:nowrap}img{max-width:100%;height:auto;margin:22px 0}nav a{margin-right:20px}';
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(title) + ' | Doña Anna · Freddy Bremseth</title>' +
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
    '<p class="byline">Av <a href="https://www.freddybremseth.com/">Freddy Bremseth</a> · Doña Anna' +
    (data.updated_at || data.published_at ? ' · Oppdatert ' + escapeHtml(new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Oslo'}).format(new Date(data.updated_at || data.published_at))) : '') + '</p>' +
    (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '">' : '') +
    articleMarkup(String(data.markdown || '')) +
    '<aside class="author-card"><strong>Om forfatteren</strong><p>Freddy Bremseth utvikler Doña Anna i Biar, Alicante, og skriver om olivenolje, gårdsliv, produktutvikling og prosjektene sine i Spania. <a href="https://www.freddybremseth.com/olivenolje-og-dona-anna.html">Les mer om Freddy Bremseth og Doña Anna</a>.</p></aside>' +
    '</article><p><a href="/' + destination + '">← Tilbake</a></p></main>' +
    '<footer class="network"><strong>Freddy Bremseth network</strong>' +
    '<a href="https://www.freddybremseth.com/">FreddyBremseth.com</a>' +
    '<a href="https://www.zenecohomes.com/">Zen Eco Homes</a>' +
    '<a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a>' +
    '<a href="https://www.chatgenius.pro/">ChatGenius</a>' +
    '<a href="https://books.freddybremseth.com/">Books</a>' +
    '<a href="https://art.freddybremseth.com/">Art</a>' +
    '<a href="https://remaster.freddybremseth.com/">Re-Master Freddy</a></footer></body></html>';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  });
  res.end(html);
}