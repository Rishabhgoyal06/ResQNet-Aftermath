import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Building,
  Satellite,
  LifeBuoy,
  Route,
  BellRing,
  Send,
  Columns3,
  AlertTriangle,
  History,
} from 'lucide-react';
import SatelliteEarthObservationMap from '../components/aftermath/SatelliteEarthObservationMap';
import DamageAssessmentPanel from '../components/aftermath/DamageAssessmentPanel';
import DamageAssessmentView from '../components/aftermath/views/DamageAssessmentView';
import RescueMissionsView from '../components/aftermath/views/RescueMissionsView';
import RoadNetworkView from '../components/aftermath/views/RoadNetworkView';
import DisasterTriggersView from '../components/aftermath/views/DisasterTriggersView';
import SOSIngestionView from '../components/aftermath/views/SOSIngestionView';
import DisasterHistoryArchiveView from '../components/aftermath/views/DisasterHistoryArchiveView';
import {
  HISTORICAL_INDIA_DISASTERS,
  type DisasterEventRecord,
} from '../services/indiaDisasterArchive';
import {
  generateIncidentClusters,
  generateRescueMissions,
} from '../services/aftermathIntelligence';
import {
  evaluateSOSDensitySurge,
  type OfficialDisasterAlert,
} from '../services/realtimeTriggers';
import type {
  RoadStatus,
  IncidentCluster,
  ProcessedSOSReport,
  BuildingDamageItem,
  RescueMission,
} from '@resqnet/shared-types';
import '../components/aftermath/AftermathComponents.css';

const FILE_TABS = [
  { id: 'history', name: 'Disaster Archive', ext: '.hist', icon: History },
  { id: 'satellite', name: 'Earth Observation', ext: '.map', icon: Satellite },
  { id: 'damage', name: 'Damage Assessment', ext: '.rep', icon: Building },
  { id: 'missions', name: 'Rescue Missions', ext: '.ops', icon: LifeBuoy },
  { id: 'roads', name: 'Road Corridors', ext: '.nav', icon: Route },
  { id: 'triggers', name: 'Disaster Triggers', ext: '.live', icon: BellRing },
  { id: 'ingest', name: 'SOS Distress Intake', ext: '.log', icon: Send },
  { id: 'split', name: 'Dual Workspace', ext: '.dual', icon: Columns3 },
];

