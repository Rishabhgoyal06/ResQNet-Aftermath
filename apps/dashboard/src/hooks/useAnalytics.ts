import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { SEED_DISASTER_ANALYTICS } from '../services/seedFallbackData';
import type { DisasterAnalytics } from '@resqnet/shared-types';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<DisasterAnalytics[]>(SEED_DISASTER_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('disaster_analytics')
        .select('*')
        .order('date_bucket', { ascending: false })
        .order('total_incidents', { ascending: false });

      if (!fetchError && data && data.length > 0) {
        setError(null);
        setAnalytics(data as DisasterAnalytics[]);
      }
    } catch (err: any) {
      console.warn('Using seed disaster analytics fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'disaster_analytics' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'disaster_analytics' },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
}
