# Olivia / Doña Anna Supabase Migration Status

Status per 2026-05-31:

- Shared target project: `ereapsfcsqtdmzosgnnn` (`RealtyflowPRO`)
- Target schema: `olivia`
- Old/free project mentioned by env history: `jvcdkclfcaccogmvvkrs`

## What Was Fixed

The shared project already had `olivia.farm_settings`, `olivia.parcels`,
`olivia.harvest_records`, `olivia.farm_expenses` and `olivia.subsidy_income`,
but those tables were created with UUID ids and a reduced RealtyFlow-style
column set.

The Doña Anna / Olivia app writes stable text ids such as `p1`, `B<timestamp>`
and `task-<timestamp>`. Migration `supabase_migrations/006_olivia_schema_bridge.sql`
converts the empty UUID foundation to the app-compatible text-id schema and
creates the missing tables:

- `batches`
- `recipes`
- `tasks`
- `pruning_history`
- `commerce_products`
- `commerce_customers`
- `commerce_orders`
- `commerce_order_items`
- `commerce_invoices`
- `commerce_content_templates`

The migration refuses to replace incompatible UUID tables if production rows
already exist, so any future project with real rows needs a mapped copy instead
of a blind table replacement.

## Old Data Check

The old project `jvcdkclfcaccogmvvkrs` was reachable through Supabase CLI, but
no Olivia/Doña Anna application tables were found in public schema.

The separate Supabase project named `Dona Anna` (`dlssxpiysmrbbqzvpjzb`) still
reported as paused from Supabase CLI on 2026-06-01. It must finish restoring in
the Supabase dashboard before its tables/data can be inspected or copied.

## Copy Options

If the missing recipes, batches, tasks or pruning history still exist in the
browser that used Olivia earlier, open the Doña Anna app from that same browser
profile after this schema fix. The app already runs a one-shot localStorage
upload for these keys:

- `olivia_batches`
- `olivia_recipes`
- `olivia_tasks`
- `olivia_pruning_history`

If the data is in an old Supabase project, unpause that project and export the
matching tables with Supabase CLI or SQL, then import into `ereapsfcsqtdmzosgnnn`
under schema `olivia`.
