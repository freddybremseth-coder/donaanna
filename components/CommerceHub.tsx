import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeEuro,
  Building2,
  ChefHat,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Globe2,
  Handshake,
  LineChart,
  Package,
  ReceiptText,
  Search,
  Send,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { createCommerceQuote, fetchCommerceRows, type CommerceQuoteInput, type CommerceRow } from '../services/commerceService';

type CommerceTab = 'overview' | 'products' | 'customers' | 'orders' | 'invoices' | 'content';

const REALTYFLOW_CONTENT_URL = (import.meta.env.VITE_REALTYFLOW_CONTENT_URL as string | undefined) || 'https://realtyflow.chatgenius.pro/content-hub';

const products: CommerceRow[] = [
  { sku: 'DA-VV-250', name: 'Verde Vivo', size: '250 ml', channel: 'Fine dining finishing', stock: 420, price: '€24.90', status: 'First early harvest' },
  { sku: 'DA-VA-500', name: 'Verde Alto', size: '500 ml', channel: 'Restaurant/Retail premium', stock: 760, price: '€19.50', status: 'Second early harvest' },
  { sku: 'DA-RA-500', name: 'Raíz Antigua', size: '500 ml', channel: 'Limited allocation', stock: 180, price: '€34.00', status: 'Old-tree estate selection' },
  { sku: 'DA-CV-5L', name: 'Cocina Viva', size: '5 L', channel: 'Chef kitchen format', stock: 90, price: 'B2B quote', status: 'Traceable chef format' },
  { sku: 'DA-ME-750', name: 'Mesa Aceitunas', size: '750 g', channel: 'Spanish markets/restaurants', stock: 520, price: 'B2B quote', status: 'Table olives' },
];

const customers: CommerceRow[] = [
  { company: 'Nordic Deli AS', contact: 'Ingrid Larsen', type: 'B2B forhandler', terms: 'Netto 14', status: 'Varm lead' },
  { company: 'Biar Gastro S.L.', contact: 'Mateo Ruiz', type: 'Restaurant', terms: 'Kontant', status: 'Aktiv kunde' },
  { company: 'Olive Club Norway', contact: 'Knut Berg', type: 'Abonnement', terms: 'Kort', status: 'Kundeportal' },
];

const orders: CommerceRow[] = [
  { no: 'DA-2026-0018', customer: 'Biar Gastro S.L.', items: '24 x Verde Alto · 6 x Mesa', amount: '€468.00', status: 'Pakkes', next: 'Send traceability-link' },
  { no: 'DA-2026-0017', customer: 'Nordic Deli AS', items: '72 x Verde Alto · 12 x Verde Vivo', amount: '€1 702.80', status: 'Tilbud', next: 'Godkjenn B2B-pris' },
  { no: 'DA-2026-0016', customer: 'Restaurante Alicante', items: '2 x Cocina Viva 5 L', amount: 'B2B quote', status: 'Tasting kit', next: 'Følg opp kjøkkensjef' },
];

const invoices: CommerceRow[] = [
  { no: 'INV-2026-0042', order: 'DA-2026-0018', customer: 'Biar Gastro S.L.', due: '02.05.2026', total: '€696.00', status: 'Utkast' },
  { no: 'INV-2026-0041', order: 'DA-2026-0016', customer: 'Olive Club Norway', due: '30.04.2026', total: '€226.80', status: 'Sendt' },
  { no: 'INV-2026-0040', order: 'DA-2026-0014', customer: 'Casa Verde', due: '21.04.2026', total: '€410.00', status: 'Betalt' },
];

const contentItems: CommerceRow[] = [
  { name: 'Ordrebekreftelse', use: 'Sendes automatisk etter B2B/kundeordre', owner: 'Admin', status: 'Må kobles' },
  { name: 'Faktura-e-post', use: 'PDF, betalingsfrist og sporingskode', owner: 'Admin', status: 'Utkast' },
  { name: 'Produktark', use: 'Brukes på web, B2B og QR-side', owner: 'Produkt', status: 'Aktiv' },
  { name: 'Batch-fortelling', use: 'Tekst fra Olivia-produksjon til flaskens QR-side', owner: 'Olivia OS', status: 'Ny' },
];

const buyerSegments = [
  {
    title: 'Restauranter',
    icon: ChefHat,
    target: 'Kjøkkensjef / sommelier',
    pitch: 'Smaksprøve, 500 ml finishing oils og 5 L Cocina Viva for service.',
    next: 'Send chef tasting kit',
  },
  {
    title: 'Gourmetbutikker',
    icon: Store,
    target: 'Butikkeier / innkjøper',
    pitch: 'Hylleklar produktfamilie med produktark, margin og QR-historie.',
    next: 'Send prisliste og produktark',
  },
  {
    title: 'Distributører',
    icon: Truck,
    target: 'Import / wholesale',
    pitch: 'Volum, batchsporbarhet, logistikkdata og tydelig premiumposisjon.',
    next: 'Book distribusjonssamtale',
  },
];

