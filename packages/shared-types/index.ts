// ResQNet Shared Types
// Used by both Mobile App and Dashboard

// ── SOS Categories ──────────────────────────────────────────
export const SOS_CATEGORIES = [
  'Medical Emergency',
  'Rescue Needed',
  'Food / Water',
  'Fire',
  'Missing Person',
  'Women Safety',
  'Shelter Needed',
  'Other',
] as const;

export type SOSCategory = (typeof SOS_CATEGORIES)[number];

// Category colors used across apps
export const CATEGORY_COLORS: Record<SOSCategory, string> = {
  'Medical Emergency': '#ef4444',
  'Rescue Needed': '#f97316',
  'Food / Water': '#eab308',
  'Fire': '#dc2626',
  'Missing Person': '#8b5cf6',
  'Women Safety': '#ec4899',
  'Shelter Needed': '#06b6d4',
  'Other': '#94a3b8',
};

// ── Severity Levels ─────────────────────────────────────────
export const SEVERITY_LEVELS = {
  1: { label: 'Low', color: '#3b82f6' },
  2: { label: 'Moderate', color: '#06b6d4' },
  3: { label: 'Important', color: '#eab308' },
  4: { label: 'High', color: '#f97316' },
  5: { label: 'Critical', color: '#ef4444' },
} as const;

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Important',
  4: 'High',
  5: 'Critical',
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  1: '#3b82f6',
  2: '#06b6d4',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

export const SEVERITY_BG_COLORS: Record<SeverityLevel, string> = {
  1: '#1e3a5f',
  2: '#164e63',
  3: '#713f12',
  4: '#7c2d12',
  5: '#7f1d1d',
};

// ── Status ──────────────────────────────────────────────────
export const SOS_STATUSES = ['pending', 'processed', 'in_progress', 'resolved'] as const;
export type SOSStatus = (typeof SOS_STATUSES)[number];

export interface ProcessedSOSReport {
  id: string;
  source_project?: string | null;
  name: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  category: SOSCategory | string | null;
  message: string | null;
  created_at: string;
  district: string | null;
  detailed_area?: string | null;
  verified_severity: number | null;
  supply_requirements: Record<string, number> | null;
  casualties_reported: boolean | null;
  processed_at: string | null;
  rephrased_message: string | null;
}

export interface DisasterAnalytics {
  id: string;
  source_project?: string | null;
  district: string;
  date_bucket: string;
  total_incidents: number | null;
  avg_severity: number | null;
  critical_needs: Record<string, number> | null;
  last_updated: string | null;
  overall_summary: string | null;
}

