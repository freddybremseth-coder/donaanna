-- Olivia Farm OS – Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Parcels ──────────────────────────────────────────────────────────────────
create table if not exists parcels (
  id                text primary key,
  name              text not null,
  area              numeric not null default 0,
  municipality      text,
  cadastral_id      text,
  crop_type         text,
  crop              text,
  tree_variety      text,
  tree_count        integer,
  irrigation_status text,
  lat               numeric,
  lon               numeric,
  soil_type         text,
  registration_date text,
  coordinates       text,   -- JSON array of [lat,lon] pairs
  boundaries        text,   -- GeoJSON / raw polygon
  document_ids      text,   -- JSON array of doc ids
  registry_details  text,
  created_at        timestamptz default now()
);

-- ── Harvest records ───────────────────────────────────────────────────────────
create table if not exists harvest_records (
  id           text primary key,
  parcel_id    text references parcels(id) on delete cascade,
  season       text not null,
  date         text not null,
  variety      text not null,
  kg           numeric not null,
  channel      text not null,
  price_per_kg numeric not null,
  notes        text,
  created_at   timestamptz default now()
);

-- ── Farm expenses ─────────────────────────────────────────────────────────────
create table if not exists farm_expenses (
  id          text primary key,
  date        text not null,
  season      text not null,
  category    text not null,
  description text not null,
  amount      numeric not null,
  scope       text not null default 'farm',  -- 'farm' | 'parcel'
  parcel_id   text references parcels(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── Subsidy income ────────────────────────────────────────────────────────────
create table if not exists subsidy_income (
  id          text primary key,
  date        text not null,
  season      text not null,
  type        text not null,
  amount      numeric not null,
  description text not null,
  created_at  timestamptz default now()
);

-- ── Farm settings (single row) ────────────────────────────────────────────────
create table if not exists farm_settings (
  id           text primary key default 'default',
  farm_name    text not null default 'My Olive Grove',
  farm_address text not null default '',
  farm_lat     text not null default '',
  farm_lon     text not null default '',
  language     text not null default 'no',
  currency     text not null default 'EUR',
  updated_at   timestamptz default now()
);

-- Enable Row Level Security (allow all for anon key – tighten when auth is added)
alter table parcels         enable row level security;
alter table harvest_records enable row level security;
alter table farm_expenses   enable row level security;
alter table subsidy_income  enable row level security;
alter table farm_settings   enable row level security;

-- Permissive policies (open read/write for now)
create policy "allow all parcels"         on parcels         for all using (true) with check (true);
create policy "allow all harvest_records" on harvest_records for all using (true) with check (true);
create policy "allow all farm_expenses"   on farm_expenses   for all using (true) with check (true);
create policy "allow all subsidy_income"  on subsidy_income  for all using (true) with check (true);
create policy "allow all farm_settings"   on farm_settings   for all using (true) with check (true);

-- ── set_updated_at helper (used by user_profiles trigger below) ──────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ── User profiles (Supabase Auth backing) ────────────────────────────────────
-- Auto-populated by a trigger on auth.users insert. See
-- supabase_migrations/003_auth_profiles.sql for the canonical migration.

create table if not exists user_profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  name                text not null default '',
  role                text not null default 'farmer',
  subscription        text not null default 'trial',
  subscription_start  text not null default to_char(now(), 'YYYY-MM-DD'),
  avatar              text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists user_profiles_email_idx on user_profiles(email);

alter table user_profiles enable row level security;

create policy "self read" on user_profiles for select
  using (auth.uid() = id or exists (
    select 1 from user_profiles p where p.id = auth.uid() and p.role = 'super_admin'
  ));
create policy "self update" on user_profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "self insert" on user_profiles for insert
  with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, name, role, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'farmer'),
    coalesce(
      new.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' ||
        replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', '+') ||
        '&background=22c55e&color=000&size=256'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

drop trigger if exists user_profiles_set_updated_at on user_profiles;
create trigger user_profiles_set_updated_at before update on user_profiles
  for each row execute function set_updated_at();
