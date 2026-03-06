
import React, { useState, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, MoreHorizontal, Calendar, ChevronDown,
  BarChart2, PieChart, Droplets, Wrench, User, Factory, Tractor, Leaf, Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { CostCategory, RevenueCategory, ProfitabilitySnapshot, Language } from '../types';
import { useTranslation } from '../services/i18nService';

// Mock data for initial development - will be replaced with API data
const MOCK_SNAPSHOT: ProfitabilitySnapshot = {
  id: 'total_2024',
  type: 'Total',
  label: 'Total Gård 2024',
  timeframe: '2024',
  totalRevenue: 450000, // NOK
  totalCosts: 280000,
  netProfit: 170000,
  revenueBreakdown: {
    'OLIVENOLJE': 320000,
    'SPISEOLIVEN': 110000,
    'TURISME': 20000,
  },
  costBreakdown: {
    'ARBEIDSKRAFT': 95000,
    'VEDLIKEHOLD': 45000,
    'GJØDSEL': 30000,
    'PLANTEVERN': 25000,
    'INNHØSTING': 50000,
    'EMBALLASJE': 20000,
    'FASTE': 15000,
  },
};

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];
const COST_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'];

const CATEGORY_ICONS: Record<CostCategory, React.ReactNode> = {
  'GJØDSEL': <Leaf size={12} />,
  'PLANTEVERN': <Droplets size={12} />,
  'VANN': <Droplets size={12} />,
  'STRØM': <Wrench size={12} />,
  'ARBEIDSKRAFT': <User size={12} />,
  'VEDLIKEHOLD': <Wrench size={12} />,
  'INNHØSTING': <Tractor size={12} />,
  'EMBALLASJE': <Package size={12} />,
  'TRANSPORT': <Tractor size={12} />,
  'MARKEDSFORING': <BarChart2 size={12} />,
  'ADMINISTRASJON': <User size={12} />,
  'FASTE': <Factory size={12} />,
  'ANNET': <MoreHorizontal size={12} />
};

interface ProfitabilityDashboardProps {
  language: Language;
}

const ProfitabilityDashboard: React.FC<ProfitabilityDashboardProps> = ({ language }) => {
  const { t } = useTranslation(language);
  const [snapshot, setSnapshot] = useState<ProfitabilitySnapshot>(MOCK_SNAPSHOT);
  const [timeframe, setTimeframe] = useState('yearly');

  const profitMargin = useMemo(() => {
    if (snapshot.totalRevenue === 0) return 0;
    return (snapshot.netProfit / snapshot.totalRevenue) * 100;
  }, [snapshot]);

  const revenueChartData = useMemo(() => {
    return Object.entries(snapshot.revenueBreakdown).map(([name, value]) => ({ name: t(name as any) || name, value }));
  }, [snapshot, t]);

  const costChartData = useMemo(() => {
    return Object.entries(snapshot.costBreakdown).map(([name, value]) => ({ name: t(name as any) || name, value }));
  }, [snapshot, t]);

  const barChartData = useMemo(() => {
    return [{ 
      name: snapshot.label, 
      [t('REVENUE')]: snapshot.totalRevenue, 
      [t('COSTS')]: snapshot.totalCosts 
    }];
  }, [snapshot, t]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <DollarSign className="text-green-400" /> {t('profitability_overview')}
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
            {t('economic_result_for')}
          </p>
        </div>
        <div className="relative">
          <button className="flex items-center gap-2 text-sm text-slate-300 font-bold bg-white/5 px-4 py-2 rounded-lg border border-white/10">
            <Calendar size={16} />
            <span>{t('this_year')}</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title={t('total_revenue')}
          value={`kr ${snapshot.totalRevenue.toLocaleString('no-NO')}`}
          icon={<TrendingUp className="text-green-400" />} 
        />
        <MetricCard 
          title={t('total_costs')} 
          value={`kr ${snapshot.totalCosts.toLocaleString('no-NO')}`}
          icon={<TrendingDown className="text-red-400" />} 
        />
        <MetricCard 
          title={t('net_profit')} 
          value={`kr ${snapshot.netProfit.toLocaleString('no-NO')}`}
          icon={<DollarSign className="text-yellow-400" />} 
        />
        <MetricCard 
          title={t('profit_margin')} 
          value={`${profitMargin.toFixed(1)}%`}
          icon={<PieChart className="text-purple-400" />} 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 glass rounded-[2.5rem] p-8 border border-white/10">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart2 size={16} /> {t('revenue_vs_costs')}
          </h3>
          <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `kr ${Number(val) / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }} 
                    formatter={(value: number) => `kr ${value.toLocaleString('no-NO')}`}
                   />
                  <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                  <Bar dataKey={t('REVENUE')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('COSTS')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 border border-white/10">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChart size={16} /> {t('revenue_distribution')}
          </h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={revenueChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}>
                  {revenueChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `kr ${value.toLocaleString('no-NO')}`} />
                <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
        
      <div className="glass rounded-[2.5rem] p-8 border border-white/10">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <TrendingDown size={16} /> {t('cost_distribution')}
        </h3>
        <div className="space-y-4">
          {costChartData.sort((a,b) => b.value - a.value).map((item, index) => {
            const percentage = (item.value / snapshot.totalCosts) * 100;
            return (
              <div key={item.name} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-40">
                  <span className="text-slate-500">{CATEGORY_ICONS[item.name as CostCategory] || <MoreHorizontal size={12} />}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{t(item.name as any) || item.name}</span>
                </div>
                <div className="flex-1 bg-white/5 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: COST_COLORS[index % COST_COLORS.length] }}
                   />
                </div>
                <div className="w-32 text-right">
                  <span className="text-sm font-bold text-white">kr {item.value.toLocaleString('no-NO')}</span>
                  <span className="text-xs text-slate-500 ml-2">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon }) => (
  <div className="glass rounded-[2rem] p-6 border border-white/10">
    <div className="mb-2">{icon}</div>
    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{title}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
  </div>
);

export default ProfitabilityDashboard;
