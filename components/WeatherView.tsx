
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Sun, Wind, Droplets, MapPin, RefreshCcw, Loader2,
  Cloud, CloudRain, CloudLightning, Thermometer,
  ChevronDown, CloudSun, Snowflake, BarChart2,
  Gauge, Eye, Umbrella, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle2, Info, Navigation2
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ComposedChart, Line, Area, AreaChart
} from 'recharts';
import { Parcel, Language } from '../types';

type WeatherTab = 'forecast' | 'history' | 'yearly';

interface WeatherViewProps {
  initialData: any;
  initialLocationName: string;
  initialCoords: { lat: number; lon: number };
  language: Language;
  parcels: Parcel[];
  onParcelSelect: (parcel: Parcel) => void;
  selectedParcel: Parcel | null;
}

const WMO_CODES: Record<number, { label: string; icon: React.ReactNode }> = {
  0:  { label: 'Klarvær',           icon: <Sun size={48} className="text-yellow-300" /> },
  1:  { label: 'Stort sett klart',  icon: <CloudSun size={48} className="text-yellow-200" /> },
  2:  { label: 'Delvis skyet',      icon: <CloudSun size={48} className="text-slate-300" /> },
  3:  { label: 'Overskyet',         icon: <Cloud size={48} className="text-slate-400" /> },
  45: { label: 'Tåke',              icon: <Cloud size={48} className="text-slate-500" /> },
  48: { label: 'Rimtåke',           icon: <Cloud size={48} className="text-slate-500" /> },
  51: { label: 'Lett yr',           icon: <Droplets size={48} className="text-blue-300" /> },
  53: { label: 'Yr',                icon: <Droplets size={48} className="text-blue-400" /> },
  55: { label: 'Yr',                icon: <Droplets size={48} className="text-blue-500" /> },
  61: { label: 'Lett regn',         icon: <CloudRain size={48} className="text-blue-300" /> },
  63: { label: 'Regn',              icon: <CloudRain size={48} className="text-blue-400" /> },
  65: { label: 'Kraftig regn',      icon: <CloudRain size={48} className="text-blue-500" /> },
  71: { label: 'Lett snø',          icon: <Snowflake size={48} className="text-sky-200" /> },
  73: { label: 'Snø',               icon: <Snowflake size={48} className="text-sky-300" /> },
  75: { label: 'Kraftig snø',       icon: <Snowflake size={48} className="text-sky-400" /> },
  80: { label: 'Regnbyger',         icon: <CloudRain size={48} className="text-blue-300" /> },
  81: { label: 'Regnbyger',         icon: <CloudRain size={48} className="text-blue-400" /> },
  82: { label: 'Kraftige regnbyger', icon: <CloudRain size={48} className="text-blue-500" /> },
  95: { label: 'Tordenvær',         icon: <CloudLightning size={48} className="text-yellow-400" /> },
  96: { label: 'Tordenvær m/hagl',  icon: <CloudLightning size={48} className="text-yellow-500" /> },
  99: { label: 'Tordenvær m/hagl',  icon: <CloudLightning size={48} className="text-yellow-500" /> },
};

const wmoInfo = (code: number) =>
  WMO_CODES[code] ?? { label: 'Ukjent', icon: <Sun size={48} className="text-slate-400" /> };

const windDir = (deg: number) => {
  const dirs = ['N','NØ','Ø','SØ','S','SV','V','NV'];
  return dirs[Math.round(deg / 45) % 8];
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);

