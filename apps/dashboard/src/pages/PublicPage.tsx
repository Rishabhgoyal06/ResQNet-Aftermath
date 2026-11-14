import { useState, useEffect, useCallback } from 'react';
import HeatmapView from '../components/map/HeatmapView';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { SEED_SOS_REPORTS } from '../services/seedFallbackData';
import type { SOSReport } from '@resqnet/shared-types';

type PublicSOSReport = Pick<
  SOSReport,
  'id' | 'created_at' | 'latitude' | 'longitude' | 'category' | 'severity' | 'message' | 'status'
>;

interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  contact: string | null;
}

const PUBLIC_SEED_SHELTERS: Shelter[] = [
  {
    id: '1',
    name: 'NDRF Relief Hub - Central Delhi',
    latitude: 28.628,
    longitude: 77.241,
    capacity: 450,
    contact: '+91 11-23438091',
  },
  {
    id: '2',
    name: 'Red Cross Emergency Shelter - Connaught Place',
    latitude: 28.6315,
    longitude: 77.2167,
    capacity: 320,
    contact: '+91 11-23716441',
  },
  {
    id: '3',
    name: 'DTU Crisis Response Center - Rohini',
    latitude: 28.7501,
    longitude: 77.1177,
    capacity: 600,
    contact: '+91 11-27871018',
  },
  {
    id: '4',
    name: 'Army USAR Camp - Delhi Cantonment',
    latitude: 28.5921,
    longitude: 77.1593,
    capacity: 850,
    contact: '+91 11-25693311',
  },
];

export default function PublicPage() {
  const [reports, setReports] = useState<PublicSOSReport[]>(
    SEED_SOS_REPORTS.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      latitude: r.latitude,
      longitude: r.longitude,
      category: r.category,
      severity: r.severity,
      message: r.message,
      status: r.status,
    }))
  );
  const [shelters, setShelters] = useState<Shelter[]>(PUBLIC_SEED_SHELTERS);
  const [view, setView] = useState<'heatmap' | 'shelters' | 'alerts'>('heatmap');

  const fetchReports = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('sos_reports')
        .select('id, created_at, latitude, longitude, category, severity, message, status')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) setReports(data as PublicSOSReport[]);
    } catch {
      // Keep seeds on error
    }
  }, []);

  const fetchShelters = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('shelters')
        .select('*')
        .eq('is_active', true);
      if (data && data.length > 0) setShelters(data);
    } catch {
      // Keep seeds on error
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchShelters();

    const interval = setInterval(fetchReports, 15000);
    return () => clearInterval(interval);
  }, [fetchReports, fetchShelters]);

  const criticalCount = reports.filter((r) => r.severity >= 4 && r.status !== 'resolved').length;

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#08130d', color: '#e5ebe5' }}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(8, 19, 13, 0.96)',
          borderBottom: '1px solid rgba(158, 184, 159, 0.25)',
          backdropFilter: 'blur(14px)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#a7c9ab', fontSize: 16 }}>◆</span>
          <span style={{ color: '#ffffff', fontSize: 15, fontWeight: 800, letterSpacing: '0.15em' }}>RESQNET</span>
          <span
            style={{
              color: '#9eb89f',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.18em',
              background: 'rgba(158, 184, 159, 0.12)',
              border: '1px solid rgba(158, 184, 159, 0.3)',
              padding: '2px 8px',
              borderRadius: 999,
              marginLeft: 6,
            }}
          >
            PUBLIC CIVILIAN ADVISORY
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['heatmap', 'shelters', 'alerts'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                background: view === v ? 'rgba(158, 184, 159, 0.22)' : 'transparent',
                border: view === v ? '1px solid #a7c9ab' : '1px solid rgba(158, 184, 159, 0.25)',
                color: view === v ? '#ffffff' : '#9eb89f',
                padding: '6px 14px',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.1em',
                borderRadius: 999,
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                transition: 'all 0.18s ease',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {criticalCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#ff8a8a',
            }}
          >
            <span>●</span>
            {criticalCount} CRITICAL INCIDENTS MONITORED
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {view === 'heatmap' && <HeatmapView reports={reports} />}

        {view === 'shelters' && (
          <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
            <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#9eb89f', marginBottom: 18, textTransform: 'uppercase' }}>
              DESIGNATED EMERGENCY SHELTERS & RELIEF CENTERS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {shelters.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: 'rgba(10, 22, 16, 0.88)',
                    border: '1px solid rgba(158, 184, 159, 0.25)',
                    borderRadius: 14,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>🏠 {s.name}</div>
                  <div style={{ fontSize: 11, color: '#9eb89f', fontFamily: 'monospace' }}>
                    {s.capacity && <span>Capacity: {s.capacity} beds · </span>}
                    {s.contact && <span>📞 {s.contact}</span>}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 11,
                      color: '#a7c9ab',
                      fontWeight: 700,
                      textDecoration: 'none',
                      marginTop: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    📍 Navigate Route →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'alerts' && (
          <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
            <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#9eb89f', marginBottom: 18, textTransform: 'uppercase' }}>
              HIGH PRIORITY TACTICAL ADVISORIES
            </h2>
            {reports
              .filter((r) => r.severity >= 4)
              .slice(0, 20)
              .map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: r.severity === 5 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(10, 22, 16, 0.85)',
                    border: `1px solid ${r.severity === 5 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(158, 184, 159, 0.25)'}`,
                    borderRadius: 12,
                    padding: '14px 18px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{r.category}</span>
                    <span style={{ fontSize: 10, color: '#9eb89f', fontFamily: 'monospace' }}>
                      {new Date(r.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {r.message && <p style={{ fontSize: 12, color: '#c8d6c9', margin: 0, lineHeight: 1.5 }}>{r.message}</p>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
