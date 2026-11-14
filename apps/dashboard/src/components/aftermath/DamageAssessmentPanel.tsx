import { useState } from 'react';
import {
  ShieldAlert,
  Send,
  CheckCircle2,
  GitBranch,
  AlertOctagon,
  CheckCircle,
  Info,
  LifeBuoy,
  Truck,
  Building,
  Navigation,
  Compass,
} from 'lucide-react';
import type {
  RescueMission,
  RoadSegment,
  RoadStatus,
  IncidentCluster,
  BuildingDamageItem,
} from '@resqnet/shared-types';
import './AftermathComponents.css';

interface DamageAssessmentPanelProps {
  missions: RescueMission[];
  roadSegments: RoadSegment[];
  buildings: BuildingDamageItem[];
  selectedCluster?: IncidentCluster;
  selectedBuildingId?: string;
  inundatedAreaSqKm?: number;
  onToggleRoad: (segmentId: string, status: RoadStatus) => void;
  onApproveMission: (missionId: string) => void;
  onSelectBuilding?: (building: BuildingDamageItem) => void;
  onSelectMission?: (mission: RescueMission) => void;
}

export default function DamageAssessmentPanel({
  missions,
  roadSegments,
  buildings,
  selectedCluster,
  selectedBuildingId,
  inundatedAreaSqKm = 14.8,
  onToggleRoad,
  onApproveMission,
  onSelectBuilding,
  onSelectMission,
}: DamageAssessmentPanelProps) {
  const [activeTab, setActiveTab] = useState<'missions' | 'damage'>('missions');

  const blockedRoads = roadSegments.filter((r) => r.status === 'blocked').length;
  const passableRoads = roadSegments.filter((r) => r.status === 'accessible').length;
  const collapsedCount = buildings.filter((b) => b.damage_level === 'collapsed').length;
  const severeCount = buildings.filter((b) => b.damage_level === 'severe').length;
  const totalTrapped = buildings.reduce((acc, b) => acc + (b.people_trapped || 0), 0);

  return (
    <div className="aftermath-control-panel">
      {/* 1. Impact Summary Header */}
      <div className="panel-card panel-summary-card">
        <div className="panel-card-header">
          <div>
            <span className="panel-tag">EARTH OBSERVATION INTELLIGENCE</span>
            <h4 className="panel-title">FAST RECOVERY OPS CONSOLE</h4>
          </div>
          <div className="panel-badge-live">
            <span className="badge-pulse" />
            <span>AI MATCH ACTIVE</span>
          </div>
        </div>

        <div className="impact-metrics-row">
          <div className="metric-box">
            <span className="metric-val">{inundatedAreaSqKm} <small>km²</small></span>
            <span className="metric-lbl">Impact Extent</span>
          </div>
          <div className="metric-box">
            <span className="metric-val" style={{ color: 'var(--severity-critical, #ef4444)' }}>
              {collapsedCount + severeCount}
            </span>
            <span className="metric-lbl">Damaged Bldgs</span>
          </div>
          <div className="metric-box">
            <span className="metric-val" style={{ color: 'var(--secondary, #f97316)' }}>
              {blockedRoads}
            </span>
            <span className="metric-lbl">Blocked Roads</span>
          </div>
          <div className="metric-box">
            <span className="metric-val" style={{ color: 'var(--primary, #9eb89f)' }}>
              {missions.length}
            </span>
            <span className="metric-lbl">Rescue Ops</span>
          </div>
        </div>

        {/* 2 Clean Tabs: Missions & Damage */}
        <div className="panel-tabs-bar">
          <button
            type="button"
            className={`panel-tab-btn ${activeTab === 'missions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('missions')}
          >
            <ShieldAlert size={13} />
            <span>Rescue Missions ({missions.length})</span>
          </button>
          <button
            type="button"
            className={`panel-tab-btn ${activeTab === 'damage' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('damage')}
          >
            <Building size={13} />
            <span>Damage & Roads ({buildings.length} bldgs / {roadSegments.length} roads)</span>
          </button>
        </div>
      </div>

      {/* Selected Cluster Banner if an incident is clicked */}
      {selectedCluster && (
        <div className="selected-cluster-banner">
          <div className="banner-top">
            <div className="banner-title">
              <Compass size={14} color="var(--primary, #9eb89f)" />
              <strong>{selectedCluster.title}</strong>
            </div>
            <span className="banner-rps">RPS {selectedCluster.rps_score}/100</span>
          </div>
          <div className="banner-desc">{selectedCluster.rps_explanation}</div>
          <div className="banner-meta">
            <span>~{selectedCluster.estimated_population} victims</span> &bull;{' '}
            <span>{selectedCluster.children_count} children</span> &bull;{' '}
            <span>{selectedCluster.injured_count} injured</span>
          </div>
        </div>
      )}

      {/* ── TAB 1: RESCUE MISSIONS & FAST DISPATCH ── */}
      {activeTab === 'missions' && (
        <div className="panel-card panel-card--missions">
          <div className="panel-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Navigation size={15} color="var(--primary, #9eb89f)" />
              <h5 className="panel-title-sm">PREPARED RESCUE MISSIONS</h5>
            </div>
            <span className="panel-sub-tag">AI RISK-AWARE ROUTING</span>
          </div>

          <div className="missions-stream">
            {missions.map((m) => {
              const isApproved = m.status === 'dispatched' || m.status === 'approved';
              const isBoat = m.approach === 'water_boat';
              const isSelected = selectedCluster && selectedCluster.id === m.incident_id;

              return (
                <div
                  key={m.id}
                  className={`mission-item-card ${isApproved ? 'is-approved' : ''} ${isSelected ? 'is-highlighted' : ''}`}
                  onClick={() => onSelectMission?.(m)}
                >
                  <div className="mission-item-top">
                    <div className="mission-id-pill">
                      <strong>{m.id}</strong>
                      <span className={`mission-prio prio-${m.priority}`}>
                        {m.priority.toUpperCase()} &bull; RPS {m.rps_score}
                      </span>
                    </div>
                    <span className="mission-mode-badge">
                      {isBoat ? (
                        <>
                          <LifeBuoy size={11} /> WATER BOAT
                        </>
                      ) : (
                        <>
                          <Truck size={11} /> HEAVY TRUCK
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mission-dest-name">
                    <span>{m.incident_title}</span>
                  </div>

                  <div className="mission-team-row">
                    <span className="team-avatar">{isBoat ? '⚓' : '🚒'}</span>
                    <div>
                      <div className="team-title">{m.assigned_resource.name}</div>
                      <div className="team-station">Base: {m.assigned_resource.station}</div>
                    </div>
                  </div>

                  <div className="mission-reason-strip">
                    <Info size={13} className="info-icon" />
                    <p>{m.reason}</p>
                  </div>

                  <div className="mission-dispatch-bar">
                    {isApproved ? (
                      <div className="dispatch-confirmed">
                        <CheckCircle2 size={15} />
                        <span>DISPATCH AUTHORIZED &bull; RESCUE UNIT EN ROUTE</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="dispatch-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveMission(m.id);
                        }}
                      >
                        <Send size={13} />
                        <span>AUTHORIZE RESCUE DISPATCH</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: DAMAGE ASSESSMENT (BUILDINGS & ROADS COMBINED) ── */}
      {activeTab === 'damage' && (
        <div className="panel-card panel-card--damage" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="panel-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={15} color="var(--severity-critical, #ef4444)" />
              <h5 className="panel-title-sm">IMPACTED STRUCTURES & CORRIDORS</h5>
            </div>
            <span className="panel-sub-tag">
              {collapsedCount} COLLAPSED &bull; ~{totalTrapped} TRAPPED &bull; {blockedRoads} CUT OFF
            </span>
          </div>

          <div className="damage-unified-stream" style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 4 }}>
            {/* Road Corridors Sub-block */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <GitBranch size={13} color="var(--primary, #9eb89f)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9' }}>
                  ROAD ACCESSIBILITY ({passableRoads} PASSABLE, {blockedRoads} BLOCKED)
                </span>
              </div>
              <div className="road-segments-list">
                {roadSegments.map((road) => {
                  const isBlocked = road.status === 'blocked';
                  const nextStatus: RoadStatus = isBlocked ? 'accessible' : 'blocked';
                  return (
                    <div key={road.id} className={`road-strip ${isBlocked ? 'is-blocked' : 'is-passable'}`}>
                      <div className="road-strip-info">
                        <span className="road-strip-name">{road.name}</span>
                        <div className="road-strip-meta">
                          {road.flood_depth_meters !== undefined && road.flood_depth_meters > 0 && (
                            <span className="road-water-tag">Depth: {road.flood_depth_meters}m</span>
                          )}
                          <span>{road.last_updated}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`road-toggle-pill ${isBlocked ? 'btn-blocked' : 'btn-passable'}`}
                        onClick={() => onToggleRoad(road.id, nextStatus)}
                        title="Click to toggle road accessibility"
                      >
                        {isBlocked ? <AlertOctagon size={11} /> : <CheckCircle size={11} />}
                        <span>{road.status.toUpperCase()}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Impacted Buildings Sub-block */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 4 }}>
                <Building size={13} color="#ef4444" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9' }}>
                  AFFECTED BUILDINGS ({buildings.length})
                </span>
              </div>
              <div className="buildings-stream">
                {buildings.map((bld) => {
                  const isSelected = selectedBuildingId === bld.id;
                  const isCollapsed = bld.damage_level === 'collapsed';
                  const isSevere = bld.damage_level === 'severe';
                  const badgeClass = isCollapsed
                    ? 'badge-collapsed'
                    : isSevere
                    ? 'badge-severe'
                    : bld.damage_level === 'moderate'
                    ? 'badge-moderate'
                    : 'badge-safe';

                  return (
                    <div
                      key={bld.id}
                      className={`building-item-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onSelectBuilding?.(bld)}
                    >
                      <div className="bld-top-row">
                        <div className="bld-title">
                          <span className="bld-type-icon">
                            {bld.type === 'school' ? '🏫' : bld.type === 'hospital' ? '🏥' : bld.type === 'critical_infra' ? '🛡️' : '🏢'}
                          </span>
                          <strong>{bld.name}</strong>
                        </div>
                        <span className={`bld-damage-pill ${badgeClass}`}>
                          {bld.damage_level.toUpperCase()}
                        </span>
                      </div>

                      <p className="bld-desc">{bld.damage_description}</p>

                      <div className="bld-footer-row">
                        <span className="bld-conf">
                          {bld.sensor_source} ({Math.round(bld.confidence * 100)}% Conf)
                        </span>
                        {bld.people_trapped !== undefined && bld.people_trapped > 0 && (
                          <span className="bld-trapped-tag">
                            🚨 {bld.people_trapped} Trapped
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}