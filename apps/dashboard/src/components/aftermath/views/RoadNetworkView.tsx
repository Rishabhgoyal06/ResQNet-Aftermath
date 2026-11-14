import { useState } from 'react';
import {
  Route,
  AlertOctagon,
  CheckCircle,
  Compass,
  Filter,
} from 'lucide-react';
import type { RoadSegment, RoadStatus } from '@resqnet/shared-types';

interface RoadNetworkViewProps {
  roadSegments: RoadSegment[];
  onToggleRoad: (segmentId: string, status: RoadStatus) => void;
  onNavigateToMap: () => void;
}

export default function RoadNetworkView({
  roadSegments,
  onToggleRoad,
  onNavigateToMap,
}: RoadNetworkViewProps) {
  const [filter, setFilter] = useState<'all' | 'accessible' | 'blocked' | 'unsafe'>('all');

  const blockedCount = roadSegments.filter((r) => r.status === 'blocked').length;
  const accessibleCount = roadSegments.filter((r) => r.status === 'accessible').length;
  const unsafeCount = roadSegments.filter((r) => r.status === 'unsafe').length;

  const filteredRoads = roadSegments.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="aftermath-file-view">
      {/* KPI Cards Row */}
      <div className="file-kpi-grid">
        <div className="file-kpi-card">
          <span className="file-kpi-label">TOTAL MONITORED ROADS</span>
          <div className="file-kpi-val" style={{ color: '#9eb89f' }}>
            {roadSegments.length}
          </div>
          <span className="file-kpi-sub">Strategic Evacuation Corridors</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">OPEN & CLEAR</span>
          <div className="file-kpi-val" style={{ color: '#7ae582' }}>
            {accessibleCount}
          </div>
          <span className="file-kpi-sub">Immediate Transit Ready</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">IMPASSABLE / BLOCKED</span>
          <div className="file-kpi-val" style={{ color: '#ef4444' }}>
            {blockedCount}
          </div>
          <span className="file-kpi-sub">Waterlogged or Debris Collapse</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">UNSAFE / HIGH RISK</span>
          <div className="file-kpi-val" style={{ color: '#ffd166' }}>
            {unsafeCount}
          </div>
          <span className="file-kpi-sub">Single-Lane or High Clearance Only</span>
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
            All Corridors ({roadSegments.length})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'accessible' ? 'active' : ''}`}
            onClick={() => setFilter('accessible')}
          >
            Clear / Passable ({accessibleCount})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'blocked' ? 'active' : ''}`}
            onClick={() => setFilter('blocked')}
          >
            Blocked / Submerged ({blockedCount})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'unsafe' ? 'active' : ''}`}
            onClick={() => setFilter('unsafe')}
          >
            Unsafe / Caution ({unsafeCount})
          </button>
        </div>

        <button
          type="button"
          onClick={onNavigateToMap}
          className="file-primary-action-btn"
          title="Switch to Earth Observation map file"
        >
          <Compass size={14} />
          <span>View Corridors on Satellite Map</span>
        </button>
      </div>

      {/* Interactive Road Segments */}
      <div className="file-content-scrollable">
        <div className="roads-table-container">
          <div className="roads-info-hint">
            <strong>Interactive Operational Controls:</strong> Click any status button below to manually toggle passability. The routing engine dynamically recalculates rescue vehicle corridors in real time!
          </div>

          <div className="roads-grid">
            {filteredRoads.map((road) => {
              const isBlocked = road.status === 'blocked';
              const isUnsafe = road.status === 'unsafe';
              const isClear = road.status === 'accessible';

              return (
                <div
                  key={road.id}
                  className={`road-status-card ${
                    isBlocked ? 'road-status-card--blocked' : isUnsafe ? 'road-status-card--caution' : ''
                  }`}
                >
                  <div className="road-card-header">
                    <div className="road-title-group">
                      <Route size={16} className="road-icon" />
                      <div>
                        <h4 className="road-name">{road.name}</h4>
                        <span className="road-sub">
                          SOURCE: {road.source.toUpperCase()} • ID: {road.id}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`road-badge ${
                        isBlocked ? 'road-badge--blocked' : isUnsafe ? 'road-badge--caution' : 'road-badge--clear'
                      }`}
                    >
                      {road.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="road-desc">
                    {road.flood_depth_meters
                      ? `Inundation detected: ${road.flood_depth_meters}m water depth.`
                      : isBlocked
                      ? 'Impassable corridor due to acute structural obstruction or flood barrier.'
                      : 'Passable emergency corridor for relief convoys.'}
                  </p>

                  <div className="road-toggles-bar">
                    <span className="toggle-lbl">Manual Override:</span>
                    <div className="road-btn-group">
                      <button
                        type="button"
                        className={`road-toggle-btn ${isClear ? 'is-active-clear' : ''}`}
                        onClick={() => onToggleRoad(road.id, 'accessible')}
                      >
                        <CheckCircle size={12} />
                        <span>CLEAR</span>
                      </button>

                      <button
                        type="button"
                        className={`road-toggle-btn ${isUnsafe ? 'is-active-caution' : ''}`}
                        onClick={() => onToggleRoad(road.id, 'unsafe')}
                      >
                        <AlertOctagon size={12} />
                        <span>UNSAFE</span>
                      </button>

                      <button
                        type="button"
                        className={`road-toggle-btn ${isBlocked ? 'is-active-blocked' : ''}`}
                        onClick={() => onToggleRoad(road.id, 'blocked')}
                      >
                        <AlertOctagon size={12} />
                        <span>BLOCKED</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
