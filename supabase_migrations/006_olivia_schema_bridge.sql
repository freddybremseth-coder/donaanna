-- Doña Anna / Olivia schema bridge for the shared RealtyFlow Supabase project.
-- Run on project ereapsfcsqtdmzosgnnn.
--
-- The first Olivia tables created in the shared project used UUID ids and a
-- reduced column set. The Olivia app writes stable text ids such as p1,
-- B<timestamp> and task-<timestamp>, so the shared olivia schema must match
-- the app schema before localStorage import, B2B orders and Data Health can be
-- trusted.

CREATE SCHEMA IF NOT EXISTS olivia;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE IF NOT EXISTS _olivia_farm_settings_backup (
  farm_name text,
  currency text
) ON COMMIT DROP;

DO $$
DECLARE
  uses_uuid_core boolean := false;
  uses_uuid_app_tables boolean := false;
  non_settings_rows bigint := 0;
  row_count bigint := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'olivia'
      AND table_name IN ('parcels', 'harvest_records', 'farm_expenses', 'subsidy_income', 'farm_settings')
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) INTO uses_uuid_core;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'olivia'
      AND table_name IN ('batches', 'recipes', 'tasks', 'pruning_history', 'commerce_products', 'commerce_customers', 'commerce_orders', 'commerce_order_items', 'commerce_invoices')
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) INTO uses_uuid_app_tables;

  IF uses_uuid_core OR uses_uuid_app_tables THEN
    IF to_regclass('olivia.parcels') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.parcels' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.harvest_records') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.harvest_records' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.farm_expenses') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.farm_expenses' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.subsidy_income') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.subsidy_income' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.batches') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.batches' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.recipes') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.recipes' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.tasks') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.tasks' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.pruning_history') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.pruning_history' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.commerce_products') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.commerce_products' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.commerce_customers') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.commerce_customers' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.commerce_orders') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.commerce_orders' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.commerce_order_items') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.commerce_order_items' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;
    IF to_regclass('olivia.commerce_invoices') IS NOT NULL THEN
      EXECUTE 'select count(*) from olivia.commerce_invoices' INTO row_count;
      non_settings_rows := non_settings_rows + row_count;
    END IF;

    IF non_settings_rows > 0 THEN
      RAISE EXCEPTION 'Refusing to replace olivia UUID core tables because % existing rows would need a mapped migration first.', non_settings_rows;
    END IF;

    IF to_regclass('olivia.farm_settings') IS NOT NULL THEN
      INSERT INTO _olivia_farm_settings_backup (farm_name, currency)
      SELECT farm_name, currency
      FROM olivia.farm_settings
      LIMIT 1;
    END IF;

    DROP TABLE IF EXISTS olivia.harvest_records CASCADE;
    DROP TABLE IF EXISTS olivia.farm_expenses CASCADE;
    DROP TABLE IF EXISTS olivia.subsidy_income CASCADE;
    DROP TABLE IF EXISTS olivia.parcels CASCADE;
    DROP TABLE IF EXISTS olivia.farm_settings CASCADE;
    DROP TABLE IF EXISTS olivia.commerce_order_items CASCADE;
    DROP TABLE IF EXISTS olivia.commerce_invoices CASCADE;
    DROP TABLE IF EXISTS olivia.commerce_orders CASCADE;
    DROP TABLE IF EXISTS olivia.commerce_customers CASCADE;
    DROP TABLE IF EXISTS olivia.commerce_products CASCADE;
    DROP TABLE IF EXISTS olivia.commerce_content_templates CASCADE;
    DROP TABLE IF EXISTS olivia.pruning_history CASCADE;
    DROP TABLE IF EXISTS olivia.tasks CASCADE;
    DROP TABLE IF EXISTS olivia.recipes CASCADE;
    DROP TABLE IF EXISTS olivia.batches CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS olivia.parcels (
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
  coordinates       text,
  boundaries        text,
  document_ids      text,
  registry_details  text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.harvest_records (
  id            text primary key,
  parcel_id     text references olivia.parcels(id) on delete cascade,
  season        text not null,
  date          text not null,
  variety       text not null,
  kg            numeric not null default 0,
  channel       text not null,
  price_per_kg  numeric not null default 0,
  notes         text,
  currency      text not null default 'EUR',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.farm_expenses (
  id          text primary key,
  date        text not null,
  season      text not null,
  category    text not null,
  description text not null,
  amount      numeric not null default 0,
  scope       text not null default 'farm',
  parcel_id   text references olivia.parcels(id) on delete set null,
  currency    text not null default 'EUR',
  vendor      text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.subsidy_income (
  id          text primary key,
  date        text not null,
  season      text not null,
  type        text not null,
  amount      numeric not null default 0,
  description text not null,
  category    text,
  currency    text not null default 'EUR',
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.farm_settings (
  id           text primary key default 'default',
  farm_name    text not null default 'Doña Anna',
  farm_address text not null default '',
  farm_lat     text not null default '',
  farm_lon     text not null default '',
  language     text not null default 'no',
  currency     text not null default 'EUR',
  updated_at   timestamptz default now()
);

INSERT INTO olivia.farm_settings (id, farm_name, currency)
SELECT 'default', coalesce(farm_name, 'Doña Anna'), coalesce(currency, 'EUR')
FROM _olivia_farm_settings_backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO olivia.farm_settings (id, farm_name, currency)
VALUES ('default', 'Doña Anna', 'EUR')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS olivia.batches (
  id                    text primary key,
  parcel_id             text references olivia.parcels(id) on delete set null,
  recipe_id             text,
  recipe_name           text,
  recipe_snapshot       jsonb,
  olive_type            text,
  harvest_date          text not null,
  weight                numeric not null default 0,
  quality               text not null default 'Standard',
  quality_score         numeric,
  status                text not null default 'ACTIVE',
  labor_hours           numeric,
  labor_cost            numeric,
  yield_type            text not null default 'Table',
  oil_yield_liters      numeric,
  table_olive_yield_kg  numeric,
  traceability_code     text,
  current_stage         text,
  stage_start_date      text,
  completed_stages      jsonb,
  sales                 jsonb,
  logs                  jsonb,
  quality_metrics       jsonb,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.recipes (
  id                       text primary key,
  name                     text not null,
  flavor_profile           text,
  description              text,
  recommended_olive_types  jsonb,
  ingredients              jsonb not null default '[]'::jsonb,
  brine_change_days        jsonb,
  marinade_day_from        integer,
  ready_after_days         integer,
  rating                   numeric default 4,
  notes                    text default '',
  is_ai_generated          boolean default false,
  is_quality_assured       boolean default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.tasks (
  id          text primary key,
  title       text not null,
  priority    text not null default 'Middels',
  category    text not null default 'Vedlikehold',
  user_name   text default '',
  status      text not null default 'TODO',
  parcel_id   text references olivia.parcels(id) on delete set null,
  due_date    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.pruning_history (
  id              text primary key,
  date            text not null,
  images          jsonb not null default '[]'::jsonb,
  tree_type       text,
  age_estimate    text,
  analysis        jsonb,
  plan            jsonb,
  scheduled_time  text,
  parcel_id       text references olivia.parcels(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_products (
  id                 text primary key,
  sku                text unique not null,
  name               text not null,
  description        text default '',
  category           text default 'EVOO',
  olive_variety      text,
  size               text,
  channel            text default 'retail',
  harvest_year       integer,
  batch_id           text references olivia.batches(id) on delete set null,
  price_retail       numeric not null default 0,
  price_b2b          numeric,
  cost               numeric,
  stock              integer not null default 0,
  stock_quantity     numeric not null default 0,
  unit               text not null default 'unit',
  unit_price         numeric not null default 0,
  vat_rate           numeric not null default 0,
  polyphenol_content numeric,
  acidity            numeric,
  image_url          text,
  status             text not null default 'draft',
  active             boolean not null default true,
  public_story       text default '',
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_customers (
  id               text primary key,
  profile_id       uuid,
  name             text not null default '',
  company          text,
  contact_name     text not null default '',
  email            text not null default '',
  phone            text,
  customer_type    text not null default 'retail',
  price_tier       text not null default 'retail',
  payment_terms    text default 'card',
  billing_address  text,
  shipping_address text,
  tax_id           text,
  vat_number       text,
  status           text not null default 'lead',
  notes            text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_orders (
  id               text primary key,
  order_number     text unique not null,
  customer_id      text references olivia.commerce_customers(id) on delete set null,
  customer_name    text default '',
  order_type       text not null default 'order',
  status           text not null default 'draft',
  payment_status   text not null default 'pending',
  subtotal         numeric not null default 0,
  tax_amount       numeric not null default 0,
  shipping_cost    numeric not null default 0,
  discount_amount  numeric not null default 0,
  total_amount     numeric not null default 0,
  currency         text not null default 'EUR',
  shipping_address text,
  billing_address  text,
  notes            text,
  due_date         date,
  ordered_at       timestamptz default now(),
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_order_items (
  id           text primary key,
  order_id     text not null references olivia.commerce_orders(id) on delete cascade,
  product_id   text references olivia.commerce_products(id) on delete set null,
  batch_id     text references olivia.batches(id) on delete set null,
  name         text not null,
  product_name text default '',
  sku          text,
  quantity     numeric not null default 1,
  unit         text not null default 'unit',
  unit_price   numeric not null default 0,
  tax_rate     numeric not null default 0,
  total_price  numeric not null default 0,
  line_total   numeric not null default 0,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_invoices (
  id             text primary key,
  invoice_number text unique not null,
  order_id       text references olivia.commerce_orders(id) on delete set null,
  customer_id    text references olivia.commerce_customers(id) on delete set null,
  customer_name  text default '',
  status         text not null default 'draft',
  payment_status text not null default 'unpaid',
  amount         numeric not null default 0,
  tax_amount     numeric not null default 0,
  total_amount   numeric not null default 0,
  invoice_total  numeric not null default 0,
  currency       text not null default 'EUR',
  issue_date     date default current_date,
  due_date       text,
  paid_date      text,
  payment_method text,
  reference      text,
  pdf_url        text,
  notes          text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_content_templates (
  id            text primary key,
  name          text not null,
  template_type text not null,
  subject       text,
  body          text not null default '',
  locale        text not null default 'no',
  channel       text not null default 'email',
  status        text not null default 'draft',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

CREATE INDEX IF NOT EXISTS olivia_batches_parcel_idx ON olivia.batches(parcel_id);
CREATE INDEX IF NOT EXISTS olivia_batches_status_idx ON olivia.batches(status);
CREATE INDEX IF NOT EXISTS olivia_tasks_status_idx ON olivia.tasks(status);
CREATE INDEX IF NOT EXISTS olivia_pruning_history_parcel_idx ON olivia.pruning_history(parcel_id);
CREATE INDEX IF NOT EXISTS olivia_commerce_orders_status_idx ON olivia.commerce_orders(status);
CREATE INDEX IF NOT EXISTS olivia_commerce_orders_customer_idx ON olivia.commerce_orders(customer_id);
CREATE INDEX IF NOT EXISTS olivia_commerce_invoices_payment_status_idx ON olivia.commerce_invoices(payment_status);
CREATE INDEX IF NOT EXISTS olivia_commerce_products_active_idx ON olivia.commerce_products(active);

CREATE OR REPLACE FUNCTION olivia.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'parcels', 'harvest_records', 'farm_expenses', 'subsidy_income', 'farm_settings',
    'batches', 'recipes', 'tasks', 'pruning_history',
    'commerce_products', 'commerce_customers', 'commerce_orders', 'commerce_invoices',
    'commerce_content_templates'
  ]
  LOOP
    EXECUTE format('ALTER TABLE olivia.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON olivia.%I', 'olivia_app_all_' || table_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON olivia.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      'olivia_app_all_' || table_name,
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE olivia.commerce_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS olivia_app_all_commerce_order_items ON olivia.commerce_order_items;
CREATE POLICY olivia_app_all_commerce_order_items
ON olivia.commerce_order_items
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'parcels', 'harvest_records', 'farm_expenses', 'subsidy_income', 'farm_settings',
    'batches', 'recipes', 'tasks', 'pruning_history',
    'commerce_products', 'commerce_customers', 'commerce_orders', 'commerce_invoices',
    'commerce_content_templates'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON olivia.%I', table_name || '_set_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON olivia.%I FOR EACH ROW EXECUTE FUNCTION olivia.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA olivia TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA olivia TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA olivia TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA olivia GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
