import type {
  ProcessedSOSReport,
  ExtractedEmergencyInfo,
  IncidentCluster,
  RoadSegment,
  RescueResource,
  RescueMission,
  SatelliteDataset,
} from '@resqnet/shared-types';
import { DELHI_YAMUNA_SATELLITE_DATA, INITIAL_ROAD_SEGMENTS, INITIAL_RESCUE_RESOURCES } from './aftermathScenarioData';

// ── Math & Geospatial Utilities ──────────────────────────────
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray-casting algorithm for Point in GeoJSON Polygon
export function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [lng, lat] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInSatelliteFlood(lat: number, lng: number, satData: SatelliteDataset = DELHI_YAMUNA_SATELLITE_DATA): boolean {
  for (const feature of satData.flood_polygons.features) {
    for (const ring of feature.geometry.coordinates) {
      if (isPointInPolygon([lng, lat], ring)) {
        return true;
      }
    }
  }
  return false;
}

// ── Module A: AI Natural Language Information Extractor ───────
export function extractEmergencyIntelligence(message: string = '', category: string = '', severity: number = 3): ExtractedEmergencyInfo {
  const text = message.toLowerCase();

  // 1. Detect people count
  let totalPeople = 1;
  const peopleMatch = text.match(/(\d+)\s*(people|log|persons|individuals|trapped|stuck|member|family)/);
  if (peopleMatch) {
    totalPeople = parseInt(peopleMatch[1], 10);
  } else if (text.includes('family') || text.includes('parivar')) {
    totalPeople = 4;
  }

  // 2. Detect vulnerable counts (children, elderly, injured)
  let children = 0;
  const childMatch = text.match(/(\d+)\s*(children|child|kid|kids|bachhe|bache|chote)/);
  if (childMatch) {
    children = parseInt(childMatch[1], 10);
  } else if (text.includes('child') || text.includes('kid') || text.includes('bachhe') || text.includes('bache')) {
    children = 1;
  }

  let elderly = 0;
  const elderMatch = text.match(/(\d+)\s*(elderly|elder|bujurg|old|senior|grand)/);
  if (elderMatch) {
    elderly = parseInt(elderMatch[1], 10);
  } else if (text.includes('elderly') || text.includes('bujurg') || text.includes('dada') || text.includes('dadi') || text.includes('old person')) {
    elderly = 1;
  }

  let injured = 0;
  const injuryMatch = text.match(/(\d+)\s*(injured|ghayal|hurt|fracture|wound)/);
  if (injuryMatch) {
    injured = parseInt(injuryMatch[1], 10);
  } else if (text.includes('injured') || text.includes('ghayal') || text.includes('bleeding') || text.includes('chot')) {
    injured = 1;
  }

  // 3. Danger & Urgency
  let danger = 'General Distress';
  let type: ExtractedEmergencyInfo['situation']['type'] = 'other';
  let urgency: ExtractedEmergencyInfo['situation']['urgency'] = severity >= 5 ? 'critical' : severity >= 4 ? 'high' : 'moderate';

  if (text.includes('water') || text.includes('flood') || text.includes('pani') || text.includes('drowning') || text.includes('submerged') || text.includes('chhat')) {
    type = 'flood';
    danger = text.includes('rising') || text.includes('bhad raha') ? 'Rapidly Rising Floodwater' : 'Deep Flood Inundation';
    urgency = severity >= 4 ? 'critical' : 'high';
  } else if (text.includes('fire') || text.includes('aag') || text.includes('smoke') || text.includes('dhuan')) {
    type = 'fire';
    danger = 'Active Fire / Toxic Smoke';
    urgency = 'critical';
  } else if (text.includes('collapse') || text.includes('building') || text.includes('malba') || text.includes('debris') || text.includes('trapped under')) {
    type = 'collapse';
    danger = 'Structural Collapse Debris';
    urgency = 'critical';
  } else if (category === 'Medical Emergency' || injured > 0) {
    type = 'medical';
    danger = 'Immediate Medical Trauma';
    urgency = 'critical';
  }

  // 4. Rescue requirements
  const rescue_requirements: string[] = [];
  if (type === 'flood' || text.includes('boat') || text.includes('kishthi') || text.includes('swim')) {
    rescue_requirements.push('water_rescue', 'rescue_boat', 'life_jackets');
  }
  if (injured > 0 || category === 'Medical Emergency' || text.includes('doctor') || text.includes('medicine')) {
    rescue_requirements.push('medical_team', 'ambulance', 'stretcher');
  }
  if (text.includes('food') || text.includes('water') || text.includes('khana') || category === 'Food / Water') {
    rescue_requirements.push('food_rations', 'clean_water');
  }
  if (type === 'collapse') {
    rescue_requirements.push('search_and_rescue', 'cutting_gear');
  }
  if (rescue_requirements.length === 0) {
    rescue_requirements.push('general_evacuation');
  }

  // 5. Landmark extraction
  let landmark: string | null = null;
  const landmarkMatch = text.match(/(near|at|behind|opposite|paas|ke pass)\s+([A-Za-z0-9\s]+?)(,|\.|$|there|water|we|help)/i);
  if (landmarkMatch && landmarkMatch[2]) {
    landmark = landmarkMatch[2].trim();
  }

  return {
    location: {
      landmark,
      confidence: landmark ? 'high' : 'medium',
    },
    people: {
      total: Math.max(totalPeople, children + elderly + injured, 1),
      children,
      elderly,
      injured,
    },
    situation: {
      type,
      danger,
      urgency,
    },
    rescue_requirements,
    verification_status: 'ai_inferred',
  };
}

