# Doña Anna / Olivia RLS audit

Dato: 2026-05-31

## Fasiten

Doña Anna / Olivia skal bruke Supabase project ref:

```txt
ereapsfcsqtdmzosgnnn
```

Olivia-tabeller skal ligge i:

```txt
olivia
```

Den gamle gratis-refen `jvcdkclfcaccogmvvkrs` er blokkert i klienten.

## Funn

1. `supabase_migrations/004_commerce_b2b.sql` oppretter RLS, men policyene er åpne:

```txt
allow all commerce_products
allow all commerce_customers
allow all commerce_orders
allow all commerce_order_items
allow all commerce_invoices
allow all commerce_content_templates
```

Alle bruker `using (true) with check (true)`. Dette er ikke trygt for B2B når
schemaet er eksponert via Supabase Data API.

2. `supabase_migrations/002_production_and_planning.sql` har tilsvarende åpne
policies for:

```txt
batches
recipes
tasks
pruning_history
```

3. `supabase_migrations/003_auth_profiles.sql` bruker `security definer` og
`raw_user_meta_data` for å bootstrappe profiler. Det er greit som displaydata,
men `raw_user_meta_data` må aldri brukes til autorisering eller RLS.

4. `supabase_migrations/005_website_cms_posts.sql` er nærmere riktig modell:
public kan lese publiserte poster, mens service role kan administrere.

## Anbefalt policy-modell

- `commerce_products`: anon/authenticated kan lese aktive/publiserte produkter.
  Kun admin/service role kan skrive.
- `commerce_customers`: B2B-bruker kan lese/oppdatere egen kundeprofil. Admin kan
  lese/skrive alt.
- `commerce_orders`, `commerce_order_items`, `commerce_invoices`: B2B-bruker kan
  lese egne ordre/fakturaer via koblet customer/profile. Admin kan lese/skrive alt.
- `batches`, `recipes`, `tasks`, `pruning_history`: authenticated farm/admin
  tilgang, ikke anon. Unngå permanent `allow all`.
- `farm_settings`: public read kan være ok hvis siden trenger gårdsnavn/adresse,
  men write må være admin/service role.

## Migreringsrekkefølge

1. Bekreft at `olivia` er med i Supabase Dashboard -> Project Settings -> API ->
   Exposed schemas.
2. Flytt/opprett tabellene i `olivia` schema, ikke `public`.
3. Enable RLS på alle tabeller i `olivia`.
4. Fjern alle `allow all ... using (true)` policies.
5. Legg inn rollebaserte policies for B2B/customer/admin.
6. Test med anon key, authenticated B2B-bruker og service role.

## Kontrollspørringer

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'olivia')
  and (
    tablename like 'commerce_%'
    or tablename in ('batches', 'recipes', 'tasks', 'pruning_history', 'farm_settings')
  )
order by schemaname, tablename, policyname;
```

```sql
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public', 'olivia')
order by n.nspname, c.relname;
```

## App-endringer

- `services/supabaseClient.ts` blokkerer nå gammel Supabase-ref.
- `services/db.ts` bruker `supabaseOlivia`, som peker til `olivia` schema.
- `.env.example` peker til riktig project-ref og har `VITE_OLIVIA_SUPABASE_SCHEMA=olivia`.
