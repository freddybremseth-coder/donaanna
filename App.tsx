
import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import LandingPage from './components/PublicB2BLandingPage';
import PublicContentPage, { isPublicContentPath } from './components/PublicContentPage';
import LoginModal, { StoredUser } from './components/LoginModal';
import ResetPasswordPage from './components/ResetPasswordPage';
import { UserProfile, Language, Parcel } from './types';
import { getCurrentSession, onAuthChange, signOut as authSignOut } from './services/auth';

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const FarmOverview = lazy(() => import('./components/FarmOverview'));
const FarmMap = lazy(() => import('./components/FarmMap'));
const WeatherView = lazy(() => import('./components/WeatherView'));
const ProductionView = lazy(() => import('./components/ProductionView'));
const FleetView = lazy(() => import('./components/FleetView'));
const IrrigationView = lazy(() => import('./components/IrrigationView'));
const TasksView = lazy(() => import('./components/TasksView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const FieldConsultantView = lazy(() => import('./components/FieldConsultantView'));
const PruningAdvisorView = lazy(() => import('./components/PruningAdvisorView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const IoTDashboard = lazy(() => import('./components/IoTDashboard'));
const CommerceHub = lazy(() => import('./components/CommerceHub'));
const ProfitabilityPage = lazy(() => import('./pages/Profitability'));

/**
 * Detect a Supabase recovery URL synchronously — used as the initial state
 * so we never flash the login/dashboard during the brief window before the
 * PASSWORD_RECOVERY event fires. Supabase v2 uses either a `#...type=recovery`
 * hash fragment (implicit) or `?code=...&type=recovery` query string (PKCE).
 */
function isRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);
}

const LEGACY_APP_PATH = '/app';
const B2B_PORTAL_PATH = '/b2b';
const OLIVIA_OS_PATH = '/olivia';

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

function isB2BUrl(): boolean {
  return currentPath() === B2B_PORTAL_PATH;
}

function isOliviaUrl(): boolean {
  return currentPath() === OLIVIA_OS_PATH || currentPath() === LEGACY_APP_PATH;
}

function isPortalUrl(): boolean {
  return isB2BUrl() || isOliviaUrl();
}

function pathForTargetTab(targetTab: string): string {
  return targetTab === 'commerce' ? B2B_PORTAL_PATH : OLIVIA_OS_PATH;
}

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="h-10 w-10 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" />
      <div>
        <p className="text-sm font-semibold text-green-300">Kontrollerer innlogging</p>
        <p className="mt-1 text-xs text-slate-500">Henter lagret Supabase-økt...</p>
      </div>
    </div>
  </div>
);

const BIAR_DEFAULT_COORDS = { lat: 38.6294, lon: -0.7667 };
const BIAR_DEFAULT_LOCATION_NAME = 'Biar, Alicante';
const EMPTY_OLIVIA_PARCELS: Parcel[] = [];
const OLIVIA_FALLBACK_USER: UserProfile = {
  id: 'pending-profile',
  name: 'Doña Anna bruker',
  email: '',
  role: 'farmer',
  subscription: 'trial',
  subscriptionStart: '',
  avatar: '',
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(() => isRecoveryUrl());
  const [showPublicSite, setShowPublicSite] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !isPortalUrl() && !isRecoveryUrl();
  });
  const [language, setLanguage] = useState<Language>('no');
  const [showLogin, setShowLogin] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isPortalUrl() && !isRecoveryUrl();
  });
  const [loginDefaultMode, setLoginDefaultMode] = useState<'login' | 'register'>('login');
  const [postLoginTab, setPostLoginTab] = useState(() => isB2BUrl() ? 'commerce' : 'dashboard');
  const postLoginTabRef = useRef(isB2BUrl() ? 'commerce' : 'dashboard');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(isRecoveryUrl);

  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName] = useState(BIAR_DEFAULT_LOCATION_NAME);
  const [coords] = useState<{lat: number, lon: number}>(BIAR_DEFAULT_COORDS);

  const [user, setUser] = useState<UserProfile>(OLIVIA_FALLBACK_USER);
  const [parcels, setParcels] = useState<Parcel[]>(EMPTY_OLIVIA_PARCELS);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  const rememberPostLoginTab = (targetTab: string) => {
    postLoginTabRef.current = targetTab;
    setPostLoginTab(targetTab);
  };

  const resolveTargetTab = (targetTab: string, admin: boolean) => (
    targetTab === 'admin' && !admin ? 'dashboard' : targetTab
  );

  // Load Olivia farm data only after the user enters the app.
  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || showPublicSite) return;
    let cancelled = false;

    import('./services/db')
      .then(async ({ fetchParcels, migrateLocalStorageToSupabase }) => {
        const rows = await fetchParcels();
        if (!cancelled) {
          setParcels(rows);
          setSelectedParcel(rows[0] ?? null);
        }

        const { migrated, skipped } = await migrateLocalStorageToSupabase();
        if (!skipped) {
          console.info('[migration] uploaded to Supabase', migrated);
        }
      })
      .catch(err => console.warn('[migration] failed', err));

    return () => { cancelled = true; };
  }, [isAuthReady, isLoggedIn, showPublicSite]);

  const handleParcelSave = async (parcel: Parcel) => {
    const { upsertParcel } = await import('./services/db');
    await upsertParcel(parcel);
    setParcels(prev => {
      const index = prev.findIndex(p => p.id === parcel.id);
      if (index === -1) return [...prev, parcel];
      const next = [...prev];
      next[index] = parcel;
      return next;
    });
  };

  const handleParcelDelete = async (parcelId: string) => {
    const { deleteParcel } = await import('./services/db');
    await deleteParcel(parcelId);
    setParcels(prev => prev.filter(p => p.id !== parcelId));
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day' +
        '&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset' +
        '&timezone=auto'
      );
      const data = await res.json();
      setWeatherData(data);
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };

  // Settings (language only — no longer used for session storage)
  useEffect(() => {
    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language) setLanguage(parsed.language);
    }
  }, []);

  // Weather refresh whenever the selected parcel changes
  useEffect(() => {
    if (!showPublicSite && selectedParcel) {
      const lat = selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0];
      const lon = selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1];
      if (lat && lon) fetchWeather(lat, lon);
    }
  }, [selectedParcel, showPublicSite]);

  // Supabase auth: hydrate from stored session on load + subscribe to changes.
  useEffect(() => {
    let cancelled = false;
    const markAuthReady = () => {
      if (!cancelled) setIsAuthReady(true);
    };
    // Skip hydration if we're in the recovery flow — we don't want to land the
    // user on the dashboard before they've chosen a new password.
    if (!isRecoveryUrl()) {
      getCurrentSession().then(result => {
        if (cancelled || !result) return;
        setUser(result.user);
        setIsAdmin(result.isAdmin);
        setIsLoggedIn(true);
        setShowLogin(false);
        setActiveTab(resolveTargetTab(postLoginTabRef.current, result.isAdmin));
      }).catch(err => {
        console.warn('[auth] session hydration failed:', err);
      }).finally(markAuthReady);
    } else {
      markAuthReady();
    }
    // Single shared subscription for both sign-in/out and PASSWORD_RECOVERY —
    // see auth.ts for why this matters (gotrue lock contention).
    const unsubscribe = onAuthChange(
      result => {
        if (cancelled) return;
        setIsAuthReady(true);
        if (result) {
          setUser(result.user);
          setIsAdmin(result.isAdmin);
          setIsLoggedIn(true);
          setShowLogin(false);
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
          setUser(OLIVIA_FALLBACK_USER);
          setParcels(EMPTY_OLIVIA_PARCELS);
          setSelectedParcel(null);
        }
      },
      () => {
        if (cancelled) return;
        setIsAuthReady(true);
        setIsPasswordRecovery(true);
      },
    );
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (storedUser: StoredUser, admin: boolean) => {
    // The auth listener will set state too, but doing it here makes the
    // transition feel instant.
    setUser(storedUser);
    setIsAdmin(admin);
    setIsLoggedIn(true);
    setIsAuthReady(true);
    setActiveTab(resolveTargetTab(postLoginTabRef.current, admin));
    setShowLogin(false);
  };

  const handleLogout = async () => {
    await authSignOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setIsAuthReady(true);
    setUser(OLIVIA_FALLBACK_USER);
    setParcels(EMPTY_OLIVIA_PARCELS);
    setSelectedParcel(null);
    setActiveTab('dashboard');
    // Wipe any legacy localStorage session left over from the old flow
    localStorage.removeItem('olivia_session');
  };

  const updateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const settings = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
    localStorage.setItem('olivia_settings', JSON.stringify({ ...settings, language: newLang }));
  };

  const openLogin = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => {
    setShowPublicSite(false);
    const targetPath = pathForTargetTab(targetTab);
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    rememberPostLoginTab(targetTab);
    setLoginDefaultMode(mode);
    setShowLogin(true);
  };

  const openApp = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => {
    setShowPublicSite(false);
    const targetPath = pathForTargetTab(targetTab);
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    rememberPostLoginTab(targetTab);
    if (isLoggedIn) {
      setActiveTab(resolveTargetTab(targetTab, isAdmin));
      return;
    }
    if (!isAuthReady) {
      setLoginDefaultMode(mode);
      setShowLogin(true);
      return;
    }
    openLogin(mode, targetTab);
  };

  // Password-recovery takes priority over everything else: the user arrived
  // via the email link and needs to set a new password before anything else
  // matters (dashboard, login modal, etc).
  if (isPasswordRecovery) {
    return <ResetPasswordPage onDone={() => setIsPasswordRecovery(false)} />;
  }

  if (showPublicSite) {
    if (isPublicContentPath(window.location.pathname)) {
      return (
        <>
          <PublicContentPage onLogin={() => openApp('login', 'commerce')} onAdminLogin={() => openApp('login', 'dashboard')} />
          {showLogin && (
            <LoginModal defaultMode={loginDefaultMode} allowRegister={postLoginTabRef.current === 'commerce'} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />
          )}
        </>
      );
    }

    return (
      <>
        <LandingPage onLogin={() => openApp('login', 'commerce')} onAdminLogin={() => openApp('login', 'dashboard')} onRegister={() => openApp('register', 'commerce')} />
        {showLogin && (
          <LoginModal defaultMode={loginDefaultMode} allowRegister={postLoginTabRef.current === 'commerce'} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />
        )}
      </>
    );
  }

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (!isLoggedIn) {
    return (
      <>
        <LandingPage onLogin={() => openLogin('login', 'commerce')} onAdminLogin={() => openLogin('login', 'dashboard')} onRegister={() => openLogin('register', 'commerce')} />
        {showLogin && (
            <LoginModal defaultMode={loginDefaultMode} allowRegister={postLoginTabRef.current === 'commerce'} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />
        )}
      </>
    );
  }

  const parcelCoords = selectedParcel
    ? { lat: selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0] ?? BIAR_DEFAULT_COORDS.lat, lon: selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1] ?? BIAR_DEFAULT_COORDS.lon }
    : coords;

  const renderContent = () => {
    if (isAdmin && activeTab === 'admin') return <AdminDashboard />;

    switch (activeTab) {
      case 'dashboard': return <FarmOverview
        language={language}
        weatherData={weatherData}
        locationName={selectedParcel?.name || locationName}
        parcels={parcels}
        onNavigate={setActiveTab}
      />;
      case 'dashboard_classic': return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
      case 'consultant': return <FieldConsultantView />;
      case 'pruning': return <PruningAdvisorView />;
      case 'map': return <FarmMap parcels={parcels} onParcelSave={handleParcelSave} onParcelDelete={handleParcelDelete} language={language} />;
      case 'weather': return <WeatherView
        initialData={weatherData}
        initialLocationName={selectedParcel?.name || ''}
        initialCoords={parcelCoords}
        language={language}
        parcels={parcels}
        selectedParcel={selectedParcel}
        onParcelSelect={setSelectedParcel}
      />;
      case 'production': return <ProductionView parcels={parcels} language={language} />;
      case 'commerce': return <CommerceHub />;
      case 'economy': return <ProfitabilityPage language={language} parcels={parcels} />;
      case 'fleet': return <FleetView />;
      case 'irrigation': return <IrrigationView />;
      case 'tasks': return <TasksView parcels={parcels} />;
      case 'iot': return <IoTDashboard />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <FarmOverview
        language={language}
        weatherData={weatherData}
        locationName={selectedParcel?.name || locationName}
        parcels={parcels}
        onNavigate={setActiveTab}
      />;
    }
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b] p-8 text-slate-300">Laster Olivia OS...</div>}>
      <Layout
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        language={language}
      >
        <Suspense fallback={<div className="p-8 text-slate-400">Laster modul...</div>}>
          {renderContent()}
        </Suspense>
      </Layout>
    </Suspense>
  );
};

export default App;