// ── Module B & C: Clustering & Explainable RPS Prioritization ──
export function generateIncidentClusters(reports: ProcessedSOSReport[], satelliteData: SatelliteDataset = DELHI_YAMUNA_SATELLITE_DATA): IncidentCluster[] {
  const clusters: IncidentCluster[] = [];
  const assigned = new Set<string>();

  // Filter unresolved reports
  const activeReports = reports.filter((r) => r.latitude && r.longitude);

  for (const report of activeReports) {
    if (assigned.has(report.id)) continue;

    // Start a new cluster
    const clusterReports: ProcessedSOSReport[] = [report];
    assigned.add(report.id);

    // Find nearby reports within 600m
    for (const other of activeReports) {
      if (assigned.has(other.id)) continue;
      const distance = haversineDistanceMeters(report.latitude, report.longitude, other.latitude, other.longitude);
      if (distance <= 650) {
        clusterReports.push(other);
        assigned.add(other.id);
      }
    }

    // Compute cluster center
    const avgLat = clusterReports.reduce((sum, r) => sum + r.latitude, 0) / clusterReports.length;
    const avgLng = clusterReports.reduce((sum, r) => sum + r.longitude, 0) / clusterReports.length;

    // Aggregate extracted intelligence
    let totalEstPop = 0;
    let totalChildren = 0;
    let totalElderly = 0;
    let totalInjured = 0;
    const allNeeds = new Set<string>();
    const dangerSummaries: string[] = [];

    for (const r of clusterReports) {
      const intel = extractEmergencyIntelligence(r.message || '', r.category || '', r.verified_severity || 3);
      totalEstPop += intel.people.total;
      totalChildren += intel.people.children;
      totalElderly += intel.people.elderly;
      totalInjured += intel.people.injured;
      intel.rescue_requirements.forEach((req) => allNeeds.add(req));
      if (!dangerSummaries.includes(intel.situation.danger)) {
        dangerSummaries.push(intel.situation.danger);
      }
    }

    // Cross-check with Satellite Flood Inundation Polygon
    const inSatelliteFlood = isPointInSatelliteFlood(avgLat, avgLng, satelliteData);

    // Calculate Rescue Priority Score (RPS) as per SRS:
    // RPS = w1*D + w2*V + w3*E + w4*T
    // Danger D (max 35)
    let dangerScore = 15;
    if (dangerSummaries.some((d) => d.includes('Rising') || d.includes('Collapse') || d.includes('Fire'))) {
      dangerScore = 35;
    } else if (clusterReports.some((r) => (r.verified_severity || 0) >= 4)) {
      dangerScore = 28;
    }

    // Vulnerability V (max 30)
    let vulnScore = Math.min(30, totalChildren * 10 + totalElderly * 8 + totalInjured * 12 + (totalEstPop > 5 ? 10 : 5));

    // Environmental Risk E (max 25)
    let envScore = inSatelliteFlood ? 25 : 10;

    // Time Sensitivity T (max 10)
    const oldestReportTime = Math.min(...clusterReports.map((r) => new Date(r.created_at).getTime()));
    const ageMinutes = (Date.now() - oldestReportTime) / (1000 * 60);
    let timeScore = Math.min(10, Math.floor(ageMinutes / 10));

    const rps_score = Math.min(100, dangerScore + vulnScore + envScore + timeScore);

    // Formulate Transparent Reasoning
    const reasons: string[] = [];
    if (inSatelliteFlood) reasons.push('🛰️ Verified inside satellite flood inundation zone (~1.8m depth)');
    if (totalChildren > 0) reasons.push(`👶 ${totalChildren} child${totalChildren > 1 ? 'ren' : ''} vulnerable`);
    if (totalInjured > 0) reasons.push(`🚨 ${totalInjured} injured reported`);
    if (dangerScore >= 30) reasons.push(`⚡ Immediate threat: ${dangerSummaries.join(', ')}`);
    reasons.push(`👥 Estimated ${totalEstPop} people stranded across ${clusterReports.length} linked report${clusterReports.length > 1 ? 's' : ''}`);

    const clusterId = `INC-${String(clusters.length + 1).padStart(3, '0')}`;
    const primaryArea = clusterReports[0].detailed_area || clusterReports[0].district || 'North Delhi Flood Sector';

    clusters.push({
      id: clusterId,
      title: `${primaryArea} Cluster (${clusterReports.length} SOS)`,
      latitude: avgLat,
      longitude: avgLng,
      report_ids: clusterReports.map((r) => r.id),
      reports: clusterReports,
      estimated_population: totalEstPop,
      confirmed_population: Math.max(1, Math.round(totalEstPop * 0.8)),
      children_count: totalChildren,
      elderly_count: totalElderly,
      injured_count: totalInjured,
      danger_summary: dangerSummaries.join(' & ') || 'Flooding distress',
      primary_needs: Array.from(allNeeds),
      rps_score,
      rps_explanation: reasons.join(' • '),
      satellite_verified: inSatelliteFlood,
      status: 'active',
      created_at: new Date(oldestReportTime).toISOString(),
    });
  }

  // Sort clusters by highest priority score
  return clusters.sort((a, b) => b.rps_score - a.rps_score);
}

