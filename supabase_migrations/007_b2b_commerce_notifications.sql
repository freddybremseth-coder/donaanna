-- B2B commerce notification outbox.
-- Olivia writes here when quotes/orders arrive. RealtyFlow can poll/read this
-- table and fan out to dashboard, email, Slack/Teams or other channels.

CREATE SCHEMA IF NOT EXISTS olivia;

CREATE TABLE IF NOT EXISTS olivia.commerce_notifications (
  id                  text primary key,
  event_type          text not null,
  title               text not null,
  body                text not null default '',
  severity            text not null default 'info',
  channel_targets     jsonb not null default '["realtyflow","dashboard"]'::jsonb,
  status              text not null default 'new',
  related_order_id    text references olivia.commerce_orders(id) on delete set null,
  related_customer_id text references olivia.commerce_customers(id) on delete set null,
  payload             jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  read_at             timestamptz
);

CREATE INDEX IF NOT EXISTS olivia_commerce_notifications_status_idx
  ON olivia.commerce_notifications(status, created_at desc);
CREATE INDEX IF NOT EXISTS olivia_commerce_notifications_event_type_idx
  ON olivia.commerce_notifications(event_type, created_at desc);

ALTER TABLE olivia.commerce_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS olivia_app_all_commerce_notifications ON olivia.commerce_notifications;
CREATE POLICY olivia_app_all_commerce_notifications
ON olivia.commerce_notifications
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT USAGE ON SCHEMA olivia TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON olivia.commerce_notifications TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
