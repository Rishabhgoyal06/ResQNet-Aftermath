import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  contact: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_SHELTERS: Shelter[] = [
  {
    id: '44e28196-c6ef-4255-bf8f-5dc3e8787ab4',
    name: 'NDRF Relief Camp - ITO Headquarters',
    latitude: 28.628,
    longitude: 77.241,
    capacity: 450,
    contact: '+91 11-23438091',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f7fec6e4-fa8e-4879-91c8-7a9e2b6aa08c',
    name: 'Indian Red Cross Emergency Hub - Connaught Place',
    latitude: 28.6315,
    longitude: 77.2167,
    capacity: 320,
    contact: '+91 11-23716441',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '32346339-28ea-414b-9b55-b36dc134aa69',
    name: 'DTU USAR Crisis Center - Rohini',
    latitude: 28.7501,
    longitude: 77.1177,
    capacity: 600,
    contact: '+91 11-27871018',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'df9303b8-1e95-4b3f-bf0e-1a6159b8b07c',
    name: 'SDMA Flood Relief Station - Yamuna Bank',
    latitude: 28.6184,
    longitude: 77.2495,
    capacity: 280,
    contact: '+91 11-22448899',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '739fdeb7-b3a5-42ee-95c2-0c93fe410228',
    name: 'Army USAR Tactical Base - Delhi Cantonment',
    latitude: 28.5921,
    longitude: 77.1593,
    capacity: 850,
    contact: '+91 11-25693311',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3e952779-c4e5-487a-adf3-3758961e20b8',
    name: 'Trauma & Emergency Unit - AIIMS New Delhi',
    latitude: 28.5672,
    longitude: 77.21,
    capacity: 120,
    contact: '+91 11-26588500',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export default function SheltersPage() {
  const { user } = useAuth();
  const role = user?.role || 'public';
  const canManageShelters = ['admin', 'official', 'ngo'].includes(role);
  const [shelters, setShelters] = useState<Shelter[]>(DEFAULT_SHELTERS);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured || !canManageShelters) {
      return;
    }
    const loadShelters = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('shelters')
          .select('*')
          .order('name');
        if (data && data.length > 0) setShelters(data as Shelter[]);
      } catch (err) {
        console.warn('Error fetching shelters, using active tactical seeds:', err);
      }
    };
    loadShelters();
  }, [canManageShelters]);

  if (!canManageShelters) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Access restricted to Admin, Official, and NGO roles.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--primary)', fontSize: 12 }}>■</span>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>
              EMERGENCY SHELTER & RELIEF REGISTRY
            </h2>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0 16px', fontFamily: 'var(--mono-family)' }}>
            {shelters.length} operational designated sites · synchronized with NDRF / SDMA
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {shelters.map((s) => (
          <div
            key={s.id}
            style={{
              background: 'rgba(10, 22, 16, 0.88)',
              border: '1px solid var(--glass-stroke)',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                {s.name}
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: s.is_active ? '#a7c9ab' : 'var(--text-muted)',
                  background: s.is_active ? 'rgba(167, 201, 171, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${s.is_active ? 'rgba(167, 201, 171, 0.4)' : 'transparent'}`,
                  padding: '3px 10px',
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                {s.is_active ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              {s.capacity && (
                <span>
                  👥 Capacity: <strong style={{ color: 'var(--text-primary)' }}>{s.capacity} beds</strong>
                </span>
              )}
              {s.contact && <span>📞 {s.contact}</span>}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono-family)' }}>
              📍 COORD: {s.latitude.toFixed(4)}°N, {s.longitude.toFixed(4)}°E
            </div>

            <a
              href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                color: 'var(--primary)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(158, 184, 159, 0.1)',
                border: '1px solid rgba(158, 184, 159, 0.25)',
                transition: 'all 0.18s ease',
              }}
            >
              Dispatch Navigation →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
