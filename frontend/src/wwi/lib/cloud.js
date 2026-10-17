// Accounts + cloud copy, using Supabase (free tier). Only active when the
// site is built with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The anon
// key is public by design; what keeps data private is the row level
// security in supabase/setup.sql (each person can only touch their own rows).
// Without those settings the app runs fully on the device, with no accounts.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(URL && KEY);
export const TABLE = 'wwi_docs';

export const supabase = cloudEnabled
  ? createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'wwi-auth' },
  })
  : null;

const redirect = () => window.location.origin + window.location.pathname;

// Map Supabase errors to messages the person can act on.
export function authErrorKey(error) {
  if (!error) return null;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  if (!navigator.onLine || msg.includes('failed to fetch') || msg.includes('network')) return 'authOffline';
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'authBadLogin';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'authExists';
  if (code === 'weak_password' || msg.includes('password should')) return 'authWeakPassword';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'authNotConfirmed';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error.status === 429) return 'authRateLimit';
  if (code === 'validation_failed' || msg.includes('invalid email') || code === 'email_address_invalid') return 'authBadEmail';
  return 'authGeneric';
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect() } });
  // If the project requires email confirmation, there's a user but no session yet.
  return { session: data?.session || null, user: data?.user || null, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data?.session || null, error };
}

export async function signOut() {
  try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* local session is cleared anyway */ }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() });
  return { error };
}

export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data?.subscription?.unsubscribe();
}

// ── Data ────────────────────────────────────────────────────────────────────
// Everything is stored as small JSON documents: one per item, plus
// "__settings" and "__stickers". updated_at is set by the database.
export async function pullSince(since) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(TABLE).select('id,data,updated_at').order('updated_at', { ascending: true }).range(from, from + PAGE - 1);
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function pushDocs(userId, docs) {
  if (!docs.length) return;
  const CHUNK = 200;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = docs.slice(i, i + CHUNK).map((d) => ({ user_id: userId, id: d.id, data: d.data }));
    const { error } = await supabase.from(TABLE).upsert(batch, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}
