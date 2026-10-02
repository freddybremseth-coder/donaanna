import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { console.error('SEO audit failed:', message); process.exitCode = 1; };

const index = read('index.html');
const landing = read('components/PublicB2BLandingPage.tsx');
const article = read('api/public-article.ts');
const listing = read('api/public-listing.ts');
const vercel = JSON.parse(read('vercel.json'));

const stablePerson = 'https://www.freddybremseth.com/#person';
const networkDomains = [
  'www.freddybremseth.com',
  'www.zenecohomes.com',
  'www.pinosoecolife.com',
  'www.chatgenius.pro',
  'books.freddybremseth.com',
  'art.freddybremseth.com',
  'remaster.freddybremseth.com',
];

if (!/<title>[^<]*Freddy Bremseth[^<]*<\/title>/.test(index)) fail('Homepage title must connect Doña Anna to Freddy Bremseth.');
if (!index.includes(stablePerson)) fail('Homepage must use the stable Freddy Bremseth Person @id.');
if (!index.includes('"founder":{"@id":"https://www.freddybremseth.com/#person"}')) fail('Doña Anna entity must identify Freddy Bremseth as founder.');
if (!landing.includes('Hva er Doña Anna?')) fail('Homepage must retain the direct-answer AEO section.');
if (!landing.includes('id="people"')) fail('Homepage must retain the visible Freddy Bremseth section.');
if (!landing.includes('Freddy Bremseth network')) fail('Homepage must retain visible cross-brand navigation.');

for (const domain of networkDomains) {
  if (!landing.includes(domain)) fail('Homepage network missing ' + domain);
  if (!article.includes(domain)) fail('Article network missing ' + domain);
  if (!listing.includes(domain)) fail('Listing network missing ' + domain);
}

if (!article.includes(stablePerson) || !article.includes("author: { '@id': 'https://www.freddybremseth.com/#person' }")) {
  fail('Server-rendered articles must use Freddy Bremseth as the author entity.');
}
if (!article.includes("'@type': 'BreadcrumbList'")) fail('Articles must retain BreadcrumbList schema.');
if (!article.includes("const htmlLevel = Math.min(4, Math.max(2, level));")) fail('Article heading hierarchy must preserve H2/H3/H4 levels.');
if (!listing.includes("creator: { '@id': 'https://www.freddybremseth.com/#person' }")) fail('Listing pages must retain Freddy creator entity.');

const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
if (!rewrites.some((row) => row.source === '/magasin/:slug' && String(row.destination || '').includes('/api/public-article'))) {
  fail('Magazine article routes must stay server rendered.');
}
if (!rewrites.some((row) => row.source === '/sitemap.xml' && String(row.destination || '').includes('/api/sitemap'))) {
  fail('Sitemap must stay dynamic.');
}

if (!process.exitCode) console.log('Doña Anna SEO/AEO/GEO entity audit passed.');
