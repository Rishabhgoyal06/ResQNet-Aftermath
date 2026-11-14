import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'resqnet_supabase_url';
const STORAGE_ANON_KEY = 'resqnet_supabase_anon';

const FALLBACK_URL = 'https://kfsjwzsxlaabnixpgoke.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc2p3enN4bGFhYm5peHBnb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODIzMTAsImV4cCI6MjA5MTQ1ODMxMH0.ebJMo6fEGKYEqdaAixbNwcYz6V8dZBBWAHs-ta2_LvA';

function getStoredConfig() {
  if (typeof window === 'undefined') {
    return { url: undefined, anon: undefined };
  }
  const u = window.localStorage.getItem(STORAGE_URL_KEY);
  const a = window.localStorage.getItem(STORAGE_ANON_KEY);
  return {
    url: u && u.trim() ? u.trim() : undefined,
    anon: a && a.trim() ? a.trim() : undefined,
  };
}

const stored = getStoredConfig();

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  stored.url ||
  FALLBACK_URL;

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  stored.anon ||
  FALLBACK_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          apikey: SUPABASE_ANON_KEY,
        },
      },
    })
  : null;

export function saveSupabaseConfig(url: string, anon: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_URL_KEY, url.trim());
  window.localStorage.setItem(STORAGE_ANON_KEY, anon.trim());
  window.location.reload();
}

export function clearSupabaseConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_URL_KEY);
  window.localStorage.removeItem(STORAGE_ANON_KEY);
  window.location.reload();
}
