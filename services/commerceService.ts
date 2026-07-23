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

export interface CommerceAdminSummary {
  products: number;
  activeProducts: number;
  stockUnits: number;
  orders: number;
  openOrders: number;
  orderValue: number;
  customers: number;
  invoices: number;
  unpaidInvoices: number;
  recentOrders: CommerceRow[];
  recentCustomers: CommerceRow[];
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

export async function fetchCommerceAdminSummary(): Promise<CommerceAdminSummary> {
  const empty: CommerceAdminSummary = {
    products: 0,
    activeProducts: 0,
    stockUnits: 0,
    orders: 0,
    openOrders: 0,
    orderValue: 0,
    customers: 0,
    invoices: 0,
    unpaidInvoices: 0,
    recentOrders: [],
    recentCustomers: [],
  };

  if (!isSupabaseConfigured) return empty;

  const [products, orders, customers, invoices] = await Promise.all([
    supabaseOlivia
      .from('commerce_products')
      .select('id,stock,stock_quantity,active,status'),
    supabaseOlivia
      .from('commerce_orders')
      .select('*')
      .order('created_at', { ascending: false }),
    supabaseOlivia
      .from('commerce_customers')
      .select('*')
      .order('created_at', { ascending: false }),
    supabaseOlivia
      .from('commerce_invoices')
      .select('id,payment_status,invoice_total,total_amount,status'),
  ]);

  if (products.error) console.warn('[commerce] fetch products summary', products.error);
  if (orders.error) console.warn('[commerce] fetch orders summary', orders.error);
  if (customers.error) console.warn('[commerce] fetch customers summary', customers.error);
  if (invoices.error) console.warn('[commerce] fetch invoices summary', invoices.error);

  const productRows = products.data || [];
  const orderRows = orders.data || [];
  const customerRows = customers.data || [];
  const invoiceRows = invoices.data || [];

  return {
    products: productRows.length,
    activeProducts: productRows.filter(row => row.active !== false && row.status !== 'archived').length,
    stockUnits: productRows.reduce((sum, row) => sum + Number(row.stock_quantity ?? row.stock ?? 0), 0),
    orders: orderRows.length,
    openOrders: orderRows.filter(row => !['delivered', 'completed', 'cancelled', 'paid'].includes(text(row.status).toLowerCase())).length,
    orderValue: orderRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    customers: customerRows.length,
    invoices: invoiceRows.length,
    unpaidInvoices: invoiceRows.filter(row => !['paid', 'betalt'].includes(text(row.payment_status || row.status).toLowerCase())).length,
    recentOrders: orderRows.slice(0, 8).map(orderToRow),
    recentCustomers: customerRows.slice(0, 8).map(customerToRow),
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

  const customerId = makeId('cust');
  const customerPayload = {
    id: customerId,
    name: contactName,
    company,
    contact_name: contactName,
    email,
    customer_type: 'b2b',
    price_tier: 'b2b',
    payment_terms: 'Avtales',
    status: 'lead',
    notes: notes || null,
    metadata: {
      source: 'olivia-commerce',
      lastPackage: packageName,
    },
  };

  const customerWrite = await supabaseOlivia
    .from('commerce_customers')
    .insert(customerPayload);

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
    .insert(orderPayload);

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
      related_order_id: orderPayload.id,
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
    orderRow: orderToRow(orderPayload),
    customerRow: customerToRow(customerPayload),
    notificationSaved,
  };
}