// ── User Roles ──────────────────────────────────────────────
export const USER_ROLES = ['admin', 'official', 'ngo', 'volunteer', 'public'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ── Database Models ─────────────────────────────────────────
export interface SOSReport {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  district?: string | null;
  category: SOSCategory;
  severity: SeverityLevel;
  message: string | null;
  status: SOSStatus;
  assigned_to: string | null;
  source_device: string | null;
  synced_at: string | null;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  contact: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Offline Queue Types (Mobile Only) ───────────────────────
export interface QueuedSOSReport {
  id: string; // client-generated UUID
  name: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  district?: string | null;
  category: SOSCategory;
  severity: SeverityLevel;
  message: string | null;
  created_at: string;
  source_device: string;
  synced: boolean;
  retry_count: number;
}

// ── Category Icons (emoji mapping) ──────────────────────────
export const CATEGORY_ICONS: Record<SOSCategory, string> = {
  'Medical Emergency': '🏥',
  'Rescue Needed': '🆘',
  'Food / Water': '🍞',
  'Fire': '🔥',
  'Missing Person': '🔍',
  'Women Safety': '🛡️',
  'Shelter Needed': '🏠',
  'Other': '⚠️',
};

// ── Marker Colors by Severity ───────────────────────────────
export const MARKER_COLORS: Record<SeverityLevel, string> = {
  1: '#3b82f6', // Blue - Low
  2: '#06b6d4', // Cyan - Moderate
  3: '#eab308', // Yellow - Important
  4: '#f97316', // Orange - High
  5: '#ef4444', // Red - Critical
};


// ══════════════════════════════════════════════════════════════
// ── AFTERMATH (v2.1) Intelligence & Rescue Orchestration Types ─
// ══════════════════════════════════════════════════════════════

export interface ExtractedEmergencyInfo {
  location: {
    landmark: string | null;
    coordinates?: [number, number] | null;
    confidence: 'low' | 'medium' | 'high';
  };
  people: {
    total: number;
    children: number;
    elderly: number;
    injured: number;
  };
  situation: {
    type: 'flood' | 'fire' | 'collapse' | 'medical' | 'other';
    danger: string;
    urgency: 'low' | 'moderate' | 'high' | 'critical';
  };
  rescue_requirements: string[];
  verification_status: 'unverified' | 'ai_inferred' | 'field_verified' | 'satellite_verified';
}

export interface IncidentCluster {
  id: string; // INC-001
  title: string;
  latitude: number;
  longitude: number;
  report_ids: string[];
  reports: ProcessedSOSReport[];
  estimated_population: number;
  confirmed_population: number;
  children_count: number;
  elderly_count: number;
  injured_count: number;
  danger_summary: string;
  primary_needs: string[];
  rps_score: number; // Rescue Priority Score 0-100
  rps_explanation: string;
  satellite_verified: boolean;
  status: 'active' | 'assigned' | 'in_progress' | 'resolved';
  created_at: string;
}

export type RoadStatus = 'accessible' | 'blocked' | 'unsafe' | 'unknown';

export interface RoadSegment {
  id: string;
  name: string;
  coordinates: [number, number][]; // Array of [lat, lng]
  status: RoadStatus;
  flood_depth_meters?: number;
  source: 'field_report' | 'satellite_detection' | 'official';
  last_updated: string;
}

export interface RescueResource {
  id: string;
  name: string;
  type: 'boat' | 'truck_4x4' | 'ambulance' | 'personnel';
  capacity: number;
  station: string;
  station_coordinates: [number, number];
  current_coordinates: [number, number];
  status: 'available' | 'deployed' | 'standby';
  equipment: string[];
}

export interface RescueMission {
  id: string; // MIS-001
  incident_id: string;
  incident_title: string;
  destination: [number, number];
  priority: 'critical' | 'high' | 'medium' | 'low';
  rps_score: number;
  assigned_resource: RescueResource;
  approach: 'road' | 'water_boat' | 'multi_modal';
  route_coordinates: [number, number][];
  reason: string;
  required_equipment: string[];
  status: 'awaiting_approval' | 'approved' | 'dispatched' | 'completed' | 'cancelled';
  dispatched_at?: string;
  created_at: string;
}

export interface BuildingDamageItem {
  id: string;
  name: string;
  type: 'residential' | 'school' | 'hospital' | 'commercial' | 'critical_infra';
  coordinates: [number, number];
  damage_level: 'collapsed' | 'severe' | 'moderate' | 'safe';
  damage_description: string;
  sensor_source: string;
  confidence: number;
  people_trapped?: number;
  rescue_assigned?: boolean;
}

export interface SatelliteDataset {
  id: string;
  region: string;
  pre_disaster_date: string;
  post_disaster_date: string;
  pre_image_url: string;
  post_image_url: string;
  bounds: [[number, number], [number, number]]; // [[minLat, minLng], [maxLat, maxLng]]
  flood_polygons: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: {
        zone_id: string;
        name: string;
        estimated_depth_m: number;
        confidence: number;
        satellite_source: string;
      };
      geometry: {
        type: 'Polygon';
        coordinates: number[][][]; // GeoJSON uses [lng, lat]
      };
    }>;
  };
}
