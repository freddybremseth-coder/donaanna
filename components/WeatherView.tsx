
import React, { useEffect, useState, useMemo } from 'react';
import {
  Sun, Wind, Droplets, MapPin, RefreshCcw, Waves, Zap, Loader2,
  Cloud, CloudRain, CloudLightning, Navigation, Thermometer,
  ChevronRight, CalendarDays, Clock, CloudSun, Brain, Locate,
  Layers, History, TrendingUp, AlertTriangle, Snowflake, BarChart2,
  LineChart, X
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid,
  BarChart, Bar, YAxis, Legend, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { Parcel, Language } from '../types';
import GlossaryText from './GlossaryText';
import { geminiService } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';

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

const WeatherView: React.FC<WeatherViewProps> = ({
  initialData,
  initialLocationName,
  initialCoords,
  language,
  parcels,
  onParcelSelect,
  selectedParcel
}) => {
  const { t } = useTranslation(language);
  const [weatherData, setWeatherData] = useState(initialData);
  const [locationName, setLocationName] = useState(initialLocationName);
  const [coords, setCoords] = useState(initialCoords);
  const [activeTab, setActiveTab] = useState<WeatherTab>('forecast');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiCardExpanded, setIsAiCardExpanded] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState({ title: '', analysis: '' });

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [fullAnalysisText, setFullAnalysisText] = useState('');

  useEffect(() => {
    handleRefresh();
  }, [selectedParcel]);

  const handleRefresh = async () => {
    if (!selectedParcel) return;
    const lat = selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0];
    const lon = selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1];
    if (!lat || !lon) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
        `&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset` +
        `&timezone=auto`
      );
      if (!res.ok) throw new Error(t('error_fetching_weather'));
      const data = await res.json();
      setWeatherData(data);
      setLocationName(selectedParcel.name);
      setCoords({ lat, lon });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!weatherData?.yearly?.rain) return;
    setIsGeneratingReport(true);
    setError(null);
    try {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = weatherData.yearly.rain.normal.map((normal: number, index: number) => ({
        name: monthNames[index],
        rain: weatherData.yearly.rain.rain[index],
        normal: normal
      }));

      const result = await geminiService.getYearlyRainfallAnalysis(monthlyData, locationName, language);
      setAiAnalysis(result);
    } catch (err: any) {
      console.error("AI Analysis Error in WeatherView:", err);
      setError('Failed to generate AI analysis.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

 const handleSeeFullReport = () => {
    if (fullAnalysisText) {
      setIsAnalysisModalOpen(true);
      return;
    }

    setIsGeneratingReport(true);
    // Simulate fetching a more detailed report from the AI
    setTimeout(() => {
      const detailedReport = aiAnalysis.analysis + " " + t('mock_detailed_analysis_text');
      setFullAnalysisText(detailedReport);
      setIsGeneratingReport(false);
      setIsAnalysisModalOpen(true);
    }, 1500);
  };


  const yearlyChartData = useMemo(() => {
    if (!weatherData?.yearly?.rain) return [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return weatherData.yearly.rain.normal.map((normal: number, index: number) => ({
      month: monthNames[index],
      [t('normal_precipitation')]: normal,
      [t('actual_precipitation')]: weatherData.yearly.rain.rain[index]
    }));
  }, [weatherData, t]);

  const forecastHourlyData = useMemo(() => {
    if (!weatherData?.hourly) return [];
    return weatherData.hourly.time.slice(0, 24).map((t: string, i: number) => ({
      time: new Date(t).getHours() + ':00',
      temperature: weatherData.hourly.temperature_2m[i],
      precipitation: weatherData.hourly.precipitation_probability[i],
    }));
  }, [weatherData]);

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language, { weekday: 'short' });
  };

  const getWeatherIcon = (code: number, isDay: number) => {
    switch (code) {
      case 0: return isDay ? <Sun size={32} /> : <CloudSun size={32} />;
      case 1: case 2: case 3: return <Cloud size={32} />;
      case 45: case 48: return <Cloud size={32} />;
      case 51: case 53: case 55: return <Droplets size={32} />;
      case 61: case 63: case 65: return <CloudRain size={32} />;
      case 80: case 81: case 82: return <CloudRain size={32} />;
      case 71: case 73: case 75: case 85: case 86: return <Snowflake size={32} />;
      case 95: case 96: case 99: return <CloudLightning size={32} />;
      default: return <Sun size={32} />;
    }
  };

  return (
    <div className="glass rounded-[2.5rem] p-6 md:p-8 border border-white/10 text-white min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className='w-full'>
          <div className="flex items-center gap-4">
            <div className="relative">
                <select 
                    value={selectedParcel?.id || ''}
                    onChange={(e) => {
                        const parcel = parcels.find(p => p.id === e.target.value);
                        if (parcel) onParcelSelect(parcel);
                    }}
                    className="bg-transparent text-xl font-bold focus:outline-none appearance-none cursor-pointer pr-8"
                >
                    {parcels.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
                </select>
                <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
            <MapPin size={12} /> {coords.lat?.toFixed(3)}, {coords.lon?.toFixed(3)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-6 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        {(['forecast', 'history', 'yearly'] as WeatherTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-grow">
        {activeTab === 'forecast' && weatherData?.daily && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {weatherData.daily.time.map((day: string, index: number) => (
              <div key={day} className={`flex items-center justify-between p-3 rounded-xl ${index === 0 ? 'bg-white/5' : ''}`}>
                <span className="font-bold w-1/5">{index === 0 ? t('today') : getDayOfWeek(day)}</span>
                <div className="flex items-center gap-2 w-1/5 justify-center">
                  {getWeatherIcon(weatherData.daily.weather_code[index], weatherData.daily.sunrise[index] < new Date().toISOString() && weatherData.daily.sunset[index] > new Date().toISOString() ? 1: 0)}
                </div>
                <div className="flex items-center gap-1 w-1/5">
                  <Thermometer size={14} className="text-slate-400" />
                  <span className="text-sm">{weatherData.daily.temperature_2m_min[index].toFixed(0)}° / {weatherData.daily.temperature_2m_max[index].toFixed(0)}°</span>
                </div>
                <div className="flex items-center gap-1 w-1/5">
                  <Droplets size={14} className="text-slate-400" />
                  <span className="text-sm">{weatherData.daily.precipitation_sum[index].toFixed(1)} mm</span>
                </div>
                <div className="flex items-center gap-1 w-1/5">
                  <Wind size={14} className="text-slate-400" />
                  <span className="text-sm">{weatherData.daily.wind_speed_10m_max[index].toFixed(1)} km/h</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
           <div className="animate-in fade-in duration-500 text-center pt-10">
                <History size={40} className="mx-auto text-slate-500" />
                <h4 className="font-bold text-lg mt-4">{t('historical_data')}</h4>
                <p className="text-sm text-slate-400">{t('coming_soon')}</p>
            </div>
        )}

        {activeTab === 'yearly' && (
          <div className="animate-in fade-in duration-500">
            <div className='flex justify-end'>
                 <button onClick={() => setIsAiCardExpanded(!isAiCardExpanded)} className="text-xs p-2 -mb-4 -mt-4 text-slate-400 hover:text-white">
                    {isAiCardExpanded ? t('collapse') : t('expand')}
                </button>
            </div>
            { isAiCardExpanded &&
            <div className="glass p-4 rounded-xl border border-white/10 mb-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-md flex items-center gap-2">
                        <Brain size={16} className="text-purple-400" />
                        {t('ai_microclimate_analysis')}
                        </h4>
                        <p className="text-xs text-slate-400">{t('based_on_yearly_precipitation')}</p>
                    </div>
                     <button
                        onClick={handleGenerateAnalysis}
                        disabled={isGeneratingReport}
                        className="text-xs bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-3 py-1 rounded-md transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {isGeneratingReport ? <Loader2 size={14} className="animate-spin"/> : <RefreshCcw size={14} />}
                        {t('regenerate')}
                    </button>
                </div>
              
                {aiAnalysis.title ? (
                  <div className="mt-4">
                    <p className="font-bold text-green-400 text-sm">{aiAnalysis.title}</p>
                    <p className="text-xs mt-1 text-slate-300 leading-relaxed">
                        {aiAnalysis.analysis.substring(0, 150)}...
                    </p>
                    <button onClick={handleSeeFullReport} className="text-xs font-bold text-green-400 hover:underline mt-2 flex items-center gap-1 disabled:opacity-50" disabled={isGeneratingReport}>
                         {isGeneratingReport && !fullAnalysisText ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                        {t('see_full_report')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-400">{t('press_generate_for_analysis')}</p>
                  </div>
                )}
            </div>
            }

            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart2 size={16} /> {t('precipitation_comparison')} (mm)
            </h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} mm`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => [`${value} mm`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                  <Bar dataKey={t('normal_precipitation')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('actual_precipitation')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      
    {/* Full Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-2xl m-4 relative">
            <button 
              onClick={() => setIsAnalysisModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 text-purple-400">
              <Brain size={20} />
              {t('full_ai_analysis')}
            </h3>
            <div className="mt-4 text-slate-300 text-sm leading-relaxed max-h-[70vh] overflow-y-auto pr-4">
              <p className='font-bold text-base text-green-400 mb-2'>{aiAnalysis.title}</p>
              {fullAnalysisText.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WeatherView;