export default function AftermathPage() {
  const { fileId } = useParams<{ fileId?: string }>();
  const navigate = useNavigate();

  // Active file view defaults to satellite
  const activeFile = fileId || 'satellite';

  // Active Disaster Record (Defaults to Wayanad Landslides 2024)
  const [currentDisaster, setCurrentDisaster] = useState<DisasterEventRecord>(
    () => HISTORICAL_INDIA_DISASTERS[0]
  );

  // Dynamically Ingested Real-Time User Reports
  const [liveUserReports, setLiveUserReports] = useState<ProcessedSOSReport[]>([]);

  // Interactive Road Segment Overrides
  const [roadOverrides, setRoadOverrides] = useState<Record<string, RoadStatus>>({});

  // Active Selections
  const [selectedCluster, setSelectedCluster] = useState<IncidentCluster | undefined>();
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDamageItem | undefined>();
  const [, setSelectedMission] = useState<RescueMission | undefined>();
  const [approvedMissionIds, setApprovedMissionIds] = useState<Set<string>>(new Set());

  // Active Datasets dynamically derived from the selected disaster
  const activeSatelliteData = currentDisaster.satelliteData;
  const activeBuildings = currentDisaster.buildings;
  const baseRoads = currentDisaster.roads;
  const activeResources = currentDisaster.rescueResources;

  // Apply user interactive road overrides
  const activeRoads = useMemo(() => {
    return baseRoads.map((r) => {
      if (roadOverrides[r.id]) {
        return {
          ...r,
          status: roadOverrides[r.id],
          last_updated: 'Just now (Manual Override)',
        };
      }
      return r;
    });
  }, [baseRoads, roadOverrides]);

  // Dynamic Reports: Real disaster seeds + dynamically ingested SOS
  const activeReports = useMemo<ProcessedSOSReport[]>(() => {
    const disasterSeeds = currentDisaster.sosSeeds || [];
    return [...liveUserReports, ...disasterSeeds];
  }, [currentDisaster, liveUserReports]);

  // TRIGGER 1: Evaluate Spatial SOS Density Surge across active reports
  const activeSurgeEvent = useMemo(() => {
    return evaluateSOSDensitySurge(activeReports, 2500, 3);
  }, [activeReports]);

  // AI Incident Clusters & Explainable RPS Scores
  const clusters = useMemo(() => {
    return generateIncidentClusters(activeReports, activeSatelliteData);
  }, [activeReports, activeSatelliteData]);

  // Risk-Aware Routing & Fast Recovery Rescue Missions
  const missions = useMemo(() => {
    const generated = generateRescueMissions(clusters, activeRoads, activeResources);
    return generated.map((m) => {
      if (approvedMissionIds.has(m.id)) {
        return {
          ...m,
          status: 'dispatched' as const,
        };
      }
      return m;
    });
  }, [clusters, activeRoads, activeResources, approvedMissionIds]);

  // Handlers
  const handleToggleRoad = (segmentId: string, newStatus: RoadStatus) => {
    setRoadOverrides((prev) => ({
      ...prev,
      [segmentId]: newStatus,
    }));
  };

  const handleApproveMission = (missionId: string) => {
    setApprovedMissionIds((prev) => new Set([...prev, missionId]));
  };

  const handleSelectCluster = (cluster: IncidentCluster) => {
    setSelectedCluster(cluster);
    const m = missions.find((ms) => ms.incident_id === cluster.id);
    if (m) setSelectedMission(m);
  };

  const handleSelectBuilding = (building: BuildingDamageItem) => {
    setSelectedBuilding(building);
  };

  const handleSelectMission = (mission: RescueMission) => {
    setSelectedMission(mission);
    const c = clusters.find((cl) => cl.id === mission.incident_id);
    if (c) setSelectedCluster(c);
  };

  const handleIngestLiveReport = (newReport: ProcessedSOSReport) => {
    setLiveUserReports((prev) => [newReport, ...prev]);
  };

  // When a user selects a historical or live disaster from the archive:
  const handleSelectDisasterFromArchive = (disaster: DisasterEventRecord) => {
    setCurrentDisaster(disaster);
    setSelectedCluster(undefined);
    setSelectedBuilding(undefined);
    setRoadOverrides({});
    navigate('/aftermath/satellite');
  };

  // Simulate an instant SOS density surge in active zone
  const handleSimulateSurge = () => {
    const centerLat = currentDisaster.coordinates[0];
    const centerLng = currentDisaster.coordinates[1];

    const surgeSeeds: ProcessedSOSReport[] = [
      {
        id: `SURGE-SOS-${Date.now()}-A`,
        name: 'Field Relief Volunteer',
        phone: '98110-XXXXX',
        latitude: centerLat + 0.002,
        longitude: centerLng + 0.001,
        category: 'Rescue Needed',
        verified_severity: 5,
        district: currentDisaster.district,
        detailed_area: `${currentDisaster.shortName} Core Zone`,
        message: 'Water/rubble breach! 8 citizens trapped inside structural void, boat/excavator needed urgently!',
        supply_requirements: { food: 1, water: 1, doctor: 0, shelter: 1, medicines: 1 },
        casualties_reported: true,
        source_project: 'surge_simulation',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        rephrased_message: '8 trapped in structural void. Immediate rescue requested.',
      },
    ];

    setLiveUserReports((prev) => [...surgeSeeds, ...prev]);
  };

  const handleSelectOfficialAlert = (_alert: OfficialDisasterAlert) => {
    navigate('/aftermath/history');
  };

  return (
    <div className="aftermath-page">
      {/* Top Tactical Command Bar - Clean & Non-Redundant */}
      <div className="aftermath-topbar">
        <div className="aftermath-brand">
          <Cpu className="sat-icon" size={22} />
          <div>
            <h2 className="aftermath-title">
              AFTERMATH <span>COMMAND</span>
            </h2>
            <p className="aftermath-subtitle">
              📁 aftermath / 📄 {FILE_TABS.find((t) => t.id === activeFile)?.name || 'Earth Observation'}
              {FILE_TABS.find((t) => t.id === activeFile)?.ext || '.map'}
            </p>
          </div>
        </div>

        {/* Active Disaster Pill & Quick Archive Switcher */}
        <div className="aftermath-disaster-target">
          <button
            type="button"
            className="aftermath-archive-switch-btn"
            onClick={() => navigate('/aftermath/history')}
            title="Switch disaster or view real-time radar in Disaster Archive (.hist)"
          >
            <History size={13} />
            <span>DISASTER ARCHIVE</span>
          </button>

          <div className="aftermath-active-disaster-info">
            <span className="aftermath-disaster-title">
              📍 {currentDisaster.title}
            </span>
            <span className="aftermath-disaster-coords">
              [{currentDisaster.coordinates[0].toFixed(2)}, {currentDisaster.coordinates[1].toFixed(2)}]
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="aftermath-live-indicators">
          {activeSurgeEvent ? (
            <div
              className="aftermath-pulse"
              style={{
                color: '#ef4444',
                borderColor: '#ef4444',
                background: 'rgba(239, 68, 68, 0.15)',
              }}
            >
              <AlertTriangle size={11} />
              <span>SURGE: {activeSurgeEvent.reportCount} SOS</span>
            </div>
          ) : (
            <div className="aftermath-pulse">
              <span className="pulse-dot" />
              <span>LIVE SATELLITE ENGINE</span>
            </div>
          )}
        </div>
      </div>

      {/* Editor-Style File Tabs Bar (Uncluttered, Single-Click Navigation) */}
      <div className="aftermath-file-tabs">
        {FILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFile === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`aftermath-file-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => navigate(`/aftermath/${tab.id}`)}
              title={`Open file: ${tab.name}`}
            >
              <Icon size={13} style={{ color: isActive ? '#a7c9ab' : 'inherit' }} />
              <span>{tab.name}</span>
              <span className="file-tab-ext">{tab.ext}</span>
            </button>
          );
        })}
      </div>

      {/* Main File Content Viewport */}
      {activeFile === 'history' && (
        <DisasterHistoryArchiveView
          onSelectDisaster={handleSelectDisasterFromArchive}
          activeDisasterId={currentDisaster.id}
        />
      )}

      {activeFile === 'satellite' && (
        <div style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative' }}>
          <SatelliteEarthObservationMap
            centerCoordinates={currentDisaster.coordinates}
            zoomLevel={currentDisaster.zoom}
            clusters={clusters}
            roadSegments={activeRoads}
            resources={activeResources}
            missions={missions}
            satelliteData={activeSatelliteData}
            buildings={activeBuildings}
            disasterRecord={currentDisaster}
            selectedClusterId={selectedCluster?.id}
            selectedBuildingId={selectedBuilding?.id}
            onClusterSelect={handleSelectCluster}
            onBuildingSelect={handleSelectBuilding}
            onSelectMission={handleSelectMission}
          />
        </div>
      )}

      {activeFile === 'damage' && (
        <DamageAssessmentView
          buildings={activeBuildings}
          inundatedAreaSqKm={currentDisaster.impactedAreaSqKm}
          disasterRecord={currentDisaster}
          onSelectBuilding={handleSelectBuilding}
          onNavigateToMap={() => navigate('/aftermath/satellite')}
        />
      )}

      {activeFile === 'missions' && (
        <RescueMissionsView
          missions={missions}
          clusters={clusters}
          approvedMissionIds={approvedMissionIds}
          onApproveMission={handleApproveMission}
          onNavigateToMap={() => navigate('/aftermath/satellite')}
          onSelectMission={handleSelectMission}
        />
      )}

      {activeFile === 'roads' && (
        <RoadNetworkView
          roadSegments={activeRoads}
          onToggleRoad={handleToggleRoad}
          onNavigateToMap={() => navigate('/aftermath/satellite')}
        />
      )}

      {activeFile === 'triggers' && (
        <DisasterTriggersView
          activeReports={activeReports}
          activeSurgeEvent={activeSurgeEvent}
          onSelectAlert={handleSelectOfficialAlert}
          onSimulateSurge={handleSimulateSurge}
          onNavigateToMap={() => navigate('/aftermath/satellite')}
        />
      )}

      {activeFile === 'ingest' && (
        <SOSIngestionView
          currentDisaster={currentDisaster}
          onIngestReport={handleIngestLiveReport}
          onNavigateToMap={() => navigate('/aftermath/satellite')}
          recentReports={liveUserReports}
        />
      )}

      {activeFile === 'split' && (
        <div className="aftermath-grid">
          <div className="aftermath-left-col">
            <SatelliteEarthObservationMap
              centerCoordinates={currentDisaster.coordinates}
              zoomLevel={currentDisaster.zoom}
              clusters={clusters}
              roadSegments={activeRoads}
              resources={activeResources}
              missions={missions}
              satelliteData={activeSatelliteData}
              buildings={activeBuildings}
              disasterRecord={currentDisaster}
              selectedClusterId={selectedCluster?.id}
              selectedBuildingId={selectedBuilding?.id}
              onClusterSelect={handleSelectCluster}
              onBuildingSelect={handleSelectBuilding}
              onSelectMission={handleSelectMission}
            />
          </div>
          <div className="aftermath-right-col">
            <DamageAssessmentPanel
              missions={missions}
              roadSegments={activeRoads}
              buildings={activeBuildings}
              selectedCluster={selectedCluster}
              selectedBuildingId={selectedBuilding?.id}
              inundatedAreaSqKm={currentDisaster.impactedAreaSqKm}
              onToggleRoad={handleToggleRoad}
              onApproveMission={handleApproveMission}
              onSelectBuilding={handleSelectBuilding}
              onSelectMission={handleSelectMission}
            />
          </div>
        </div>
      )}
    </div>
  );
}
