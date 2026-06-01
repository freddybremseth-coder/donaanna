import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const LEGACY_SUPABASE_REF = 'jvcdkclfcaccogmvvkrs';
const REQUIRED_SUPABASE_REF = 'ereapsfcsqtdmzosgnnn';
const oliviaSchema = ((import.meta.env.VITE_OLIVIA_SUPABASE_SCHEMA as string | undefined) || 'olivia').trim() || 'olivia';
const fallbackSupabaseUrl = 'http://127.0.0.1:54321';
const fallbackSupabaseAnonKey = 'public-site-placeholder-key';

function hasProjectRef(url: string | undefined, ref: string) {
  return Boolean(url && url.includes(ref));
}

export const supabaseEnvStatus = {
  urlConfigured: Boolean(supabaseUrl && supabaseUrl.startsWith('http')),
  anonKeyConfigured: Boolean(supabaseAnonKey),
  oliviaSchema,
  legacyProjectDetected: hasProjectRef(supabaseUrl, LEGACY_SUPABASE_REF),
  expectedProjectDetected: hasProjectRef(supabaseUrl, REQUIRED_SUPABASE_REF),
};

/**
 * True when both env vars are present at build time. If false, the UI shows
 * a clear banner instead of letting fetch calls hang forever against an
 * undefined URL (the common cause of "spinner never stops" on login).
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseEnvStatus.urlConfigured &&
  supabaseEnvStatus.anonKeyConfigured &&
  !supabaseEnvStatus.legacyProjectDetected
);

if (!isSupabaseConfigured) {
  // Emit a single, very visible console error so the bug is easy to diagnose
  // from DevTools even when the UI banner is missed.
  // eslint-disable-next-line no-console
  console.warn(
    supabaseEnvStatus.legacyProjectDetected
      ? '[Olivia] Gammel gratis Supabase er blokkert. Sett VITE_SUPABASE_URL til RealtyFlow-prosjektet og VITE_OLIVIA_SUPABASE_SCHEMA=olivia.'
      : '[Olivia] Supabase er ikke konfigurert. Sett VITE_SUPABASE_URL og ' +
        'VITE_SUPABASE_ANON_KEY i Vercel (Environment Variables) og re-deploy ' +
        'uten build-cache.'
  );
}

/**
 * In-memory FIFO lock used to replace gotrue's default `navigator.locks`
 * implementation. The default occasionally hangs on signInWithPassword for
 * 15+ seconds when:
 *   - A previous tab crashed mid-refresh and held the lock
 *   - React StrictMode double-mounted the auth listener
 *   - Safari/iOS suspended a navigator.locks holder
 *
 * The "Forcefully acquiring the lock to recover" warning means the SDK
 * detected the orphan and tried to recover, but in practice the recovery
 * often races against the actual sign-in call and the user sees a timeout.
 *
 * Trade-off: this lock is per-tab only, so two tabs can issue concurrent
 * token refreshes. Worst case one refresh fails and is retried — far better
 * than not being able to log in.
 */
const memLocks = new Map<string, Promise<unknown>>();
async function inMemoryLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const prev = (memLocks.get(name) ?? Promise.resolve()) as Promise<unknown>;
  let release: () => void = () => {};
  const next = new Promise<void>((r) => { release = r; });
  const queued = prev.catch(() => undefined).then(() => next);
  memLocks.set(name, queued);
  try { await prev; } catch { /* ignore */ }
  try {
    return await fn();
  } finally {
    release();
    // Clean up so the map doesn't grow unbounded.
    if (memLocks.get(name) === queued) memLocks.delete(name);
  }
}

// Supabase v2 throws during module load if the URL is empty. The public
// Doña Anna site must still render before Supabase is configured, so we create
// a harmless placeholder client and guard real calls with isSupabaseConfigured.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : fallbackSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey! : fallbackSupabaseAnonKey,
  {
    auth: {
      // Use the in-memory lock above instead of navigator.locks. See the
      // comment on `inMemoryLock` for why.
      lock: inMemoryLock,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

// Use the same Supabase client for Olivia schema calls. Creating a second
// `createClient()` instance creates a second GoTrue auth owner on the same
// page, which can contend for the same stored session and make login appear
// slow or inconsistent.
export const supabaseOlivia = supabase.schema(oliviaSchema);
