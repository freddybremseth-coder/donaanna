# B2B Operating Model

Recommended ownership:

- RealtyFlow owns marketing, publishing, Content Hub, AI marketing, documents,
  public campaigns, strategy and cross-channel notifications.
- Olivia owns farm operations, batches, recipes, harvests, products, B2B
  customers, quote/order drafts, invoices and operational fulfilment.
- Doña Anna public web owns the buyer-facing brand, product story, lead forms,
  B2B login and order entry.

The shared Supabase project remains the source of truth. Olivia writes B2B
events into `olivia.commerce_notifications`; RealtyFlow can read that outbox
and fan out alerts to dashboard, email, Slack/Teams or other channels.

This avoids duplicating publishing tools inside Olivia while keeping orders and
customer handling close to the farm/product data that makes Doña Anna valuable.
