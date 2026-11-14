import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Radio,
  Search,
  Compass,
  MapPin,
  Flame,
  Waves,
  Building,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  HISTORICAL_INDIA_DISASTERS,
  fetchLiveIndiaDisasterRadar,
  type DisasterEventRecord,
} from '../../../services/indiaDisasterArchive';

interface DisasterHistoryArchiveViewProps {
  onSelectDisaster: (disaster: DisasterEventRecord) => void;
  activeDisasterId: string;
}

export default function DisasterHistoryArchiveView({
  onSelectDisaster,
  activeDisasterId,
}: DisasterHistoryArchiveViewProps) {
  // Mode: Historical vs Real-Time Live Radar
  const [mode, setMode] = useState<'historical' | 'live'>('historical');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Radar State
  const [liveEvents, setLiveEvents] = useState<DisasterEventRecord[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  const loadLiveRadar = async () => {
    setIsLoadingLive(true);
    try {
      const data = await fetchLiveIndiaDisasterRadar();
      setLiveEvents(data);
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    loadLiveRadar();
  }, []);

  // Filtered Historical List
  const filteredHistorical = useMemo(() => {
    return HISTORICAL_INDIA_DISASTERS.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Year filter
      if (selectedYear !== 'all') {
        const itemYear = item.startDate.split('-')[0];
        if (itemYear !== selectedYear) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesState = item.state.toLowerCase().includes(q);
        const matchesDistrict = item.district.toLowerCase().includes(q);
        const matchesSummary = item.summary.toLowerCase().includes(q);
        if (!matchesTitle && !matchesState && !matchesDistrict && !matchesSummary) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, selectedYear, searchQuery]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'flood':
        return <Waves size={14} color="#9eb89f" />;
      case 'cyclone':
        return <Flame size={14} color="#f97316" />;
      case 'landslide':
      case 'subsidence':
        return <Building size={14} color="#ffd166" />;
      case 'earthquake':
        return <ShieldCheck size={14} color="#ef4444" />;
      default:
        return <Compass size={14} color="#7ae582" />;
    }
  };

  return (
    <div className="aftermath-file-view">
      {/* Header & KPI Summary */}
      <div className="file-kpi-grid">
        <div className="file-kpi-card">
          <span className="file-kpi-label">HISTORICAL DISASTERS ARCHIVE</span>
          <div className="file-kpi-val" style={{ color: '#9eb89f' }}>
            {HISTORICAL_INDIA_DISASTERS.length} <small>Verified Events</small>
          </div>
          <span className="file-kpi-sub">5–10 Year Subcontinent Records (2018–2025)</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">LIVE INDIA RADAR FEEDS</span>
          <div className="file-kpi-val" style={{ color: '#ef4444' }}>
            {liveEvents.length} <small>Active Feeds</small>
          </div>
          <span className="file-kpi-sub">Polled Live from UN GDACS & USGS</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">SPACE SENSORS</span>
          <div className="file-kpi-val" style={{ color: '#7ae582' }}>
            NASA GIBS
          </div>
          <span className="file-kpi-sub">Daily Space Imagery & Esri High-Res</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">DATA FIDELITY</span>
          <div className="file-kpi-val" style={{ color: '#ffd166' }}>
            100% REAL
          </div>
          <span className="file-kpi-sub">Official GSI / CWC / IMD / GDACS Records</span>
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="file-action-bar">
        {/* Toggle Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className={`file-filter-btn ${mode === 'historical' ? 'active' : ''}`}
            onClick={() => setMode('historical')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <History size={13} />
            <span>Historical Archive (2018–2025)</span>
          </button>

          <button
            type="button"
            className={`file-filter-btn ${mode === 'live' ? 'active' : ''}`}
            onClick={() => setMode('live')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: mode === 'live' ? '#ef4444' : undefined,
              color: mode === 'live' ? '#ef4444' : undefined,
            }}
          >
            <Radio size={13} className="pulse-icon" />
            <span>Live Real-Time Radar ({liveEvents.length})</span>
          </button>
        </div>

        {/* Right Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {mode === 'live' && (
            <button
              type="button"
              className="file-filter-btn"
              onClick={loadLiveRadar}
              disabled={isLoadingLive}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={12} className={isLoadingLive ? 'animate-spin' : ''} />
              <span>{isLoadingLive ? 'Polling Feeds...' : 'Refresh Radar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* If Mode is Historical: Filter Strip */}
      {mode === 'historical' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'rgba(8, 12, 24, 0.5)',
            border: '1px solid rgba(158, 184, 159, 0.1)',
            borderRadius: 12,
            padding: '8px 14px',
            flexWrap: 'wrap',
          }}
        >
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>Type:</span>
            {['all', 'flood', 'cyclone', 'landslide', 'subsidence', 'flash_flood'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`file-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ fontSize: 10.5, padding: '3px 9px' }}
              >
                {cat === 'all'
                  ? 'All Types'
                  : cat === 'flood'
                  ? '🌊 Floods'
                  : cat === 'cyclone'
                  ? '🌀 Cyclones'
                  : cat === 'landslide'
                  ? '🏔️ Landslides'
                  : cat === 'subsidence'
                  ? '🏚️ Subsidence'
                  : '⚡ Flash Flood'}
              </button>
            ))}
          </div>

          {/* Year & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                background: 'rgba(6, 10, 20, 0.7)',
                border: '1px solid rgba(158, 184, 159, 0.25)',
                color: '#fff',
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 8,
                outline: 'none',
              }}
            >
              <option value="all">All Years (2018–2025)</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2019">2019</option>
              <option value="2018">2018</option>
            </select>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, color: '#64748b' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search state, disaster, district..."
                style={{
                  background: 'rgba(6, 10, 20, 0.7)',
                  border: '1px solid rgba(158, 184, 159, 0.2)',
                  borderRadius: 8,
                  padding: '4px 10px 4px 26px',
                  color: '#fff',
                  fontSize: 11,
                  width: 200,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="file-content-scrollable">
        {mode === 'historical' ? (
          <div className="damage-building-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
            {filteredHistorical.map((disaster) => {
              const isActive = activeDisasterId === disaster.id;
              return (
                <div
                  key={disaster.id}
                  className={`damage-building-card ${isActive ? 'is-selected' : ''}`}
                  style={{
                    borderColor: isActive ? '#a7c9ab' : undefined,
                    background: isActive ? 'rgba(13, 26, 56, 0.85)' : undefined,
                  }}
                >
                  <div className="building-card-top">
                    <div className="building-card-title-group">
                      {getCategoryIcon(disaster.category)}
                      <div>
                        <h4 className="building-name" style={{ fontSize: 14 }}>
                          {disaster.title}
                        </h4>
                        <span className="building-type">
                          {disaster.state.toUpperCase()} • {disaster.district.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`damage-pill ${
                        disaster.severityLevel === 5 ? 'damage-pill--critical' : 'damage-pill--severe'
                      }`}
                    >
                      LEVEL {disaster.severityLevel}
                    </span>
                  </div>

                  <p className="building-notes" style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                    {disaster.summary}
                  </p>

                  <div className="building-metrics-grid">
                    <div className="building-submetric">
                      <span className="submetric-lbl">Impact Extent</span>
                      <strong className="submetric-val" style={{ color: '#9eb89f' }}>
                        {disaster.impactedAreaSqKm} km²
                      </strong>
                    </div>

                    <div className="building-submetric">
                      <span className="submetric-lbl">Fatalities</span>
                      <strong className="submetric-val" style={{ color: '#ef4444' }}>
                        {disaster.casualties > 0 ? `${disaster.casualties} Deaths` : 'Zero Fatalities'}
                      </strong>
                    </div>

                    <div className="building-submetric">
                      <span className="submetric-lbl">Displaced Citizens</span>
                      <strong className="submetric-val" style={{ color: '#ffd166' }}>
                        {disaster.displacedPopulation.toLocaleString('en-IN')} Evacuated
                      </strong>
                    </div>

                    <div className="building-submetric">
                      <span className="submetric-lbl">Est. Economic Loss</span>
                      <strong className="submetric-val">
                        ₹{disaster.estimatedLossCr} Crores
                      </strong>
                    </div>
                  </div>

                  {/* Satellite Comparison Dates */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(6, 10, 20, 0.4)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--mono-family)',
                    }}
                  >
                    <span>Pre-Date: <strong style={{ color: '#7ae582' }}>{disaster.preSatelliteDate}</strong></span>
                    <span>&harr;</span>
                    <span>Post-Date: <strong style={{ color: '#ef4444' }}>{disaster.postSatelliteDate}</strong></span>
                    <span style={{ color: '#a7c9ab' }}>NASA GIBS</span>
                  </div>

                  {/* Footer & Action */}
                  <div className="building-card-footer">
                    <span className="building-coords">
                      <MapPin size={11} /> [{disaster.coordinates[0].toFixed(3)}, {disaster.coordinates[1].toFixed(3)}]
                    </span>

                    <button
                      type="button"
                      className="file-primary-action-btn"
                      onClick={() => onSelectDisaster(disaster)}
                      style={{
                        padding: '6px 14px',
                        background: isActive ? '#a7c9ab' : 'linear-gradient(135deg, #7a9c81 0%, #a7c9ab 100%)',
                        color: '#070d19',
                        fontWeight: 800,
                      }}
                    >
                      <Compass size={13} />
                      <span>{isActive ? 'CURRENTLY ACTIVE' : 'Load Disaster & Satellite Map'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Live Radar Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Radio size={20} color="#ef4444" className="pulse-icon" />
              <div>
                <strong style={{ fontSize: 13, color: '#ffffff' }}>
                  AUTONOMOUS REAL-TIME INDIA DISASTER RADAR
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#cbd5e1' }}>
                  Live API telemetry from UN GDACS and USGS Seismographic Network for India & surrounding maritime boundaries.
                </p>
              </div>
            </div>

            {liveEvents.length === 0 ? (
              <div
                style={{
                  background: 'rgba(13, 19, 36, 0.6)',
                  border: '1px dashed rgba(158, 184, 159, 0.2)',
                  borderRadius: 14,
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                {isLoadingLive ? (
                  <div>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                    <p>Polling real-time feeds from UN GDACS and USGS...</p>
                  </div>
                ) : (
                  <div>
                    <ShieldCheck size={32} color="#7ae582" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>
                      Subcontinent Corridors Nominal
                    </p>
                    <p style={{ fontSize: 11 }}>
                      No active Level-4/5 natural disaster alerts currently registered by GDACS for India.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="damage-building-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
                {liveEvents.map((event) => (
                  <div
                    key={event.id}
                    className="damage-building-card"
                    style={{
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      background: 'rgba(239, 68, 68, 0.04)',
                    }}
                  >
                    <div className="building-card-top">
                      <div className="building-card-title-group">
                        <Radio size={16} color="#ef4444" />
                        <div>
                          <h4 className="building-name">{event.title}</h4>
                          <span className="building-type">{event.dataSource}</span>
                        </div>
                      </div>
                      <span className="damage-pill damage-pill--critical">LIVE RADAR</span>
                    </div>

                    <p className="building-notes">{event.summary}</p>

                    <div className="building-metrics-grid">
                      <div className="building-submetric">
                        <span className="submetric-lbl">Coordinates</span>
                        <strong className="submetric-val">
                          [{event.coordinates[0].toFixed(2)}, {event.coordinates[1].toFixed(2)}]
                        </strong>
                      </div>
                      <div className="building-submetric">
                        <span className="submetric-lbl">Registered Date</span>
                        <strong className="submetric-val">{event.startDate}</strong>
                      </div>
                      <div className="building-submetric">
                        <span className="submetric-lbl">Severity Tier</span>
                        <strong className="submetric-val" style={{ color: '#ef4444' }}>
                          Level {event.severityLevel} Alert
                        </strong>
                      </div>
                      <div className="building-submetric">
                        <span className="submetric-lbl">Pipeline Status</span>
                        <strong className="submetric-val" style={{ color: '#7ae582' }}>
                          READY
                        </strong>
                      </div>
                    </div>

                    <div className="building-card-footer">
                      <span className="building-coords">
                        <Clock size={11} /> Real-time Telemetry
                      </span>
                      <button
                        type="button"
                        className="file-primary-action-btn"
                        onClick={() => onSelectDisaster(event)}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                        }}
                      >
                        <Compass size={13} />
                        <span>Load Live Event On Map</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
