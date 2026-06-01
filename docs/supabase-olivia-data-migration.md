# Olivia / Doña Anna Supabase Migration Status

Status per 2026-06-01:

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

The old Olivia project `jvcdkclfcaccogmvvkrs` is reachable and does contain
Olivia application data in `public`. A direct `postgres` role check found these
non-empty rows:

- `recipes`: 50
- `harvest_records`: 7
- `parcels`: 7
- `tasks`: 5
- `commerce_products`: 5
- `website_posts`: 4
- `farm_expenses`: 3
- `commerce_orders`: 2
- `commerce_order_items`: 2
- `commerce_customers`: 1
- `user_profiles`: 1

It also has one Auth user and a public Storage bucket named
`commerce-product-images` with 4 objects. This is the source project to copy
from for Olivia farm, product, B2B order and recipe history.

Before the data copy, the shared target project `ereapsfcsqtdmzosgnnn` already
had the mapped `olivia` tables, but the key Olivia tables were empty except for
one default `olivia.farm_settings` row. It also did not have a
`commerce-product-images` Storage bucket.

The separate Supabase project named `Dona Anna` (`dlssxpiysmrbbqzvpjzb`) still
reported as paused from Supabase CLI on 2026-06-01. It must finish restoring in
the Supabase dashboard before its tables/data can be inspected or copied.

## Copy Completed

On 2026-06-01 the Olivia app data was copied from
`jvcdkclfcaccogmvvkrs.public` to `ereapsfcsqtdmzosgnnn.olivia` with upserts and
without deleting target rows:

- `parcels`: 7
- `recipes`: 50
- `harvest_records`: 7
- `farm_expenses`: 3
- `tasks`: 5
- `commerce_products`: 5
- `commerce_customers`: 1
- `commerce_orders`: 2
- `commerce_order_items`: 2
- `public.website_posts`: 4

The copy skipped the old Auth user and `public.user_profiles` row on purpose.
The target project already has its own user/profile model across `core`,
`family` and `public`, so those records should not be overwritten blindly.

The target Storage bucket `commerce-product-images` was created as public, and
the 4 source product images were copied with the same object paths. Product
image URLs in `olivia.commerce_products` now point at
`ereapsfcsqtdmzosgnnn.supabase.co`.

A REST/API smoke test with the app's anon key confirmed that the copied Olivia
tables are readable through the `olivia` schema and that a migrated product
image returns HTTP 200.

## Remaining Checks

Confirm in RealtyFlow/Content Hub that the 4 copied `public.website_posts`
belong there and are using the intended publication status.

`user_profiles` should still be handled carefully because the target already
has profile tables in more than one schema. Do not blindly overwrite
auth/profile rows.

If additional records are still missing after this project copy, then check the
separate Supabase project named `Dona Anna` (`dlssxpiysmrbbqzvpjzb`) or the old
browser localStorage import path.
