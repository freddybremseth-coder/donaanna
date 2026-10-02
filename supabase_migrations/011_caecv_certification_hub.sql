-- CAECV certification hub for Olivia OS
-- Generic schema only. Case-specific personal data is seeded privately in Supabase,
-- not committed to the public repository.

create table if not exists olivia.caecv_cases (
  id text primary key,
  operator_name text not null,
  operator_nif text,
  representative_name text,
  representative_nif text,
  authority text not null default 'CAECV',
  application_type text,
  certification_scope text,
  status text not null default 'draft',
  current_step text,
  regepa_code text,
  prepared_at date,
  signed_at date,
  submitted_at date,
  submission_method text,
  tracking_number text,
  inspection_at date,
  certified_at date,
  certificate_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.caecv_parcels (
  id text primary key,
  case_id text not null references olivia.caecv_cases(id) on delete cascade,
  parcel_id text not null references olivia.parcels(id) on delete cascade,
  polygon text not null,
  parcel_number text not null,
  recinto text,
  sigpac_area_ha numeric,
  sigpac_use text,
  previous_certified boolean not null default false,
  transfer_code text,
  certification_status text not null default 'prepared',
  drift_risk text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_id, parcel_id)
);

create index if not exists caecv_parcels_case_idx on olivia.caecv_parcels(case_id);
create index if not exists caecv_parcels_parcel_idx on olivia.caecv_parcels(parcel_id);

alter table olivia.caecv_cases enable row level security;
alter table olivia.caecv_parcels enable row level security;

drop policy if exists olivia_internal_all_caecv_cases on olivia.caecv_cases;
create policy olivia_internal_all_caecv_cases
on olivia.caecv_cases
for all to authenticated
using (olivia_private.is_internal_user())
with check (olivia_private.is_internal_user());

drop policy if exists olivia_internal_all_caecv_parcels on olivia.caecv_parcels;
create policy olivia_internal_all_caecv_parcels
on olivia.caecv_parcels
for all to authenticated
using (olivia_private.is_internal_user())
with check (olivia_private.is_internal_user());

grant select, insert, update, delete on olivia.caecv_cases to authenticated, service_role;
grant select, insert, update, delete on olivia.caecv_parcels to authenticated, service_role;

drop trigger if exists caecv_cases_set_updated_at on olivia.caecv_cases;
create trigger caecv_cases_set_updated_at before update on olivia.caecv_cases
for each row execute function olivia.set_updated_at();

drop trigger if exists caecv_parcels_set_updated_at on olivia.caecv_parcels;
create trigger caecv_parcels_set_updated_at before update on olivia.caecv_parcels
for each row execute function olivia.set_updated_at();

notify pgrst, 'reload schema';
