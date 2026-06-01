import { isSupabaseConfigured, supabaseOlivia } from './supabaseClient';

export type CommerceRow = Record<string, string | number>;

export interface CommerceQuoteInput {
  company: string;
  contactName: string;
  email: string;
  packageName: string;
  quantity: number;
  amount: number;
  notes: string;
}

export interface CommerceQuoteResult {
  orderRow: CommerceRow;
  customerRow: CommerceRow;
  notificationSaved: boolean;
}

const moneyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function text(value: unknown): string {
  return String(value || '').trim();
}

function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
}

function orderNumber(): string {
  const now = new Date();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DA-${now.getFullYear()}-${random}`;
}

function formatAmount(value: number): string {
  return value > 0 ? moneyFormatter.format(value) : 'B2B quote';
}

function orderToRow(row: any): CommerceRow {
  return {
    no: text(row.order_number) || text(row.id),
    customer: text(row.customer_name) || 'B2B kunde',
    items: text(row.notes) || text(row.metadata?.packageName) || 'Tilbud',
    amount: formatAmount(Number(row.total_amount || 0)),
    status: text(row.status) || 'Tilbud',
    next: 'Følg opp kunde',
  };
}

function customerToRow(row: any): CommerceRow {
  return {
    company: text(row.company) || text(row.name) || 'B2B kunde',
    contact: text(row.contact_name) || text(row.name) || 'Kontakt',
    type: text(row.customer_type) || 'B2B',
    terms: text(row.payment_terms) || 'Avtales',
    status: text(row.status) || 'lead',
  };
}

export async function fetchCommerceRows(): Promise<{ orders: CommerceRow[]; customers: CommerceRow[] }> {
  if (!isSupabaseConfigured) return { orders: [], customers: [] };

  const [orders, customers] = await Promise.all([
    supabaseOlivia
      .from('commerce_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseOlivia
      .from('commerce_customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  if (orders.error) console.warn('[commerce] fetch orders', orders.error);
  if (customers.error) console.warn('[commerce] fetch customers', customers.error);

  return {
    orders: (orders.data || []).map(orderToRow),
    customers: (customers.data || []).map(customerToRow),
  };
}

export async function createCommerceQuote(input: CommerceQuoteInput): Promise<CommerceQuoteResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase er ikke konfigurert for Olivia.');
  }

  const email = text(input.email).toLowerCase();
  const company = text(input.company);
  const contactName = text(input.contactName);
  const packageName = text(input.packageName) || 'B2B tilbud';
  const quantity = Number(input.quantity || 1);
  const amount = Number(input.amount || 0);
  const notes = text(input.notes);

  if (!company || !contactName || !email) {
    throw new Error('Firma, kontaktperson og e-post må fylles ut.');
  }

  const existing = await supabaseOlivia
    .from('commerce_customers')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (existing.error) throw existing.error;

  const existingCustomer = existing.data?.[0];
  const customerId = text(existingCustomer?.id) || makeId('cust');
  const customerPayload = {
    id: customerId,
    name: contactName,
    company,
    contact_name: contactName,
    email,
    customer_type: 'b2b',
    price_tier: 'b2b',
    payment_terms: 'Avtales',
    status: existingCustomer?.status || 'lead',
    notes: notes || existingCustomer?.notes || null,
    metadata: {
      source: 'olivia-commerce',
      lastPackage: packageName,
    },
  };

  const customerWrite = await supabaseOlivia
    .from('commerce_customers')
    .upsert(customerPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (customerWrite.error) throw customerWrite.error;

  const orderPayload = {
    id: makeId('order'),
    order_number: orderNumber(),
    customer_id: customerId,
    customer_name: company,
    order_type: 'quote',
    status: 'Tilbud',
    payment_status: 'pending',
    subtotal: amount,
    total_amount: amount,
    currency: 'EUR',
    notes: `${quantity} x ${packageName}${notes ? ` · ${notes}` : ''}`,
    metadata: {
      source: 'olivia-commerce',
      packageName,
      quantity,
      notificationTargets: ['realtyflow', 'email', 'dashboard'],
    },
  };

  const orderWrite = await supabaseOlivia
    .from('commerce_orders')
    .insert(orderPayload)
    .select('*')
    .single();

  if (orderWrite.error) throw orderWrite.error;

  let notificationSaved = false;
  const notification = await supabaseOlivia
    .from('commerce_notifications')
    .insert({
      id: makeId('notify'),
      event_type: 'quote_created',
      title: `Nytt B2B-tilbud: ${company}`,
      body: `${packageName} · ${formatAmount(amount)} · ${email}`,
      severity: 'high',
      channel_targets: ['realtyflow', 'email', 'dashboard'],
      status: 'new',
      related_order_id: orderWrite.data.id,
      related_customer_id: customerId,
      payload: {
        company,
        contactName,
        email,
        packageName,
        quantity,
        amount,
      },
    });

  if (!notification.error) notificationSaved = true;
  else console.warn('[commerce] notification not saved', notification.error);

  return {
    orderRow: orderToRow(orderWrite.data),
    customerRow: customerToRow(customerWrite.data),
    notificationSaved,
  };
}
