
import React, { useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, CloudSun, Sprout, TrendingUp, Truck, Droplets,
  ClipboardList, Settings, LogOut, ShieldCheck, Sparkles, Scissors, Menu, X, ChevronLeft, ChevronRight,
  Activity, Store
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../services/i18nService';
import { Language } from '../types';

type PortalMode = 'olivia' | 'b2b';
type MenuItem = { id: string; icon: React.ElementType; label: string };

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  language: Language;
  portalMode?: PortalMode;
}

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, onTabChange, onLogout, language, portalMode = 'olivia' }) => {
  const { t } = useTranslation(language);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isB2BPortal = portalMode === 'b2b';

  const farmMenuItems: MenuItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { id: 'consultant', icon: Sparkles, label: t('consultant') },
    { id: 'pruning', icon: Scissors, label: t('pruning') },
    { id: 'map', icon: MapIcon, label: t('map') },
    { id: 'weather', icon: CloudSun, label: t('weather') },
    { id: 'production', icon: Sprout, label: t('production') },
    { id: 'commerce', icon: Store, label: 'B2B Portal' },
    { id: 'economy', icon: TrendingUp, label: t('economy') },
    { id: 'fleet', icon: Truck, label: t('fleet') },
    { id: 'irrigation', icon: Droplets, label: t('irrigation') },
    { id: 'tasks', icon: ClipboardList, label: t('tasks') },
    { id: 'iot', icon: Activity, label: t('iot_sensors_menu') },
  ];

  const b2bMenuItems: MenuItem[] = [
    { id: 'commerce', icon: Store, label: 'B2B Portal' },
  ];

  const adminItems: MenuItem[] = user.role === 'super_admin' ? [
    { id: 'admin', icon: ShieldCheck, label: t('admin') }
  ] : [];

  const allMenuItems = isB2BPortal
    ? b2bMenuItems
    : [...farmMenuItems, ...adminItems];

  const activeMenuClass = (isMobile: boolean) => {
    if (isB2BPortal) {
      return isMobile
        ? 'bg-[#d4af37]/10 text-[#d4af37]'
        : 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.28)]';
    }
    return isMobile
      ? 'bg-green-500/10 text-green-400'
      : 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]';
  };

  const inactiveMenuClass = (isMobile: boolean) => (
    isB2BPortal
      ? `text-[#8f8876] hover:text-[#f6e7b6] ${isMobile ? '' : 'hover:bg-[#d4af37]/10'}`
      : `text-slate-500 hover:text-slate-300 ${isMobile ? '' : 'hover:bg-white/5'}`
  );

  const settingsActiveClass = isB2BPortal
    ? 'text-[#d4af37] bg-[#d4af37]/10'
    : 'text-green-400 bg-green-500/10';

  const renderMenuItem = (item: MenuItem, isMobile: boolean) => (
    <button
      key={item.id}
      onClick={() => {
        onTabChange(item.id);
        if (isMobile) setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-4 p-${isMobile ? '4' : '3.5'} rounded-xl font-medium transition-all group ${
        activeTab === item.id
          ? activeMenuClass(isMobile)
          : inactiveMenuClass(isMobile)
      }`}
    >
      <item.icon size={20} className={activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'} />
      { (isSidebarOpen || isMobile) && <span className="text-sm truncate">{item.label}</span>}
      {!isSidebarOpen && !isMobile && (
          <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            {item.label}
          </div>
      )}
    </button>
  );

  return (
    <div className={`flex h-screen overflow-hidden text-slate-200 ${isB2BPortal ? 'bg-[#090806]' : 'bg-[#0a0a0b]'}`}>
      {/* Mobile Header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 h-16 border-b backdrop-blur-lg z-50 px-4 flex items-center justify-between ${isB2BPortal ? 'border-[#d4af37]/15 bg-[#090806]/95' : 'border-white/10 bg-black/80'}`}>
        <div className="flex items-center gap-3">
          {isB2BPortal ? (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#15100a] p-1">
                <img src="/labels/luxury/dona-anna-monogram-da.svg" alt="DA" className="h-full w-full object-contain" />
              </div>
              <div className="leading-tight">
                <span className="block font-bold text-white tracking-tight">Doña Anna</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">B2B Portal</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center font-bold text-black text-sm">O</div>
              <span className="font-bold text-white tracking-tight">Olivia OS</span>
            </>
          )}
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`lg:hidden fixed inset-0 z-40 pt-20 px-6 overflow-y-auto ${isB2BPortal ? 'bg-[#090806]/98' : 'bg-black/95'}`}>
          <div className="space-y-2">
            {allMenuItems.map(item => renderMenuItem(item, true))}
            <div className="pt-8 border-t border-white/10 mt-8 space-y-2">
              <button 
                onClick={() => { onTabChange('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium ${activeTab === 'settings' ? settingsActiveClass : inactiveMenuClass(true)}`}
              >
                <Settings size={20} />
                <span>{t('settings')}</span>
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl font-medium text-red-400">
                <LogOut size={20} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r transition-all duration-300 relative ${isB2BPortal ? 'border-[#d4af37]/15 bg-[#090806]' : 'border-white/10 bg-[#0d0d0f]'} ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-4 mb-4">
          <div className={`flex min-w-[44px] h-11 items-center justify-center rounded-xl shadow-lg ${isB2BPortal ? 'border border-[#d4af37]/30 bg-[#15100a] p-1.5 shadow-[0_0_24px_rgba(212,175,55,0.12)]' : 'bg-gradient-to-br from-green-400 to-emerald-600 neon-glow-green'}`}>
            {isB2BPortal ? (
              <img src="/labels/luxury/dona-anna-monogram-da.svg" alt="DA" className="h-full w-full object-contain" />
            ) : (
              <span className="font-bold text-xl text-black">O</span>
            )}
          </div>
          {isSidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap overflow-hidden">
                {isB2BPortal ? 'Doña Anna' : <>Olivia <span className="text-green-400">OS</span></>}
              </h1>
              {isB2BPortal && <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">B2B Portal</p>}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {allMenuItems.map(item => renderMenuItem(item, false))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1 bg-black/20">
          <button 
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center gap-4 p-3.5 rounded-xl font-medium transition-all group ${
              activeTab === 'settings' ? settingsActiveClass : inactiveMenuClass(false)
            }`}
          >
            <Settings size={20} />
            {isSidebarOpen && <span className="text-sm">{t('settings')}</span>}
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 p-3.5 rounded-xl font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm">{t('logout')}</span>}
          </button>
          
          {isSidebarOpen && (
            <div className={`mt-4 rounded-2xl border p-4 ${isB2BPortal ? 'border-[#d4af37]/12 bg-[#d4af37]/5' : 'glass border-white/5 bg-white/5'}`}>
              <div className="flex items-center gap-3">
                <img src={user.avatar} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className={`text-[10px] truncate uppercase tracking-widest ${isB2BPortal ? 'text-[#d4af37]' : 'text-slate-500'}`}>
                    {isB2BPortal ? 'B2B Portal' : user.role}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-50 shadow-xl"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${isB2BPortal ? 'bg-[#090806]' : 'bg-[#0a0a0b]'}`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 lg:mt-0 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
