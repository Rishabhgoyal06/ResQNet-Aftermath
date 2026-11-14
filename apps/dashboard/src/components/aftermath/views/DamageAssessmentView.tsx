import { useState } from 'react';
import {
  Building,
  Compass,
  Filter,
  MapPin,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { BuildingDamageItem } from '@resqnet/shared-types';
import type { DisasterEventRecord } from '../../../services/indiaDisasterArchive';

interface DamageAssessmentViewProps {
  buildings: BuildingDamageItem[];
  inundatedAreaSqKm: number;
  scenarioName?: string;
  disasterRecord?: DisasterEventRecord;
  onSelectBuilding?: (building: BuildingDamageItem) => void;
  onNavigateToMap: () => void;
}

export default function DamageAssessmentView({
  buildings,
  inundatedAreaSqKm,
  disasterRecord,
  onSelectBuilding,
  onNavigateToMap,
}: DamageAssessmentViewProps) {
  const [filter, setFilter] = useState<'all' | 'collapsed' | 'severe' | 'moderate' | 'safe'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const collapsedCount = buildings.filter((b) => b.damage_level === 'collapsed').length;
  const severeCount = buildings.filter((b) => b.damage_level === 'severe').length;
  const moderateCount = buildings.filter((b) => b.damage_level === 'moderate').length;
  const safeCount = buildings.filter((b) => b.damage_level === 'safe').length;
  const totalTrapped = buildings.reduce((acc, b) => acc + (b.people_trapped || 0), 0);

  const filteredBuildings = buildings.filter((b) => {
    if (filter === 'all') return true;
    return b.damage_level === filter;
  });

  const getDamageBadgeClass = (level: string) => {
    switch (level) {
      case 'collapsed':
        return 'damage-pill damage-pill--critical';
      case 'severe':
        return 'damage-pill damage-pill--severe';
      case 'moderate':
        return 'damage-pill damage-pill--moderate';
      default:
        return 'damage-pill damage-pill--low';
    }
  };

  return (
    <div className="aftermath-file-view">
      {/* KPI Cards Row */}
      <div className="file-kpi-grid">
        <div className="file-kpi-card">
          <span className="file-kpi-label">TOTAL INUNDATED AREA</span>
          <div className="file-kpi-val" style={{ color: '#9eb89f' }}>
            {inundatedAreaSqKm} <small>km²</small>
          </div>
          <span className="file-kpi-sub">Satellite Change Detection</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">CRITICAL / COLLAPSED</span>
          <div className="file-kpi-val" style={{ color: '#ef4444' }}>
            {collapsedCount}
          </div>
          <span className="file-kpi-sub">Immediate Rescue Target</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">SEVERE DAMAGE</span>
          <div className="file-kpi-val" style={{ color: '#f97316' }}>
            {severeCount}
          </div>
          <span className="file-kpi-sub">Structural Integrity Compromised</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">TOTAL TRAPPED SURVIVORS</span>
          <div className="file-kpi-val" style={{ color: '#ffd166' }}>
            {totalTrapped}
          </div>
          <span className="file-kpi-sub">Verified via Ground Reports</span>
        </div>
      </div>

      {/* AI Structural Vulnerability Intelligence Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 14, 26, 0.75)',
          border: '1px solid rgba(158, 184, 159, 0.3)',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 11.5,
          color: '#cbd5e1',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} color="#a7c9ab" />
          <span>
            <strong>AI Structural Analysis ({disasterRecord?.shortName || 'Zone'}):</strong>{' '}
            {collapsedCount > 0
              ? `${collapsedCount} masonry structures collapsed with high void cavity risk. Immediate USAR acoustic dispatch required.`
              : `All identified structures intact; localized perimeter monitoring active.`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ShieldAlert size={13} color="#ef4444" />
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>
            Vulnerability Index: {Math.min(100, Math.round(((collapsedCount * 2 + severeCount) / Math.max(1, buildings.length)) * 100))}%
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="file-action-bar">
        <div className="file-filter-group">
          <Filter size={14} className="file-filter-icon" />
          <button
            type="button"
            className={`file-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Buildings ({buildings.length})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'collapsed' ? 'active' : ''}`}
            onClick={() => setFilter('collapsed')}
          >
            Collapsed ({collapsedCount})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'severe' ? 'active' : ''}`}
            onClick={() => setFilter('severe')}
          >
            Severe ({severeCount})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'moderate' ? 'active' : ''}`}
            onClick={() => setFilter('moderate')}
          >
            Moderate ({moderateCount})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'safe' ? 'active' : ''}`}
            onClick={() => setFilter('safe')}
          >
            Intact / Safe ({safeCount})
          </button>
        </div>

        <button
          type="button"
          onClick={onNavigateToMap}
          className="file-primary-action-btn"
          title="Switch to Earth Observation map file"
        >
          <Compass size={14} />
          <span>Inspect on Satellite Map</span>
        </button>
      </div>

      {/* Buildings Grid */}
      <div className="file-content-scrollable">
        <div className="damage-building-grid">
          {filteredBuildings.map((bldg) => {
            const isSelected = selectedId === bldg.id;
            return (
              <div
                key={bldg.id}
                className={`damage-building-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelectedId(bldg.id);
                  if (onSelectBuilding) onSelectBuilding(bldg);
                }}
              >
                <div className="building-card-top">
                  <div className="building-card-title-group">
                    <Building size={16} className="building-type-icon" />
                    <div>
                      <h4 className="building-name">{bldg.name}</h4>
                      <span className="building-type">{bldg.type.toUpperCase()}</span>
                    </div>
                  </div>
                  <span className={getDamageBadgeClass(bldg.damage_level)}>
                    {bldg.damage_level.toUpperCase()}
                  </span>
                </div>

                <div className="building-metrics-grid">
                  <div className="building-submetric">
                    <span className="submetric-lbl">Sensor Source</span>
                    <span className="submetric-val">{bldg.sensor_source}</span>
                  </div>

                  <div className="building-submetric">
                    <span className="submetric-lbl">Est. Trapped</span>
                    <span
                      className="submetric-val"
                      style={{
                        color: (bldg.people_trapped || 0) > 0 ? '#ef4444' : 'var(--text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {bldg.people_trapped || 0} Citizens
                    </span>
                  </div>

                  <div className="building-submetric">
                    <span className="submetric-lbl">AI Confidence</span>
                    <span className="submetric-val">
                      {Math.round(bldg.confidence * 100)}%
                    </span>
                  </div>

                  <div className="building-submetric">
                    <span className="submetric-lbl">Rescue Status</span>
                    <span
                      className="submetric-val"
                      style={{
                        color: bldg.rescue_assigned ? '#7ae582' : '#f97316',
                      }}
                    >
                      {bldg.rescue_assigned ? 'ASSIGNED' : 'UNASSIGNED'}
                    </span>
                  </div>
                </div>

                {bldg.damage_description && (
                  <p className="building-notes">
                    <strong>Report:</strong> {bldg.damage_description}
                  </p>
                )}

                <div className="building-card-footer">
                  <span className="building-coords">
                    <MapPin size={11} /> {bldg.coordinates[0].toFixed(4)}, {bldg.coordinates[1].toFixed(4)}
                  </span>
                  <button
                    type="button"
                    className="view-map-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectBuilding) onSelectBuilding(bldg);
                      onNavigateToMap();
                    }}
                  >
                    <span>Inspect Layer</span>
                    &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
