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

The shared target project `ereapsfcsqtdmzosgnnn` already has the mapped
`olivia` tables, but the key Olivia tables are still empty except for one
default `olivia.farm_settings` row. It does not currently have a
`commerce-product-images` Storage bucket.

The separate Supabase project named `Dona Anna` (`dlssxpiysmrbbqzvpjzb`) still
reported as paused from Supabase CLI on 2026-06-01. It must finish restoring in
the Supabase dashboard before its tables/data can be inspected or copied.

## Copy Options

Copy from `jvcdkclfcaccogmvvkrs.public` to
`ereapsfcsqtdmzosgnnn.olivia` for the app-owned farm and commerce tables.
Most tables can be copied directly. `commerce_products` needs a mapped copy
because the old table has storefront fields such as `collections`,
`price_label`, `label_material`, `accent_color` and `is_public`; preserve those
fields in `metadata` and map public/active state carefully.

Copy the `commerce-product-images` Storage bucket and its 4 objects to the
target project before relying on product cards in the B2B UI.

`website_posts` should be copied to the target `public.website_posts` only if
those posts belong in RealtyFlow/Content Hub. `user_profiles` should be handled
carefully because the target already has profile tables in more than one
schema. Do not blindly overwrite auth/profile rows.

If additional records are still missing after this project copy, then check the
separate Supabase project named `Dona Anna` (`dlssxpiysmrbbqzvpjzb`) or the old
browser localStorage import path.
