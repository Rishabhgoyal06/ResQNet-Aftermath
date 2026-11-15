import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { kvStorage } from './kvStorage';

const CONFIG_URL_KEY = 'resqnet_supabase_url';
const CONFIG_ANON_KEY = 'resqnet_supabase_anon';

const DEFAULT_SUPABASE_URL = 'https://kfsjwzsxlaabnixpgoke.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc2p3enN4bGFhYm5peHBnb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODIzMTAsImV4cCI6MjA5MTQ1ODMxMH0.ebJMo6fEGKYEqdaAixbNwcYz6V8dZBBWAHs-ta2_LvA';

let supabaseClient: SupabaseClient | null = null;
let activeConfig: { url: string; anon: string } | null = null;

export function getSupabaseEnvConfig() {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const extraUrl = extra?.supabaseUrl ?? extra?.EXPO_PUBLIC_SUPABASE_URL;
  const extraAnon = extra?.supabaseAnonKey ?? extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const url = (envUrl || extraUrl || DEFAULT_SUPABASE_URL).trim();
  const anon = (envAnon || extraAnon || DEFAULT_SUPABASE_ANON_KEY).trim();

  return { url, anon };
}

export async function getSupabaseConfig(): Promise<{ url: string; anon: string }> {
  const storedUrl = await kvStorage.getItem(CONFIG_URL_KEY);
  const storedAnon = await kvStorage.getItem(CONFIG_ANON_KEY);
  if (storedUrl && storedAnon) {
    return { url: storedUrl.trim(), anon: storedAnon.trim() };
  }

  return getSupabaseEnvConfig();
}

export async function setSupabaseConfig(url: string, anon: string): Promise<void> {
  await kvStorage.setItem(CONFIG_URL_KEY, url.trim());
  await kvStorage.setItem(CONFIG_ANON_KEY, anon.trim());
  supabaseClient = null;
  activeConfig = null;
}

export async function clearSupabaseConfig(): Promise<void> {
  await kvStorage.removeItem(CONFIG_URL_KEY);
  await kvStorage.removeItem(CONFIG_ANON_KEY);
  supabaseClient = null;
  activeConfig = null;
}

export async function isSupabaseConfigured(): Promise<boolean> {
  const config = await getSupabaseConfig();
  return Boolean(config && config.url && config.anon);
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = await getSupabaseConfig();
  if (!config || !config.url || !config.anon) return null;

  if (!supabaseClient || !activeConfig || activeConfig.url !== config.url || activeConfig.anon !== config.anon) {
    supabaseClient = createClient(config.url, config.anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    activeConfig = config;
  }

  return supabaseClient;
}
