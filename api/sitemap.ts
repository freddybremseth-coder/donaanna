import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://www.donaanna.com';

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, char => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[char] || char));
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const staticPaths = ['/', '/magasin', '/artikler', '/blogg', '/oppskrifter'];
  const rows: Array<{ destination_id?: string; destination_path?: string; slug?: string; published_at?: string; updated_at?: string; created_at?: string }> = [];

  const supabase = getSupabase();
  if (supabase) {
    const result = await supabase
      .from('website_posts')
      .select('destination_id,destination_path,slug,published_at,updated_at,created_at')
      .eq('brand_id', 'donaanna')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(1000);
    if (!result.error && result.data) rows.push(...result.data);
  }

  const urls = [
    ...staticPaths.map(path => ({ loc: `${BASE}${path}`, lastmod: '' })),
    ...rows
      .filter(row => row.slug)
      .map(row => ({
        loc: `${BASE}${String(row.destination_path || '/' + (row.destination_id || 'magasin')).replace(/\/$/, '')}/${row.slug}`,
        lastmod: row.updated_at || row.published_at || row.created_at || '',
      })),
  ];

  const seen = new Set<string>();
  const body = urls
    .filter(item => item.loc && !seen.has(item.loc) && seen.add(item.loc))
    .map(item => [
      '  <url>',
      `    <loc>${escapeXml(item.loc)}</loc>`,
      item.lastmod ? `    <lastmod>${new Date(item.lastmod).toISOString()}</lastmod>` : '',
      '  </url>',
    ].filter(Boolean).join('\n'))
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' });
  res.end(xml);
}