const WeatherView: React.FC<WeatherViewProps> = ({
  initialData,
  initialLocationName,
  initialCoords,
  language,
  parcels,
  onParcelSelect,
  selectedParcel,
}) => {
  // ── Location state ──────────────────────────────────────────────────────
  const getFarmCoords = useCallback((): { lat: number; lon: number } => {
    try {
      const s = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
      if (s.farmLat && s.farmLon) return { lat: parseFloat(s.farmLat), lon: parseFloat(s.farmLon) };
    } catch { /* ignore */ }
    return initialCoords;
  }, [initialCoords]);

  const getFarmName = useCallback((): string => {
    try {
      const s = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
      return s.farmName || s.farmAddress || 'Gård (standard)';
    } catch { return 'Gård (standard)'; }
  }, []);

  const [locationSource, setLocationSource] = useState<string>('farm');
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number }>(getFarmCoords);
  const [activeLocationName, setActiveLocationName] = useState<string>(getFarmName);

  // ── Weather data state ──────────────────────────────────────────────────
  const [forecastData, setForecastData] = useState<any>(initialData);
  const [archiveData, setArchiveData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WeatherTab>('forecast');

  // ── Fetch forecast + archive in parallel ────────────────────────────────
  const fetchAll = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setIsLoadingArchive(true);
    setError(null);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yStr = fmt(yesterday);
    const archiveStart = `${today.getFullYear() - 1}-01-01`; // Jan 1 last year

    try {
      const [fRes, aRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,is_day,precipitation,surface_pressure` +
          `&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset` +
          `&timezone=auto&forecast_days=14`
        ),
        fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
          `&start_date=${archiveStart}&end_date=${yStr}` +
          `&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min` +
          `&timezone=auto`
        ),
      ]);
      const [forecast, archive] = await Promise.all([fRes.json(), aRes.json()]);
      setForecastData(forecast);
      setArchiveData(archive);
    } catch (err: any) {
      setError(err.message || 'Nettverksfeil');
    } finally {
      setIsLoading(false);
      setIsLoadingArchive(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll(activeCoords.lat, activeCoords.lon);
  }, [activeCoords, fetchAll]);

  // Sync location when selectedParcel changes from outside
  useEffect(() => {
    if (selectedParcel && locationSource === selectedParcel.id) {
      const lat = selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0];
      const lon = selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1];
      if (lat && lon) {
        setActiveCoords({ lat, lon });
        setActiveLocationName(selectedParcel.name);
      }
    }
  }, [selectedParcel, locationSource]);

  // ── Location selector handler ───────────────────────────────────────────
  const handleLocationChange = (value: string) => {
    setLocationSource(value);
    if (value === 'farm') {
      const c = getFarmCoords();
      setActiveCoords(c);
      setActiveLocationName(getFarmName());
    } else {
      const parcel = parcels.find(p => p.id === value);
      if (parcel) {
        const lat = parcel.lat ?? parcel.coordinates?.[0]?.[0];
        const lon = parcel.lon ?? parcel.coordinates?.[0]?.[1];
        if (lat && lon) {
          setActiveCoords({ lat, lon });
          setActiveLocationName(parcel.name);
          onParcelSelect(parcel);
        }
      }
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    if (!forecastData?.hourly) return [];
    return forecastData.hourly.time.slice(0, 48).map((time: string, i: number) => ({
      time: new Date(time).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' }),
      temp: forecastData.hourly.temperature_2m[i],
      nedbørSjanse: forecastData.hourly.precipitation_probability[i],
      nedbør: forecastData.hourly.precipitation[i],
    }));
  }, [forecastData]);

  const waterBalance30d = useMemo(() => {
    if (!archiveData?.daily?.time) return null;
    const last = archiveData.daily.time.length;
    const start = Math.max(0, last - 30);
    const rain = archiveData.daily.precipitation_sum.slice(start);
    const et0  = archiveData.daily.et0_fao_evapotranspiration.slice(start);
    const totalRain = rain.reduce((a: number, b: number | null) => a + (b ?? 0), 0);
    const totalET0  = et0.reduce((a: number, b: number | null) => a + (b ?? 0), 0);
    return {
      rain: Math.round(totalRain),
      et0:  Math.round(totalET0),
      deficit: Math.round(totalET0 - totalRain),
    };
  }, [archiveData]);

  const historyChartData = useMemo(() => {
    if (!archiveData?.daily?.time) return [];
    const total = archiveData.daily.time.length;
    const start = Math.max(0, total - 90);
    return archiveData.daily.time.slice(start).map((date: string, i: number) => ({
      dato: date.slice(5).replace('-', '/'),
      Nedbør: +(archiveData.daily.precipitation_sum[start + i] ?? 0).toFixed(1),
      ET0: +(archiveData.daily.et0_fao_evapotranspiration[start + i] ?? 0).toFixed(1),
    }));
  }, [archiveData]);

  const yearlyChartData = useMemo(() => {
    if (!archiveData?.daily?.time) return [];
    const thisYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();
    const months = ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Des'];
    const ty = Array(12).fill(0);
    const ly = Array(12).fill(0);
    archiveData.daily.time.forEach((date: string, i: number) => {
      const m = parseInt(date.slice(5, 7)) - 1;
      const r = archiveData.daily.precipitation_sum[i] ?? 0;
      if (date.startsWith(thisYear)) ty[m] += r;
      else if (date.startsWith(lastYear)) ly[m] += r;
    });
    return months.map((month, i) => ({
      month,
      'I år': Math.round(ty[i]),
      'I fjor': Math.round(ly[i]),
    }));
  }, [archiveData]);

  const yearToDateTotals = useMemo(() => {
    if (!archiveData?.daily?.time) return null;
    const thisYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    let ty = 0, ly = 0;
    archiveData.daily.time.forEach((date: string, i: number) => {
      const r = archiveData.daily.precipitation_sum[i] ?? 0;
      if (date.startsWith(thisYear)) ty += r;
      else if (date.startsWith(lastYear)) {
        // Only count same days (1..dayOfYear)
        const d = new Date(date);
        const dayNum = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
        if (dayNum <= dayOfYear) ly += r;
      }
    });
    return { ty: Math.round(ty), ly: Math.round(ly), diff: Math.round(ty - ly) };
  }, [archiveData]);

  // ── UI helpers ──────────────────────────────────────────────────────────
  const cur = forecastData?.current;
  const daily = forecastData?.daily;

  const getDayLabel = (dateStr: string, index: number) => {
    if (index === 0) return 'I dag';
    if (index === 1) return 'I morgen';
    return new Date(dateStr).toLocaleDateString('no', { weekday: 'short' });
  };

  const deficitStatus = waterBalance30d
    ? waterBalance30d.deficit > 60 ? 'critical'
    : waterBalance30d.deficit > 25 ? 'warning'
    : waterBalance30d.deficit > 5  ? 'mild'
    : 'ok'
    : 'ok';

  const deficitStyle = {
    critical: { text: 'text-red-400',    border: 'border-red-500/40',    bg: 'bg-red-500/10',    label: 'Kritisk tørke' },
    warning:  { text: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/10', label: 'Vanningsbehov' },
    mild:     { text: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', label: 'Lite underskudd' },
    ok:       { text: 'text-green-400',  border: 'border-green-500/40',  bg: 'bg-green-500/10',  label: 'Tilstrekkelig nedbør' },
  }[deficitStatus];

  const tooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', fontSize: '12px' },
    labelStyle: { fontWeight: 'bold', color: '#fff' },
  };

  const inputClass = "w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-green-500/50";

  return (
    <div className="glass rounded-[2.5rem] p-6 md:p-8 border border-white/10 text-white min-h-[500px] flex flex-col gap-6">

      {/* ── Header: location + refresh ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-green-400 flex-shrink-0" />
            <div className="relative flex-1">
              <select
                value={locationSource}
                onChange={e => handleLocationChange(e.target.value)}
                className="bg-transparent text-xl font-bold focus:outline-none appearance-none cursor-pointer pr-8 w-full"
              >
                <option value="farm" className="bg-slate-800">{getFarmName()}</option>
                {parcels.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 font-mono pl-6">
            {activeCoords.lat.toFixed(4)}, {activeCoords.lon.toFixed(4)}
            {cur && ` · Oppdatert ${new Date().toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button
          onClick={() => fetchAll(activeCoords.lat, activeCoords.lon)}
          disabled={isLoading}
          className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl text-sm flex items-center gap-3">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl">
        {([
          { key: 'forecast', label: 'Prognose' },
          { key: 'history',  label: 'Regnhistorikk' },
          { key: 'yearly',   label: 'Årsstatistikk' },
        ] as { key: WeatherTab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-green-500 text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Prognose ── */}
      {activeTab === 'forecast' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Current conditions */}
          {cur && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/60 to-slate-900/60 border border-white/10 p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Icon + temp */}
                <div className="flex flex-col items-center md:items-start gap-2">
                  {wmoInfo(cur.weather_code).icon}
                  <div className="text-7xl font-black tracking-tighter leading-none">
                    {Math.round(cur.temperature_2m)}°
                  </div>
                  <div className="text-slate-300 font-medium text-base">
                    {wmoInfo(cur.weather_code).label}
                  </div>
                  <div className="text-slate-400 text-sm">
                    Kjennes som {Math.round(cur.apparent_temperature)}°
                  </div>
                </div>
                {/* Stats grid */}
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  {[
                    { icon: <Droplets size={16} />, label: 'Fuktighet', value: `${cur.relative_humidity_2m}%` },
                    { icon: <Wind size={16} />, label: 'Vind', value: `${Math.round(cur.wind_speed_10m)} km/h ${windDir(cur.wind_direction_10m)}` },
                    { icon: <Gauge size={16} />, label: 'Trykk', value: `${Math.round(cur.surface_pressure)} hPa` },
                    { icon: <Umbrella size={16} />, label: 'Nedbør nå', value: `${(cur.precipitation ?? 0).toFixed(1)} mm` },
                  ].map(stat => (
                    <div key={stat.label} className="bg-black/30 rounded-2xl p-4 flex items-center gap-3">
                      <span className="text-slate-400">{stat.icon}</span>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{stat.label}</p>
                        <p className="text-sm font-bold text-white">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Today min/max */}
              {daily && (
                <div className="mt-4 flex gap-3">
                  <span className="text-sm text-slate-400">
                    <span className="text-blue-300 font-bold">{Math.round(daily.temperature_2m_min[0])}°</span>
                    {' / '}
                    <span className="text-orange-300 font-bold">{Math.round(daily.temperature_2m_max[0])}°</span>
                    {' — '}
                    {Math.round(daily.precipitation_probability_max[0])}% nedbørssjanse
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 48h hourly chart */}
          {hourlyData.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Neste 48 timer</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                      interval={5} />
                    <YAxis yAxisId="temp" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}°`} domain={['auto', 'auto']} />
                    <YAxis yAxisId="prob" orientation="right" stroke="#475569" fontSize={10}
                      tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle}
                      formatter={(val: number, name: string) =>
                        name === 'nedbørSjanse' ? [`${val}%`, 'Nedbørssjanse'] : [`${val}°`, 'Temperatur']
                      }
                    />
                    <Bar yAxisId="prob" dataKey="nedbørSjanse" fill="#3b82f6" opacity={0.4} radius={[2,2,0,0]} name="nedbørSjanse" />
                    <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} name="temp" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-orange-400 inline-block" /> Temperatur</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/50 inline-block" /> Nedbørssjanse</span>
              </div>
            </div>
          )}

          {/* 14-day daily forecast */}
          {daily && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">14-dagers prognose</h4>
              <div className="space-y-1">
                {daily.time.map((day: string, i: number) => (
                  <div key={day} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${i === 0 ? 'bg-white/5' : 'hover:bg-white/3'}`}>
                    <span className="font-bold text-sm w-16 flex-shrink-0">{getDayLabel(day, i)}</span>
                    <div className="w-8 flex-shrink-0 text-slate-300">
                      {React.cloneElement(wmoInfo(daily.weather_code[i]).icon as React.ReactElement<any>, { size: 20 })}
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-blue-300 text-sm font-bold">{Math.round(daily.temperature_2m_min[i])}°</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 mx-1 relative overflow-hidden">
                        <div
                          className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                          style={{
                            left: `${Math.max(0, (daily.temperature_2m_min[i] - -5) / 40 * 100)}%`,
                            right: `${Math.max(0, 100 - (daily.temperature_2m_max[i] - -5) / 40 * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-orange-300 text-sm font-bold">{Math.round(daily.temperature_2m_max[i])}°</span>
                    </div>
                    <div className="flex items-center gap-1 w-20 flex-shrink-0 justify-end">
                      <Droplets size={12} className="text-blue-400" />
                      <span className="text-xs font-mono text-slate-300">{daily.precipitation_sum[i].toFixed(1)} mm</span>
                    </div>
                    <div className="w-14 flex-shrink-0 text-right">
                      <span className="text-[10px] text-blue-300 font-bold">{daily.precipitation_probability_max[i]}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && !cur && (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 size={24} className="animate-spin" /> Henter værvarsling...
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Regnhistorikk ── */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Water balance card */}
          {waterBalance30d ? (
            <div className={`rounded-3xl border p-6 ${deficitStyle.border} ${deficitStyle.bg}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    {deficitStatus === 'ok'
                      ? <CheckCircle2 size={18} className="text-green-400" />
                      : <AlertTriangle size={18} className={deficitStyle.text} />
                    }
                    <span className={deficitStyle.text}>{deficitStyle.label}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Vanningsbalanse siste 30 dager</p>
                </div>
                <div className={`text-3xl font-black ${deficitStyle.text}`}>
                  {waterBalance30d.deficit > 0 ? '+' : ''}{waterBalance30d.deficit} mm
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/20 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Nedbør</p>
                  <p className="text-xl font-black text-blue-300">{waterBalance30d.rain}</p>
                  <p className="text-xs text-slate-500">mm</p>
                </div>
                <div className="bg-black/20 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Fordampning (ET0)</p>
                  <p className="text-xl font-black text-orange-300">{waterBalance30d.et0}</p>
                  <p className="text-xs text-slate-500">mm</p>
                </div>
                <div className={`bg-black/20 rounded-2xl p-4 text-center`}>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                    {waterBalance30d.deficit > 0 ? 'Underskudd' : 'Overskudd'}
                  </p>
                  <p className={`text-xl font-black ${deficitStyle.text}`}>{Math.abs(waterBalance30d.deficit)}</p>
                  <p className="text-xs text-slate-500">mm</p>
                </div>
              </div>
              {waterBalance30d.deficit > 5 && (
                <div className="mt-4 bg-black/20 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Info size={12} className={deficitStyle.text} />
                    Anbefalt vanningsbehov:{' '}
                    <span className={`font-black ${deficitStyle.text}`}>{waterBalance30d.deficit} mm</span>
                    {' '}≈{' '}
                    <span className={`font-black ${deficitStyle.text}`}>{waterBalance30d.deficit * 10} L/daa</span>
                  </p>
                </div>
              )}
            </div>
          ) : isLoadingArchive ? (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
              <Loader2 size={20} className="animate-spin" /> Henter historiske data...
            </div>
          ) : null}

          {/* 90-day daily rain chart */}
          {historyChartData.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 size={14} /> Daglig nedbør og fordampning – siste 90 dager
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="dato" stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
                      interval={14} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}mm`} />
                    <Tooltip {...tooltipStyle}
                      formatter={(val: number, name: string) => [`${val} mm`, name]}
                    />
                    <Bar dataKey="Nedbør" fill="#3b82f6" radius={[2,2,0,0]} opacity={0.85} />
                    <Line type="monotone" dataKey="ET0" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/80 inline-block" /> Nedbør</span>
                <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-orange-400 inline-block" /> Fordampning (ET0)</span>
              </div>
            </div>
          )}

          {!isLoadingArchive && historyChartData.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Droplets size={40} className="mx-auto mb-3 opacity-30" />
              <p>Ingen historiske data tilgjengelig</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Årsstatistikk ── */}
      {activeTab === 'yearly' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Year-to-date comparison */}
          {yearToDateTotals && (
            <div className="grid grid-cols-3 gap-3">
              <div className="glass bg-black/20 rounded-2xl p-5 text-center border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">I år (hittil)</p>
                <p className="text-3xl font-black text-blue-300">{yearToDateTotals.ty}</p>
                <p className="text-xs text-slate-500">mm nedbør</p>
              </div>
              <div className="glass bg-black/20 rounded-2xl p-5 text-center border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">I fjor (same dato)</p>
                <p className="text-3xl font-black text-slate-300">{yearToDateTotals.ly}</p>
                <p className="text-xs text-slate-500">mm nedbør</p>
              </div>
              <div className={`glass rounded-2xl p-5 text-center border ${
                yearToDateTotals.diff >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
              }`}>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Differanse</p>
                <p className={`text-3xl font-black flex items-center justify-center gap-1 ${
                  yearToDateTotals.diff >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {yearToDateTotals.diff >= 0
                    ? <TrendingUp size={24} />
                    : <TrendingDown size={24} />
                  }
                  {yearToDateTotals.diff > 0 ? '+' : ''}{yearToDateTotals.diff}
                </p>
                <p className="text-xs text-slate-500">mm vs i fjor</p>
              </div>
            </div>
          )}

          {/* Monthly comparison bar chart */}
          {yearlyChartData.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 size={14} /> Månedlig nedbør – i år vs i fjor (mm)
              </h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}mm`} />
                    <Tooltip {...tooltipStyle}
                      formatter={(val: number, name: string) => [`${val} mm`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar dataKey="I fjor" fill="#475569" radius={[3,3,0,0]} />
                    <Bar dataKey="I år" fill="#22c55e" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-600 text-center">
                Data fra Open-Meteo ERA5 reanalysarkiv · {activeLocationName}
              </p>
            </div>
          ) : isLoadingArchive ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 size={20} className="animate-spin" /> Henter årsdata...
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Ingen årsdata tilgjengelig</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherView;
