import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { SEED_PROCESSED_REPORTS } from '../services/seedFallbackData';
import type { ProcessedSOSReport } from '@resqnet/shared-types';

export function useProcessedSOS() {
  const [reports, setReports] = useState<ProcessedSOSReport[]>(SEED_PROCESSED_REPORTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('sos_reports_processed')
        .select('*')
        .order('created_at', { ascending: false });

      if (!fetchError && data && data.length > 0) {
        setError(null);
        setReports(data as ProcessedSOSReport[]);
      }
    } catch (err: any) {
      console.warn('Using seed processed reports fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('sos-processed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_reports_processed' },
        (payload) => {
          setReports((prev) => [payload.new as ProcessedSOSReport, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_reports_processed' },
        (payload) => {
          setReports((prev) =>
            prev.map((r) => (r.id === (payload.new as ProcessedSOSReport).id ? (payload.new as ProcessedSOSReport) : r))
          );
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
