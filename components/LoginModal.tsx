
import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, Sprout, Loader2, CheckCircle2, ArrowLeft, Building2 } from 'lucide-react';
import { signInWithPassword, signUpWithPassword, sendPasswordReset, AuthResult } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabaseClient';
import type { UserProfile } from '../types';

// Re-exported for legacy callers (App.tsx). Kept identical to the old shape so
// nothing else needs to change.
export type StoredUser = UserProfile;

interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: StoredUser, isAdmin: boolean) => void;
  defaultMode?: 'login' | 'register';
  allowRegister?: boolean;
  portalContext?: 'b2b' | 'olivia';
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, defaultMode = 'login', allowRegister = true, portalContext = 'olivia' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(defaultMode === 'register' && !allowRegister ? 'login' : defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const isB2BPortal = portalContext === 'b2b';
  const portalName = isB2BPortal ? 'Doña Anna B2B' : 'Olivia OS';
  const portalIntro = isB2BPortal
    ? 'Portal for restauranter, butikker og distributører.'
    : 'Styringsverktøy for gården, produksjon og parseller.';
  const accentButtonClass = isB2BPortal
    ? 'bg-[#d4af37] text-black hover:bg-white'
    : 'bg-green-500 text-black hover:bg-green-400';
  const accentTextClass = isB2BPortal ? 'text-[#d4af37]' : 'text-green-400';
  const accentFocusClass = isB2BPortal ? 'focus:border-[#d4af37]/70' : 'focus:border-green-500/50';
  const activeTabClass = isB2BPortal ? 'bg-[#d4af37] text-black' : 'bg-green-500 text-black';
  const submitText = loading
    ? (mode === 'login' ? 'Logger inn...' : mode === 'register' ? 'Oppretter konto...' : 'Sender e-post...')
    : (
      mode === 'login'
        ? `Logg inn i ${portalName}`
        : mode === 'register'
          ? 'Opprett B2B-konto'
          : 'Send tilbakestillingslenke'
    );

  const handleLogin = async () => {
    setError(''); setInfo('');
    if (!email || !password) { setError('Fyll inn e-post og passord.'); return; }
    setLoading(true);
    try {
      const result: AuthResult = await signInWithPassword(email.trim(), password);
      onLogin(result.user, result.isAdmin);
    } catch (e: any) {
      // Always log the raw error — makes it easy to diagnose from DevTools
      // even when the UI shows the translated Norwegian text.
      console.error('[Login] signInWithPassword failed:', e);
      setError(e?.message || 'Innlogging feilet.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(''); setInfo('');
    if (!name.trim()) { setError('Skriv inn ditt navn.'); return; }
    if (!email || !email.includes('@')) { setError('Ugyldig e-postadresse.'); return; }
    if (password.length < 6) { setError('Passordet må være minst 6 tegn.'); return; }
    setLoading(true);
    try {
      const result = await signUpWithPassword(email.trim(), password, name.trim());
      onLogin(result.user, result.isAdmin);
    } catch (e: any) {
      console.error('[Login] signUpWithPassword failed:', e);
      setError(e?.message || 'Kontoen kunne ikke opprettes.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(''); setInfo('');
    if (!email || !email.includes('@')) { setError('Ugyldig e-postadresse.'); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setInfo('Hvis en konto finnes for denne e-posten, har vi sendt en lenke for å tilbakestille passordet. Sjekk innboks og spam-mappe.');
    } catch (e: any) {
      console.error('[Login] sendPasswordReset failed:', e);
      setError(e?.message || 'Kunne ikke sende e-post.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    if (mode === 'login') handleLogin();
    else if (mode === 'register') handleRegister();
    else handleReset();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div data-testid="login-modal" className="bg-[#0f0f10] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-md relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isB2BPortal ? 'bg-[#d4af37]' : 'bg-green-500'}`}>
            {isB2BPortal ? <Building2 size={20} className="text-black" /> : <Sprout size={20} className="text-black" />}
          </div>
          <div>
            <h1 data-testid="login-portal-heading" className="text-xl font-bold text-white">
              {isB2BPortal ? 'Doña Anna ' : 'Olivia '}
              <span className={accentTextClass}>{isB2BPortal ? 'B2B' : 'OS'}</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">{portalIntro}</p>
          </div>
        </div>

        {/* Config missing banner (surfaces the real cause of "spinner hangs forever") */}
        {!isSupabaseConfigured && (
          <div className="flex items-start gap-2 text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-6">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pålogging er ikke konfigurert.</p>
              <p className="opacity-80 mt-0.5">Administrator må sette <code>VITE_SUPABASE_URL</code> og <code>VITE_SUPABASE_ANON_KEY</code> på Vercel og re-deploye uten build-cache.</p>
            </div>
          </div>
        )}

        {/* Tab switch (hidden in reset mode so it doesn't steal focus) */}
        {mode !== 'reset' && allowRegister && (
          <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-8">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? activeTabClass : 'text-slate-400 hover:text-white'}`}
            >
              Logg inn
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setInfo(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'register' ? activeTabClass : 'text-slate-400 hover:text-white'}`}
            >
              Opprett konto
            </button>
          </div>
        )}

        {mode === 'reset' && (
          <div className="mb-6">
            <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold">
              <ArrowLeft size={14} /> Tilbake til innlogging
            </button>
            <h2 className="text-lg font-bold text-white mt-4">Tilbakestill passord</h2>
            <p className="text-slate-500 text-sm mt-1">Fyll inn e-posten din, så sender vi en lenke for å velge nytt passord.</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Ditt navn"
                className={`w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-12 pr-5 text-white placeholder:text-slate-600 focus:outline-none ${accentFocusClass}`}
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="email"
              placeholder="E-post"
              className={`w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-12 pr-5 text-white placeholder:text-slate-600 focus:outline-none ${accentFocusClass}`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Passord (min. 6 tegn)' : 'Passord'}
                className={`w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-12 pr-12 text-white placeholder:text-slate-600 focus:outline-none ${accentFocusClass}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); setInfo(''); }}
                className={`text-xs font-bold text-slate-400 transition-colors ${isB2BPortal ? 'hover:text-[#d4af37]' : 'hover:text-green-400'}`}
                disabled={loading}
              >
                Glemt passord?
              </button>
            </div>
          )}

          {info && (
            <div className="flex items-start gap-2 text-green-300 text-sm bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${accentButtonClass}`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {submitText}
          </button>
        </form>

        {mode === 'login' && allowRegister && (
          <p className="text-center text-slate-500 text-sm mt-6">
            Har du ikke konto?{' '}
            <button onClick={() => { setMode('register'); setError(''); setInfo(''); }} className={`font-bold ${isB2BPortal ? 'text-[#d4af37] hover:text-white' : 'text-green-400 hover:text-green-300'}`}>
              Registrer deg
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