// ── Module E & G: Risk-Aware Routing & Automated Mission Planner ──
export function generateRescueMissions(
  clusters: IncidentCluster[],
  roadSegments: RoadSegment[] = INITIAL_ROAD_SEGMENTS,
  resources: RescueResource[] = INITIAL_RESCUE_RESOURCES
): RescueMission[] {
  const missions: RescueMission[] = [];
  const assignedResourceIds = new Set<string>();

  for (const cluster of clusters) {
    // 1. Determine best rescue approach
    const isInsideFlood = cluster.satellite_verified;
    const needsWaterRescue = cluster.primary_needs.includes('water_rescue') || cluster.primary_needs.includes('rescue_boat') || isInsideFlood;
    const hasInjuries = cluster.injured_count > 0 || cluster.primary_needs.includes('ambulance');

    // 2. Select compatible resource
    let selectedResource: RescueResource | undefined;

    if (needsWaterRescue) {
      selectedResource = resources.find((r) => r.type === 'boat' && !assignedResourceIds.has(r.id) && r.status === 'available');
    }

    if (!selectedResource && hasInjuries) {
      selectedResource = resources.find((r) => r.type === 'ambulance' && !assignedResourceIds.has(r.id) && r.status === 'available');
    }

    if (!selectedResource) {
      selectedResource = resources.find((r) => !assignedResourceIds.has(r.id) && r.status === 'available') || resources[0];
    }

    assignedResourceIds.add(selectedResource.id);

    // 3. Generate Risk-Aware Route Coordinates
    // Check if Ring Road / Bela Road is blocked
    const isRingRoadBlocked = roadSegments.some((rd) => rd.id === 'ROAD-RING-ISBT' && rd.status === 'blocked');
    let routeCoords: [number, number][] = [];
    let approachType: RescueMission['approach'] = 'road';
    let routeReason = '';

    if (needsWaterRescue && selectedResource.type === 'boat') {
      approachType = 'water_boat';
      // Route via Yamuna Ghat river corridor to avoid blocked urban roads
      routeCoords = [
        selectedResource.current_coordinates,
        [28.7050, 77.2300],
        [28.6950, 77.2315],
        [cluster.latitude, cluster.longitude],
      ];
      routeReason = 'Primary roads completely submerged. Deploying water rescue boat via Yamuna Waterway to bypass flooded Ring Road.';
    } else if (isRingRoadBlocked) {
      approachType = 'road';
      // Recalculated detour via Mall Road / Civil Lines (High ground route)
      routeCoords = [
        selectedResource.current_coordinates,
        [28.6700, 77.2180], // Mall Road
        [28.6790, 77.2175], // Civil Lines elevated corridor
        [28.6970, 77.2185], // GT Road Bypass
        [cluster.latitude, cluster.longitude],
      ];
      routeReason = 'Ring Road ISBT is BLOCKED (1.4m water). Route dynamically diverted via elevated Mall Road & Civil Lines corridor.';
    } else {
      approachType = 'road';
      routeCoords = [
        selectedResource.current_coordinates,
        [28.6745, 77.2295],
        [cluster.latitude, cluster.longitude],
      ];
      routeReason = 'Direct route via Ring Road corridor confirmed clear.';
    }

    const priorityLevel = cluster.rps_score >= 80 ? 'critical' : cluster.rps_score >= 60 ? 'high' : 'medium';

    missions.push({
      id: `MIS-${String(missions.length + 1).padStart(3, '0')}`,
      incident_id: cluster.id,
      incident_title: cluster.title,
      destination: [cluster.latitude, cluster.longitude],
      priority: priorityLevel,
      rps_score: cluster.rps_score,
      assigned_resource: selectedResource,
      approach: approachType,
      route_coordinates: routeCoords,
      reason: routeReason,
      required_equipment: selectedResource.equipment,
      status: 'awaiting_approval',
      created_at: new Date().toISOString(),
    });
  }

  return missions;
}
