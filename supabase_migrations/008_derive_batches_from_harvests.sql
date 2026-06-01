-- Derive Olivia production batches from migrated harvest history.
--
-- The old Olivia source project had harvest_records but no batches rows.
-- RealtyFlow Data Health expects batches/recipes/tasks to live in the shared
-- olivia schema, so this idempotent data migration gives each harvest a stable
-- batch record without deleting or overwriting hand-created batches.

INSERT INTO olivia.batches (
  id,
  parcel_id,
  recipe_id,
  recipe_name,
  olive_type,
  harvest_date,
  weight,
  quality,
  status,
  yield_type,
  table_olive_yield_kg,
  traceability_code,
  current_stage,
  completed_stages,
  logs,
  metadata,
  created_at,
  updated_at
)
SELECT
  'harvest-batch-' || h.id,
  h.parcel_id,
  NULL,
  'Migrert fra innhøsting',
  h.variety,
  h.date,
  h.kg,
  'Standard',
  'ARCHIVED',
  CASE
    WHEN lower(coalesce(h.channel, '')) LIKE '%oil%'
      OR lower(coalesce(h.channel, '')) LIKE '%olje%'
    THEN 'Oil'
    ELSE 'Table'
  END,
  h.kg,
  'DA-' || regexp_replace(coalesce(h.season, 'season'), '[^a-zA-Z0-9]+', '-', 'g')
    || '-' || right(regexp_replace(h.id, '[^a-zA-Z0-9]+', '', 'g'), 6),
  'SALG',
  '["PLUKKING","LAKE","SKYLLING","MARINERING","LAGRING","PAKKING","SALG"]'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'stage', 'PLUKKING',
      'startDate', h.date,
      'notes', 'Migrert fra harvest_records'
    )
  ),
  jsonb_build_object(
    'source', 'harvest_records',
    'source_id', h.id,
    'channel', h.channel,
    'price_per_kg', h.price_per_kg,
    'notes', h.notes,
    'currency', h.currency
  ),
  h.created_at,
  now()
FROM olivia.harvest_records h
WHERE NOT EXISTS (
  SELECT 1
  FROM olivia.batches b
  WHERE b.id = 'harvest-batch-' || h.id
);

NOTIFY pgrst, 'reload schema';
