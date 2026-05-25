import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Languages, LockKeyhole, Menu, X } from 'lucide-react';
import MarkdownArticle from './MarkdownArticle';
import { fetchPublishedPost, fetchPublishedPosts, PublicWebsitePost } from '../services/publicContent';

interface PublicContentPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
}

type DestinationConfig = {
  id: string;
  label: string;
  path: string;
  eyebrow: string;
  headline: string;
  intro: string;
};

const destinations: Record<string, DestinationConfig> = {
  magasin: {
    id: 'magasin',
    label: 'Magasin',
    path: '/magasin',
    eyebrow: 'Doña Anna Magasin',
    headline: 'Smak, jord, helse og middelhavskjøkken.',
    intro: 'Redaksjonelt innhold fra Doña Anna om ekstra virgin olivenolje, bordoliven, kvalitet og livet rundt lunden i Biar.',
  },
  artikler: {
    id: 'artikler',
    label: 'Artikler',
    path: '/artikler',
    eyebrow: 'Artikler',
    headline: 'Kunnskap som gjør det enklere å velge god olivenolje.',
    intro: 'Fagartikler, forklaringer og praktiske råd for kokker, innkjøpere og matinteresserte.',
  },
  blogg: {
    id: 'blogg',
    label: 'Blogg',
    path: '/blogg',
    eyebrow: 'Blogg',
    headline: 'Notater fra gården, kjøkkenet og markedet.',
    intro: 'Kortere historier, oppdateringer og refleksjoner fra Doña Anna.',
  },
  oppskrifter: {
    id: 'oppskrifter',
    label: 'Oppskrifter',
    path: '/oppskrifter',
    eyebrow: 'Oppskrifter',
    headline: 'Retter der god olivenolje får gjøre jobben.',
    intro: 'Serveringsideer, smakskombinasjoner og enkle oppskrifter med Doña Anna.',
  },
};

export function isPublicContentPath(pathname: string) {
  const first = pathname.split('/').filter(Boolean)[0];
  return Boolean(first && destinations[first]);
}

function resolveRoute() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const key = parts[0] || 'magasin';
  return {
    destination: destinations[key] || destinations.magasin,
    slug: parts[1] || '',
  };
}

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

const PublicContentPage: React.FC<PublicContentPageProps> = ({ onLogin, onAdminLogin }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [route, setRoute] = useState(resolveRoute);
  const [posts, setPosts] = useState<PublicWebsitePost[]>([]);
  const [post, setPost] = useState<PublicWebsitePost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshRoute = () => setRoute(resolveRoute());
    window.addEventListener('popstate', refreshRoute);
    return () => window.removeEventListener('popstate', refreshRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPost(null);
    setPosts([]);

    const run = route.slug
      ? fetchPublishedPost(route.destination.id, route.slug).then(found => {
          if (!cancelled) setPost(found);
        })
      : fetchPublishedPosts(route.destination.id).then(found => {
          if (!cancelled) setPosts(found);
        });

    run.finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [route.destination.id, route.slug]);

  const latestImage = useMemo(() => (
    post?.image_url || posts.find(item => item.image_url)?.image_url || '/donaanna/product-design/verde-vivo-estate-arches.jpg'
  ), [post, posts]);

  const navLinks = Object.values(destinations);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f1df] selection:bg-[#d4af37]/30">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0d0d0d]/86 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/labels/luxury/dona-anna-monogram-da.svg" alt="Doña Anna DA monogram" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-serif text-sm font-semibold leading-none tracking-[0.38em]">DOÑA ANNA</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37]">Biar · Alicante</p>
            </div>
          </a>
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map(item => (
              <a key={item.id} href={item.path} className="text-xs uppercase tracking-[0.2em] text-white/62 transition hover:text-white">
                {item.label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-xs uppercase tracking-[0.18em] text-white/70">
              <Languages size={15} /> NO
            </button>
            <button onClick={onAdminLogin} className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/8">
              <LockKeyhole size={15} /> Admin
            </button>
            <button onClick={onLogin} className="inline-flex h-10 items-center gap-2 bg-white px-4 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#d4af37]">
              B2B portal
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Meny">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="mx-auto max-w-7xl border-t border-white/10 py-4 md:hidden">
            {navLinks.map(item => (
              <a key={item.id} href={item.path} onClick={() => setMenuOpen(false)} className="block py-3 text-sm uppercase tracking-[0.2em] text-white/78">
                {item.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      <header className="relative min-h-[72vh] overflow-hidden">
        <img src={latestImage} alt={route.destination.label} className="absolute inset-0 h-full w-full object-cover opacity-42" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,13,13,.98),rgba(13,13,13,.72),rgba(13,13,13,.38))]" />
        <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-5 pb-12 pt-28 md:px-8">
          <a href="/" className="mb-8 inline-flex w-fit items-center gap-2 border border-white/14 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/8">
            <ArrowLeft size={15} /> Til forsiden
          </a>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">{route.destination.eyebrow}</p>
          <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-normal md:text-7xl">
            {post ? post.title : route.destination.headline}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72 md:text-xl">
            {post ? post.summary || route.destination.intro : route.destination.intro}
          </p>
        </div>
      </header>

      <main>
        {loading && (
          <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            <p className="text-white/58">Laster innhold...</p>
          </section>
        )}

        {!loading && route.slug && !post && (
          <section className="mx-auto max-w-3xl px-5 py-24 text-center md:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d4af37]">Ikke funnet</p>
            <h2 className="mt-4 font-serif text-4xl">Denne saken er ikke publisert.</h2>
            <a href={route.destination.path} className="mt-8 inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
              Se {route.destination.label.toLowerCase()} <ArrowRight size={17} />
            </a>
          </section>
        )}

        {!loading && post && (
          <article className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[0.72fr_0.28fr]">
            <div>
              {post.image_url && (
                <img src={post.image_url} alt={post.title} className="mb-10 aspect-[16/9] w-full object-cover" />
              )}
              <MarkdownArticle markdown={post.markdown} />
            </div>
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border border-white/10 bg-white/[0.035] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{post.destination_label}</p>
                {post.published_at && (
                  <p className="mt-4 flex items-center gap-2 text-sm text-white/58">
                    <Calendar size={15} /> {formatDate(post.published_at)}
                  </p>
                )}
                {post.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {post.tags.slice(0, 8).map(tag => (
                      <span key={tag} className="border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/54">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </article>
        )}

        {!loading && !route.slug && (
          <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
            {posts.length === 0 ? (
              <div className="border border-white/10 bg-white/[0.035] p-8">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d4af37]">Kommer snart</p>
                <h2 className="mt-4 font-serif text-4xl">Første sak publiseres fra RealtyFlow.</h2>
                <p className="mt-4 max-w-2xl leading-7 text-white/62">
                  Denne siden er koblet til Doña Anna sitt CMS. Når en artikkel godkjennes i RealtyFlow, dukker den opp her.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {posts.map(item => (
                  <a key={item.id} href={`${route.destination.path}/${item.slug}`} className="group overflow-hidden border border-white/10 bg-white/[0.035] transition hover:border-[#d4af37]/50">
                    <div className="h-56 overflow-hidden bg-black">
                      <img
                        src={item.image_url || '/donaanna/product-design/verde-vivo-estate-arches.jpg'}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{formatDate(item.published_at)}</p>
                      <h2 className="mt-3 font-serif text-3xl leading-tight">{item.title}</h2>
                      <p className="mt-4 line-clamp-3 leading-7 text-white/62">{item.summary || item.markdown.slice(0, 180)}</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                        Les saken <ArrowRight size={15} />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default PublicContentPage;
