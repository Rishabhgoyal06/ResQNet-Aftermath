import { useState } from 'react';
import {
  Send,
  CheckCircle2,
  Clock,
  Compass,
  Users,
  Truck,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import type { RescueMission, IncidentCluster } from '@resqnet/shared-types';

interface RescueMissionsViewProps {
  missions: RescueMission[];
  clusters: IncidentCluster[];
  approvedMissionIds: Set<string>;
  onApproveMission: (missionId: string) => void;
  onNavigateToMap: () => void;
  onSelectMission?: (mission: RescueMission) => void;
}

export default function RescueMissionsView({
  missions,
  clusters,
  approvedMissionIds,
  onApproveMission,
  onNavigateToMap,
  onSelectMission,
}: RescueMissionsViewProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'dispatched'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingCount = missions.filter((m) => m.status === 'awaiting_approval' && !approvedMissionIds.has(m.id)).length;
  const dispatchedCount = missions.filter((m) => m.status === 'dispatched' || m.status === 'approved' || approvedMissionIds.has(m.id)).length;

  const filteredMissions = missions.filter((m) => {
    const isDispatched = m.status === 'dispatched' || m.status === 'approved' || approvedMissionIds.has(m.id);
    if (filter === 'pending') return !isDispatched;
    if (filter === 'dispatched') return isDispatched;
    return true;
  });

  return (
    <div className="aftermath-file-view">
      {/* KPI Cards Row */}
      <div className="file-kpi-grid">
        <div className="file-kpi-card">
          <span className="file-kpi-label">TOTAL RESCUE MISSIONS</span>
          <div className="file-kpi-val" style={{ color: '#9eb89f' }}>
            {missions.length}
          </div>
          <span className="file-kpi-sub">Fast Recovery Operation Queue</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">PENDING AUTHORIZATION</span>
          <div className="file-kpi-val" style={{ color: '#ef4444' }}>
            {pendingCount}
          </div>
          <span className="file-kpi-sub">Ready for 1-Click Dispatch</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">TEAMS EN-ROUTE / DISPATCHED</span>
          <div className="file-kpi-val" style={{ color: '#7ae582' }}>
            {dispatchedCount}
          </div>
          <span className="file-kpi-sub">Active Units In Transit</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">CLUSTER PRIORITY TRIAGE</span>
          <div className="file-kpi-val" style={{ color: '#ffd166' }}>
            ACTIVE
          </div>
          <span className="file-kpi-sub">Ranked by Rescue Priority Score (RPS)</span>
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
            All Operations ({missions.length})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending Authorization ({pendingCount})
          </button>
          <button
            type="button"
            className={`file-filter-btn ${filter === 'dispatched' ? 'active' : ''}`}
            onClick={() => setFilter('dispatched')}
          >
            Dispatched ({dispatchedCount})
          </button>
        </div>

        <button
          type="button"
          onClick={onNavigateToMap}
          className="file-primary-action-btn"
          title="Switch to Earth Observation map file"
        >
          <Compass size={14} />
          <span>Inspect Routes on Satellite Map</span>
        </button>
      </div>

      {/* Missions List */}
      <div className="file-content-scrollable">
        <div className="missions-grid">
          {filteredMissions.map((mission, idx) => {
            const isDispatched = mission.status === 'dispatched' || mission.status === 'approved' || approvedMissionIds.has(mission.id);
            const isSelected = selectedId === mission.id;
            const cluster = clusters.find((c) => c.id === mission.incident_id);

            return (
              <div
                key={mission.id}
                className={`mission-card ${isDispatched ? 'mission-card--dispatched' : ''} ${
                  isSelected ? 'is-selected' : ''
                }`}
                onClick={() => {
                  setSelectedId(mission.id);
                  if (onSelectMission) onSelectMission(mission);
                }}
              >
                <div className="mission-card-top">
                  <div className="mission-header-left">
                    <span className="mission-priority-badge">
                      PRIORITY #{idx + 1}
                    </span>
                    <span className="mission-id-tag">{mission.id}</span>
                  </div>

                  {isDispatched ? (
                    <span className="status-badge status-badge--dispatched">
                      <CheckCircle2 size={12} />
                      <span>DISPATCHED & EN ROUTE</span>
                    </span>
                  ) : (
                    <span className="status-badge status-badge--pending">
                      <Clock size={12} />
                      <span>PENDING AUTHORIZATION</span>
                    </span>
                  )}
                </div>

                <div className="mission-details-body">
                  <div className="mission-row">
                    <span className="mission-lbl">Target Incident:</span>
                    <strong className="mission-incident-name">
                      {cluster?.title || mission.incident_title || `Incident #${mission.incident_id}`}
                    </strong>
                  </div>

                  <div className="mission-row">
                    <span className="mission-lbl">Priority Score (RPS):</span>
                    <span className="rps-score-pill">
                      {mission.rps_score.toFixed(1)} / 100
                    </span>
                  </div>

                  {cluster && (
                    <div className="mission-row">
                      <span className="mission-lbl">Population in Scope:</span>
                      <span className="mission-victims">
                        <Users size={12} /> {cluster.confirmed_population || cluster.estimated_population} Citizens Trapped
                      </span>
                    </div>
                  )}

                  <div className="mission-row">
                    <span className="mission-lbl">Assigned Resource:</span>
                    <span className="mission-resource">
                      <Truck size={12} /> {mission.assigned_resource.name} ({mission.assigned_resource.type})
                    </span>
                  </div>

                  <div className="mission-row">
                    <span className="mission-lbl">Operational Approach:</span>
                    <span className="mission-route-desc">
                      {mission.approach.toUpperCase()} • {mission.reason}
                    </span>
                  </div>
                </div>

                <div className="mission-card-actions">
                  {!isDispatched ? (
                    <button
                      type="button"
                      className="mission-authorize-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApproveMission(mission.id);
                      }}
                    >
                      <Send size={13} />
                      <span>AUTHORIZE & DISPATCH UNIT</span>
                    </button>
                  ) : (
                    <div className="mission-authorized-indicator">
                      <ShieldCheck size={14} />
                      <span>COMMAND AUTHORIZED • UNIT IN TRANSIT</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="view-map-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectMission) onSelectMission(mission);
                      onNavigateToMap();
                    }}
                  >
                    <span>View Route</span>
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
