import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeEuro,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Leaf,
  ListChecks,
  Package,
  RefreshCcw,
  ShoppingCart,
  Sprout,
  Trees,
  Users,
  Wheat,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Batch, FarmExpense, HarvestRecord, Parcel, Recipe, Task } from '../types';
import {
  fetchBatches,
  fetchExpenses,
  fetchHarvests,
  fetchParcels,
  fetchRecipes,
  fetchTasks,
} from '../services/db';
import { fetchCommerceAdminSummary, type CommerceAdminSummary, type CommerceRow } from '../services/commerceService';

const emptyCommerce: CommerceAdminSummary = {
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

const eur = (value: number) => new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(value);

const number = (value: number) => new Intl.NumberFormat('nb-NO', {
  maximumFractionDigits: 1,
}).format(value);

function monthKey(date: string | undefined): string {
  if (!date) return 'Ukjent';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Ukjent';
  return parsed.toLocaleDateString('nb-NO', { month: 'short' });
}

const AdminDashboard: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [commerce, setCommerce] = useState<CommerceAdminSummary>(emptyCommerce);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextParcels, nextBatches, nextRecipes, nextTasks, nextHarvests, nextExpenses, nextCommerce] = await Promise.all([
        fetchParcels(),
        fetchBatches(),
        fetchRecipes(),
        fetchTasks(),
        fetchHarvests(),
        fetchExpenses(),
        fetchCommerceAdminSummary(),
      ]);
      setParcels(nextParcels);
      setBatches(nextBatches);
      setRecipes(nextRecipes);
      setTasks(nextTasks);
      setHarvests(nextHarvests);
      setExpenses(nextExpenses);
      setCommerce(nextCommerce);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente Olivia-data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const treeCount = parcels.reduce((sum, parcel) => sum + Number(parcel.treeCount || 0), 0);
    const areaHa = parcels.reduce((sum, parcel) => sum + Number(parcel.area || 0), 0) / 10_000;
    const openTasks = tasks.filter(task => task.status !== 'DONE');
    const harvestKg = harvests.reduce((sum, harvest) => sum + Number(harvest.kg || 0), 0);
    const harvestRevenue = harvests.reduce((sum, harvest) => sum + Number(harvest.kg || 0) * Number(harvest.pricePerKg || 0), 0);
    const farmCost = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const activeBatches = batches.filter(batch => batch.status === 'ACTIVE');

    return {
      treeCount,
      areaHa,
      openTasks: openTasks.length,
      harvestKg,
      harvestRevenue,
      farmCost,
      activeBatches: activeBatches.length,
      archivedBatches: batches.length - activeBatches.length,
    };
  }, [batches, expenses, harvests, parcels, tasks]);

  const harvestChart = useMemo(() => {
    const byMonth = new Map<string, { month: string; kg: number; revenue: number }>();
    for (const harvest of harvests) {
      const key = monthKey(harvest.date);
      const current = byMonth.get(key) || { month: key, kg: 0, revenue: 0 };
      current.kg += Number(harvest.kg || 0);
      current.revenue += Number(harvest.kg || 0) * Number(harvest.pricePerKg || 0);
      byMonth.set(key, current);
    }
    return Array.from(byMonth.values());
  }, [harvests]);

  const statCards = [
    { label: 'Parseller', value: parcels.length.toString(), sub: `${number(summary.areaHa)} ha`, icon: Sprout, tone: 'text-emerald-300 bg-emerald-300/10' },
    { label: 'Oliventrær', value: number(summary.treeCount), sub: 'registrert i Olivia', icon: Trees, tone: 'text-green-300 bg-green-300/10' },
    { label: 'Batcher', value: batches.length.toString(), sub: `${summary.activeBatches} aktive · ${summary.archivedBatches} arkiv`, icon: Leaf, tone: 'text-lime-300 bg-lime-300/10' },
    { label: 'Oppskrifter', value: recipes.length.toString(), sub: 'produksjonsbibliotek', icon: BookOpen, tone: 'text-amber-300 bg-amber-300/10' },
    { label: 'Åpne oppgaver', value: summary.openTasks.toString(), sub: `${tasks.length} totalt`, icon: ListChecks, tone: 'text-sky-300 bg-sky-300/10' },
    { label: 'Høstet', value: `${number(summary.harvestKg)} kg`, sub: eur(summary.harvestRevenue), icon: Wheat, tone: 'text-yellow-300 bg-yellow-300/10' },
    { label: 'Produkter', value: commerce.products.toString(), sub: `${number(commerce.stockUnits)} på lager`, icon: Package, tone: 'text-purple-300 bg-purple-300/10' },
    { label: 'B2B ordre', value: commerce.orders.toString(), sub: eur(commerce.orderValue), icon: ShoppingCart, tone: 'text-rose-300 bg-rose-300/10' },
  ];

  const recentTasks = tasks.slice(0, 6);
  const recentOrders = commerce.recentOrders.slice(0, 6);

  const Row = ({ row }: { row: CommerceRow }) => (
    <tr className="border-t border-white/5">
      <td className="px-4 py-3 text-sm font-bold text-white">{row.no || row.company}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{row.customer || row.contact}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{row.items || row.type || row.terms}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-amber-200">{row.amount || row.status}</td>
    </tr>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Olivia Admin</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Live drift, produksjon og B2B</h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            Admin-panelet leser nå fra samme `olivia`-schema som Doña Anna, Family og RealtyFlow bruker.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
        >
          <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} /> Oppdater
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(stat => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon size={22} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Høst og inntekt</h3>
              <p className="mt-1 text-sm text-slate-400">{harvests.length} innhøstinger fra migrert Olivia-data</p>
            </div>
            <BadgeEuro className="text-amber-300" size={24} />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={harvestChart}>
                <defs>
                  <linearGradient id="oliviaRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Inntekt" stroke="#facc15" strokeWidth={3} fill="url(#oliviaRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Driftsstatus</h3>
              <p className="mt-1 text-sm text-slate-400">Kort oversikt fra produksjon og commerce</p>
            </div>
            <CheckCircle2 className="text-emerald-300" size={24} />
          </div>
          <div className="space-y-3">
            {[
              ['Produksjon', `${batches.length} batcher · ${recipes.length} oppskrifter`],
              ['Gård', `${parcels.length} parseller · ${number(summary.treeCount)} trær`],
              ['Økonomi', `${eur(summary.harvestRevenue)} inntekt · ${eur(summary.farmCost)} kost`],
              ['B2B', `${commerce.customers} kunder · ${commerce.openOrders} åpne ordre`],
              ['Faktura', `${commerce.invoices} faktura · ${commerce.unpaidInvoices} ubetalt`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
                <span className="text-sm font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h3 className="text-lg font-bold text-white">Siste B2B ordre</h3>
            <ShoppingCart className="text-amber-300" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Ordre</th>
                  <th className="px-4 py-3">Kunde</th>
                  <th className="px-4 py-3">Innhold</th>
                  <th className="px-4 py-3 text-right">Verdi</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length ? recentOrders.map(row => <Row key={String(row.no)} row={row} />) : (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">Ingen ordre enda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h3 className="text-lg font-bold text-white">Oppgaver</h3>
            <Clock className="text-sky-300" size={20} />
          </div>
          <div className="divide-y divide-white/5">
            {recentTasks.length ? recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-bold text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{task.category} · {task.priority}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Calendar size={14} /> {task.dueDate || 'Ingen dato'}
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Ingen oppgaver registrert.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
        {loading ? 'Laster live data fra Olivia...' : 'Live data er hentet fra RealtyFlow Supabase / olivia schema.'}
      </div>
    </div>
  );
};

export default AdminDashboard;
