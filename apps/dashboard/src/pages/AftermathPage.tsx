import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Waves,
  Building,
  Database,
  Satellite,
  LifeBuoy,
  Route,
  BellRing,
  Send,
  Columns3,
  AlertTriangle,
} from 'lucide-react';
import { useProcessedSOS } from '../hooks/useProcessedSOS';
import { useRealtimeSOS } from '../hooks/useRealtimeSOS';
import SatelliteEarthObservationMap from '../components/aftermath/SatelliteEarthObservationMap';
import DamageAssessmentPanel from '../components/aftermath/DamageAssessmentPanel';
import DamageAssessmentView from '../components/aftermath/views/DamageAssessmentView';
import RescueMissionsView from '../components/aftermath/views/RescueMissionsView';
import RoadNetworkView from '../components/aftermath/views/RoadNetworkView';
import DisasterTriggersView from '../components/aftermath/views/DisasterTriggersView';
import SOSIngestionView from '../components/aftermath/views/SOSIngestionView';
import {
  DELHI_YAMUNA_SATELLITE_DATA,
  FLOOD_BUILDINGS,
  INITIAL_ROAD_SEGMENTS,
  INITIAL_RESCUE_RESOURCES,
  EARTHQUAKE_SATELLITE_DATA,
  EARTHQUAKE_BUILDINGS,
  EARTHQUAKE_ROADS,
  EARTHQUAKE_RESCUE_RESOURCES,
  EARTHQUAKE_SOS_SEEDS,
} from '../services/aftermathScenarioData';
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
  SatelliteDataset,
} from '@resqnet/shared-types';
import '../components/aftermath/AftermathComponents.css';

// Specialized scenario seeds for Satellite Flood Change Detection
const SPECIALIZED_YAMUNA_SEEDS: ProcessedSOSReport[] = [
  {
    id: 'YAMUNA-SOS-01',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    name: 'Tenzin Norbu',
    phone: '98110-XXXXX',
    latitude: 28.6875,
    longitude: 77.2295,
    category: 'Rescue Needed',
    verified_severity: 5,
    district: 'North Delhi',
    detailed_area: 'Majnu Ka Tilla Tibetan Camp',
    message: 'Water has reached 1st floor near Monastery market. 6 people trapped including 2 elderly monks and a child. Boat needed urgently!',
    supply_requirements: { food: 1, water: 1, doctor: 0, shelter: 1, medicines: 0 },
    casualties_reported: false,
    source_project: 'local',
    processed_at: new Date().toISOString(),
    rephrased_message: 'Water reaching 1st floor, 6 trapped with 2 elderly and 1 child. Boat required.',
  },
  {
    id: 'YAMUNA-SOS-02',
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    name: 'Rajinder Kumar',
    phone: '98731-XXXXX',
    latitude: 28.6690,
    longitude: 77.2315,
    category: 'Rescue Needed',
    verified_severity: 5,
    district: 'North Delhi',
    detailed_area: 'ISBT Kashmiri Gate Low Ring Road',
    message: 'Ring road underpass is completely submerged under 5 feet water. Bus passengers evacuated to flyover pillar, 8 people stranded.',
    supply_requirements: { food: 1, water: 1, doctor: 0, shelter: 1, medicines: 0 },
    casualties_reported: false,
    source_project: 'local',
    processed_at: new Date().toISOString(),
    rephrased_message: '8 passengers stranded on flyover pillar near submerged ISBT underpass.',
  },
  {
    id: 'YAMUNA-SOS-03',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    name: 'Amit Sharma',
    phone: '99100-XXXXX',
    latitude: 28.7060,
    longitude: 77.2250,
    category: 'Food / Water',
    verified_severity: 3,
    district: 'North Delhi',
    detailed_area: 'Wazirabad Village Ghat',
    message: 'No clean drinking water since morning. 15 families cut off from main road by river overflow.',
    supply_requirements: { food: 1, water: 1, doctor: 0, shelter: 0, medicines: 0 },
    casualties_reported: false,
    source_project: 'local',
    processed_at: new Date().toISOString(),
    rephrased_message: '15 families cut off near Wazirabad Ghat needing food and clean water.',
  },
  {
    id: 'YAMUNA-SOS-04',
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
    name: 'Dr. Sunita Rao',
    phone: '98101-XXXXX',
    latitude: 28.6790,
    longitude: 77.2175,
    category: 'Medical Emergency',
    verified_severity: 4,
    district: 'North Delhi',
    detailed_area: 'Civil Lines Elevated Command Post',
    message: 'Trauma patients arriving from inundated lowlands. Need additional medical transport and burn/injury dressings.',
    supply_requirements: { food: 0, water: 0, doctor: 1, shelter: 0, medicines: 1 },
    casualties_reported: false,
    source_project: 'local',
    processed_at: new Date().toISOString(),
    rephrased_message: 'Field triage receiving evacuees. Medical ambulance deployment requested.',
  },
];

