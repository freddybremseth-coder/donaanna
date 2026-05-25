-- Doña Anna – Website CMS posts published from RealtyFlow.
-- Run in Supabase SQL Editor after the base schema/migrations.

create table if not exists website_posts (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'realtyflow',
  source_type text not null default 'content',
  source_id text,
  brand_id text not null default 'donaanna',
  destination_id text not null default 'artikler',
  destination_label text not null default 'Artikler',
  destination_path text not null default '/artikler',
  content_type text not null default 'article',
  title text not null,
  slug text not null,
  summary text default '',
  markdown text not null,
  image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, destination_id, slug),
  unique (source_system, source_type, source_id)
);

create index if not exists idx_website_posts_destination_status
  on website_posts(destination_id, status, published_at desc);

create index if not exists idx_website_posts_tags
  on website_posts using gin(tags);

alter table website_posts enable row level security;

drop policy if exists "public read published website posts" on website_posts;
drop policy if exists "service role manages website posts" on website_posts;

create policy "public read published website posts"
  on website_posts
  for select
  to anon, authenticated
  using (status = 'published');

create policy "service role manages website posts"
  on website_posts
  for all
  to service_role
  using (true)
  with check (true);

grant select on table public.website_posts to anon, authenticated;
grant select, insert, update, delete on table public.website_posts to service_role;