const commercialActions = [
  { label: 'Leads uten neste steg', value: '6', icon: Users, tone: 'text-sky-300 bg-sky-300/10' },
  { label: 'Tasting kits klare', value: '18', icon: Package, tone: 'text-emerald-300 bg-emerald-300/10' },
  { label: 'Tilbud må godkjennes', value: '2', icon: ClipboardCheck, tone: 'text-amber-300 bg-amber-300/10' },
  { label: 'Oppfølging denne uken', value: '9', icon: Handshake, tone: 'text-rose-300 bg-rose-300/10' },
];

const offerStack = [
  ['Tasting kit', '3 produkter · produktark · QR-demo', 'Lav terskel for første møte'],
  ['Restaurant startpakke', '24 x 500 ml · 2 x 5 L · bordkort', 'Rask vei fra smaking til service'],
  ['Retail launch', '72 flasker · hyllehistorie · SoMe-kit', 'Tydelig pakke for butikk og gave'],
];

const CommerceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CommerceTab>('overview');
  const [orderRows, setOrderRows] = useState<CommerceRow[]>(orders);
  const [customerRows, setCustomerRows] = useState<CommerceRow[]>(customers);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<CommerceQuoteInput>({
    company: '',
    contactName: '',
    email: '',
    packageName: 'Chef tasting kit',
    quantity: 1,
    amount: 0,
    notes: '',
  });

  useEffect(() => {
    fetchCommerceRows()
      .then((rows) => {
        if (rows.orders.length) setOrderRows(rows.orders);
        if (rows.customers.length) setCustomerRows(rows.customers);
      })
      .catch((error) => console.warn('[commerce] load failed', error));
  }, []);

  const updateQuoteField = (field: keyof CommerceQuoteInput, value: string | number) => {
    setQuoteForm(prev => ({ ...prev, [field]: value }));
  };

  const submitQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingQuote(true);
    setNotice(null);
    try {
      const result = await createCommerceQuote(quoteForm);
      setOrderRows(prev => [result.orderRow, ...prev]);
      setCustomerRows(prev => {
        const existing = prev.filter(row => String(row.company).toLowerCase() !== String(result.customerRow.company).toLowerCase());
        return [result.customerRow, ...existing];
      });
      setActiveTab('orders');
      setQuoteOpen(false);
      setQuoteForm({ company: '', contactName: '', email: '', packageName: 'Chef tasting kit', quantity: 1, amount: 0, notes: '' });
      setNotice(result.notificationSaved
        ? 'Tilbud lagret, og varsel er lagt i Olivia/RealtyFlow-outbox.'
        : 'Tilbud lagret. Varsel-tabellen var ikke tilgjengelig ennå.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Kunne ikke lagre tilbudet.');
    } finally {
      setIsSavingQuote(false);
    }
  };

  const tabs: Array<{ id: CommerceTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Oversikt', icon: Store },
    { id: 'products', label: 'Produkter', icon: Package },
    { id: 'customers', label: 'Kunder/B2B', icon: Building2 },
    { id: 'orders', label: 'Ordre', icon: ShoppingCart },
    { id: 'invoices', label: 'Faktura', icon: ReceiptText },
    { id: 'content', label: 'Tekster', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Doña Anna Commerce</p>
          <h2 className="mt-2 text-3xl font-bold text-white">B2B-salg, kundeportal, ordre og faktura samlet i Olivia OS</h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            Dette skal fungere som et kommersielt kontrollrom: bygg pipeline fra tasting kit til fast kunde, knytt ordre til batch, og gjenbruk produktfortelling på web, e-post, QR og produktark.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setQuoteOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black">
            <Send size={17} /> Nytt tilbud
          </button>
          <a href={REALTYFLOW_CONTENT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
            <Globe2 size={17} /> Åpne RealtyFlow
          </a>
        </div>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-100/70 hover:text-white" aria-label="Lukk melding">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'B2B pipeline', value: '€12 304', icon: BadgeEuro, tone: 'text-amber-300 bg-amber-300/10' },
          { label: 'Åpne ordre', value: '3', icon: ShoppingCart, tone: 'text-blue-300 bg-blue-300/10' },
          { label: 'Flasker på lager', value: '1 600', icon: Package, tone: 'text-green-300 bg-green-300/10' },
          { label: 'Faktura til oppfølging', value: '2', icon: ReceiptText, tone: 'text-purple-300 bg-purple-300/10' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon size={22} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commercialActions.map(action => (
          <div key={action.label} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{action.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{action.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.tone}`}>
                <action.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                activeTab === tab.id ? 'bg-amber-300 text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon size={17} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Kommersiell motor</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Selg Doña Anna som et profesjonelt konsept, ikke bare som enkeltflasker</h3>
                </div>
                <LineChart className="text-amber-300" size={28} />
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {buyerSegments.map(segment => (
                  <div key={segment.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
                        <segment.icon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-white">{segment.title}</p>
                        <p className="text-xs text-slate-500">{segment.target}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-400">{segment.pitch}</p>
                    <button className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300">
                      {segment.next} <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Tilbudspakker</p>
              <h3 className="mt-2 text-xl font-bold text-white">Pakker som gjør kjøpsbeslutningen enklere</h3>
              <div className="mt-5 space-y-3">
                {offerStack.map(([title, content, purpose]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="font-bold text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-300">{content}</p>
                    <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">{purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-xl font-bold text-white">Anbefalt sammenslåing</h3>
              <div className="mt-5 space-y-4">
                {[
                  ['Olivia OS', 'Gårdsdrift, parseller, høst, batch, kvalitet, oppgaver og sensorikk. Dette er kilden til sannheten.'],
                  ['Admin', 'Rettigheter, produktkatalog, priser, kundegrupper, tekster, ordre, faktura og publisering.'],
                  ['B2B/kundeportal', 'Innlogging for forhandlere og kunder med egne priser, ordrestatus, faktura, produktark og sporbarhet.'],
                  ['donaanna.com', 'Offentlig merkevare, produktfortelling, kunnskap, lead-skjema og QR-sider fra batchdata.'],
                ].map(([title, text]) => (
                  <div key={title} className="flex gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <CheckCircle2 className="mt-1 text-green-300" size={20} />
                    <div>
                      <p className="font-bold text-white">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-xl font-bold text-white">Sømløs ordre-flyt</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                {['B2B-kunde logger inn og ser egne priser', 'Ordre reserverer lager og knyttes til batch', 'Admin godkjenner, pakker og sender', 'Faktura genereres fra samme ordrelinjer', 'Kunde ser status, faktura og QR-sporbarhet'].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl bg-black/20 p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-xs font-bold text-black">{index + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && <DataTable title="Produktkatalog" rows={products} />}
      {activeTab === 'customers' && <DataTable title="Kunder og B2B-kontoer" rows={customerRows} />}
      {activeTab === 'orders' && <DataTable title="Ordre og tilbud" rows={orderRows} />}
      {activeTab === 'invoices' && <DataTable title="Faktura og betaling" rows={invoices} />}
      {activeTab === 'content' && <DataTable title="Tekster, e-postmaler og produktark" rows={contentItems} />}

      {quoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
          <form onSubmit={submitQuote} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">B2B tilbud</p>
                <h3 className="mt-2 text-2xl font-bold text-white">Nytt tilbud / ordreutkast</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Lagres i Olivia commerce og legger en ordrevarsling klar for RealtyFlow.</p>
              </div>
              <button type="button" onClick={() => setQuoteOpen(false)} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Lukk">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-300">
                Firma
                <input value={quoteForm.company} onChange={event => updateQuoteField('company', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-amber-300/70" required />
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Kontaktperson
                <input value={quoteForm.contactName} onChange={event => updateQuoteField('contactName', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-amber-300/70" required />
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                E-post
                <input type="email" value={quoteForm.email} onChange={event => updateQuoteField('email', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-amber-300/70" required />
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Pakke
                <select value={quoteForm.packageName} onChange={event => updateQuoteField('packageName', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-amber-300/70">
                  <option>Chef tasting kit</option>
                  <option>Restaurant startpakke</option>
                  <option>Retail launch</option>
                  <option>Cocina Viva 5 L</option>
                  <option>Custom B2B quote</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Antall
                <input type="number" min="1" value={quoteForm.quantity} onChange={event => updateQuoteField('quantity', Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-amber-300/70" />
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Beløp EUR
                <input type="number" min="0" step="0.01" value={quoteForm.amount} onChange={event => updateQuoteField('amount', Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-amber-300/70" />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-300">
              Notater
              <textarea value={quoteForm.notes} onChange={event => updateQuoteField('notes', event.target.value)} className="mt-2 h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-amber-300/70" placeholder="Levering, ønsket oppfølging, spesielle priser..." />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setQuoteOpen(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 hover:text-white">
                Avbryt
              </button>
              <button disabled={isSavingQuote} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-black disabled:opacity-60">
                <Send size={17} /> {isSavingQuote ? 'Lagrer...' : 'Lagre tilbud'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function DataTable({ title, rows }: { title: string; rows: Array<Record<string, string | number>> }) {
  const columns = Object.keys(rows[0] ?? {});

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">Felles datagrunnlag for Olivia OS, Admin, B2B og donaanna.com.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm outline-none focus:border-amber-300/60" placeholder="Søk..." />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
              {columns.map(column => (
                <th key={column} className="px-5 py-4">{column}</th>
              ))}
              <th className="px-5 py-4 text-right">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, index) => (
              <tr key={index} className="text-sm text-slate-300 hover:bg-white/[0.03]">
                {columns.map(column => (
                  <td key={column} className="whitespace-nowrap px-5 py-4">{row[column]}</td>
                ))}
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
                    <Truck size={14} /> Åpne
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CommerceHub;