const FILE_TABS = [
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

  const { reports: processedDbReports } = useProcessedSOS();
  const { reports: rawDbReports } = useRealtimeSOS();

  // Catastrophe Scenario Mode:
  const [scenario, setScenario] = useState<'yamuna_flood' | 'earthquake' | 'real_db'>('yamuna_flood');

  // Dynamically Ingested Real-Time User Reports
  const [liveUserReports, setLiveUserReports] = useState<ProcessedSOSReport[]>([]);

  // Interactive Road Segment Overrides
  const [roadOverrides, setRoadOverrides] = useState<Record<string, RoadStatus>>({});

  // Active Selections
  const [selectedCluster, setSelectedCluster] = useState<IncidentCluster | undefined>();
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDamageItem | undefined>();
  const [, setSelectedMission] = useState<RescueMission | undefined>();
  const [approvedMissionIds, setApprovedMissionIds] = useState<Set<string>>(new Set());

  // Active Satellite Dataset
  const activeSatelliteData = useMemo<SatelliteDataset>(() => {
    return scenario === 'earthquake' ? EARTHQUAKE_SATELLITE_DATA : DELHI_YAMUNA_SATELLITE_DATA;
  }, [scenario]);

  const activeBuildings = useMemo<BuildingDamageItem[]>(() => {
    return scenario === 'earthquake' ? EARTHQUAKE_BUILDINGS : FLOOD_BUILDINGS;
  }, [scenario]);

  const baseRoads = useMemo(() => {
    return scenario === 'earthquake' ? EARTHQUAKE_ROADS : INITIAL_ROAD_SEGMENTS;
  }, [scenario]);

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

  const activeResources = useMemo(() => {
    return scenario === 'earthquake' ? EARTHQUAKE_RESCUE_RESOURCES : INITIAL_RESCUE_RESOURCES;
  }, [scenario]);

  // Reports according to scenario + any live ingested reports
  const activeReports = useMemo<ProcessedSOSReport[]>(() => {
    let baseList: ProcessedSOSReport[] = [];

    if (scenario === 'earthquake') {
      baseList = EARTHQUAKE_SOS_SEEDS;
    } else if (scenario === 'yamuna_flood') {
      baseList = SPECIALIZED_YAMUNA_SEEDS;
    } else {
      if (processedDbReports && processedDbReports.length > 0) {
        baseList = processedDbReports;
      } else {
        baseList = (rawDbReports || []).map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          latitude: r.latitude,
          longitude: r.longitude,
          category: r.category,
          message: r.message,
          created_at: r.created_at,
          district: r.district || 'Unknown',
          detailed_area: r.district,
          verified_severity: r.severity,
          supply_requirements: null,
          casualties_reported: r.severity >= 5,
          processed_at: r.created_at,
          rephrased_message: r.message,
        }));
      }
    }

    return [...liveUserReports, ...baseList];
  }, [scenario, liveUserReports, processedDbReports, rawDbReports]);

  // TRIGGER 1: Evaluate Spatial SOS Density Surge across active reports
  const activeSurgeEvent = useMemo(() => {
    return evaluateSOSDensitySurge(activeReports, 2500, 3);
  }, [activeReports]);

  // Module B & C: Generate AI Incident Clusters & Explainable RPS Scores
  const clusters = useMemo(() => {
    return generateIncidentClusters(activeReports, activeSatelliteData);
  }, [activeReports, activeSatelliteData]);

  // Module E & G: Risk-Aware Routing & Fast Recovery Rescue Missions
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

  // Simulate an instant SOS density surge in North Delhi
  const handleSimulateSurge = () => {
    const surgeSeeds: ProcessedSOSReport[] = [
      {
        id: `SURGE-SOS-${Date.now()}-A`,
        name: 'Karmapa Refuge Volunteer',
        phone: '98110-33211',
        latitude: 28.6885,
        longitude: 77.2290,
        category: 'Rescue Needed',
        verified_severity: 5,
        district: 'North Delhi',
        detailed_area: 'Majnu Ka Tilla Monastery Complex',
        message: 'Water level crossed 6 feet! 8 senior monks and 4 children trapped on 2nd floor roof, fast river current, boat needed immediately!',
        supply_requirements: { food: 1, water: 1, doctor: 0, shelter: 1, medicines: 1 },
        casualties_reported: true,
        source_project: 'surge_simulation',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        rephrased_message: '6 feet flood breach, 12 trapped on roof with children. Boat rescue required.',
      },
      {
        id: `SURGE-SOS-${Date.now()}-B`,
        name: 'Lobsang Tashi',
        phone: '98731-99421',
        latitude: 28.6865,
        longitude: 77.2310,
        category: 'Rescue Needed',
        verified_severity: 5,
        district: 'North Delhi',
        detailed_area: 'Monastery Outer Lane',
        message: 'Outer Ring road underpass collapsed by water pressure! 5 people holding onto tree trunk.',
        supply_requirements: { food: 0, water: 1, doctor: 1, shelter: 0, medicines: 0 },
        casualties_reported: true,
        source_project: 'surge_simulation',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        rephrased_message: '5 victims holding onto tree near flooded underpass. Immediate rescue required.',
      },
      {
        id: `SURGE-SOS-${Date.now()}-C`,
        name: 'Anita Rawat',
        phone: '98991-00213',
        latitude: 28.6895,
        longitude: 77.2280,
        category: 'Medical Emergency',
        verified_severity: 4,
        district: 'North Delhi',
        detailed_area: 'Majnu Ka Tilla High School',
        message: 'School terrace evacuees ran out of clean water. 2 diabetic patients need insulin transport.',
        supply_requirements: { food: 1, water: 1, doctor: 1, shelter: 1, medicines: 1 },
        casualties_reported: false,
        source_project: 'surge_simulation',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        rephrased_message: 'School terrace refuge needing insulin and clean water transport.',
      },
    ];

    setLiveUserReports((prev) => [...surgeSeeds, ...prev]);
  };

  const handleSelectOfficialAlert = (alert: OfficialDisasterAlert) => {
    if (alert.category === 'earthquake') {
      setScenario('earthquake');
    } else {
      setScenario('yamuna_flood');
    }
  };

  const calculatedArea = scenario === 'earthquake' ? 4.2 : 14.8;

  return (
    <div className="aftermath-page">
      {/* Top Banner / Tactical Command Bar */}
      <div className="aftermath-topbar">
        <div className="aftermath-brand">
          <Cpu className="sat-icon" size={22} />
          <div>
            <h2 className="aftermath-title">
              AFTERMATH <span>FOLDER</span>
            </h2>
            <p className="aftermath-subtitle">
              📁 aftermath / 📄 {FILE_TABS.find((t) => t.id === activeFile)?.name || 'Earth Observation'}
              {FILE_TABS.find((t) => t.id === activeFile)?.ext || '.map'}
            </p>
          </div>
        </div>

        {/* Disaster Scenario Switcher */}
        <div className="aftermath-scenario-selector" role="group" aria-label="Catastrophe Scenario">
          <button
            type="button"
            className={`aftermath-scenario-btn ${scenario === 'yamuna_flood' ? 'is-active' : ''}`}
            onClick={() => {
              setScenario('yamuna_flood');
              setSelectedCluster(undefined);
              setSelectedBuilding(undefined);
            }}
          >
            <Waves size={13} />
            <span>YAMUNA FLOOD</span>
          </button>
          <button
            type="button"
            className={`aftermath-scenario-btn ${scenario === 'earthquake' ? 'is-active' : ''}`}
            onClick={() => {
              setScenario('earthquake');
              setSelectedCluster(undefined);
              setSelectedBuilding(undefined);
            }}
          >
            <Building size={13} />
            <span>EARTHQUAKE</span>
          </button>
          <button
            type="button"
            className={`aftermath-scenario-btn ${scenario === 'real_db' ? 'is-active' : ''}`}
            onClick={() => {
              setScenario('real_db');
              setSelectedCluster(undefined);
              setSelectedBuilding(undefined);
            }}
          >
            <Database size={13} />
            <span>SUPABASE ({activeReports.length})</span>
          </button>
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
              <span>LIVE PIPELINE ACTIVE</span>
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
              <Icon size={13} style={{ color: isActive ? '#00f0ff' : 'inherit' }} />
              <span>{tab.name}</span>
              <span className="file-tab-ext">{tab.ext}</span>
            </button>
          );
        })}
      </div>

      {/* Main File Content Viewport */}
      {activeFile === 'satellite' && (
        <div style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative' }}>
          <SatelliteEarthObservationMap
            clusters={clusters}
            roadSegments={activeRoads}
            resources={activeResources}
            missions={missions}
            satelliteData={activeSatelliteData}
            buildings={activeBuildings}
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
          inundatedAreaSqKm={calculatedArea}
          scenarioName={scenario}
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
          onIngestReport={handleIngestLiveReport}
          onNavigateToMap={() => navigate('/aftermath/satellite')}
          recentReports={liveUserReports}
        />
      )}

      {activeFile === 'split' && (
        <div className="aftermath-grid">
          <div className="aftermath-left-col">
            <SatelliteEarthObservationMap
              clusters={clusters}
              roadSegments={activeRoads}
              resources={activeResources}
              missions={missions}
              satelliteData={activeSatelliteData}
              buildings={activeBuildings}
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
              inundatedAreaSqKm={calculatedArea}
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
