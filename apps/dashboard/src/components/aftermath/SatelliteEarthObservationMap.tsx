import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  IncidentCluster,
  RoadSegment,
  RescueResource,
  RescueMission,
  SatelliteDataset,
  BuildingDamageItem,
} from '@resqnet/shared-types';
import '../map/MapStyles.css';
import './AftermathComponents.css';

interface SatelliteEarthObservationMapProps {
  clusters: IncidentCluster[];
  roadSegments: RoadSegment[];
  resources: RescueResource[];
  missions: RescueMission[];
  satelliteData: SatelliteDataset;
  buildings?: BuildingDamageItem[];
  selectedClusterId?: string;
  selectedBuildingId?: string;
  onClusterSelect?: (cluster: IncidentCluster) => void;
  onBuildingSelect?: (building: BuildingDamageItem) => void;
  onSelectMission?: (mission: RescueMission) => void;
}

function MapController({
  onMap,
  center,
}: {
  onMap: (map: L.Map) => void;
  center: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    map.setView(center, 13);
  }, [map, onMap, center]);
  return null;
}

export default function SatelliteEarthObservationMap({
  clusters,
  roadSegments,
  resources,
  missions,
  satelliteData,
  buildings = [],
  selectedClusterId,
  selectedBuildingId,
  onClusterSelect,
  onBuildingSelect,
}: SatelliteEarthObservationMapProps) {
  const [, setMapRef] = useState<L.Map | null>(null);

  // Satellite Earth Observation View Modes
  // 'ai_damage': Full ML analysis overlay on satellite
  // 'pre_disaster': Pristine baseline satellite imagery
  // 'post_disaster': Post-event satellite imagery with boundary
  const [viewMode, setViewMode] = useState<'ai_damage' | 'pre_disaster' | 'post_disaster'>('ai_damage');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [swipeSplit, setSwipeSplit] = useState(50); // percentage for split comparison

  // Layer Visibility Toggles
  const [showInundationMask, setShowInundationMask] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showMissions, setShowMissions] = useState(true);

  // Dynamic Center based on scenario bounds or clusters
  const center = useMemo<[number, number]>(() => {
    if (clusters.length > 0) {
      return [clusters[0].latitude, clusters[0].longitude];
    }
    if (satelliteData?.bounds) {
      const [[minLat, minLng], [maxLat, maxLng]] = satelliteData.bounds;
      return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
    }
    return [28.686, 77.228];
  }, [clusters, satelliteData]);

  // GeoJSON style for satellite detected flood/rubble change polygon
  const changeGeoJsonStyle = useMemo(() => {
    const isPre = viewMode === 'pre_disaster';
    return {
      fillColor: '#00f0ff',
      weight: isPre ? 0 : 2.5,
      opacity: isPre ? 0 : 0.95,
      color: '#00ffff',
      dashArray: '4, 4',
      fillOpacity: isPre ? 0 : 0.32,
    };
  }, [viewMode]);

  // Determine if overlays should show based on viewMode and splitSlider
  const overlaysVisible = viewMode !== 'pre_disaster';

  return (
    <div className="map-shell aftermath-map-shell">
      {/* Top Glassmorphic Control Bar (ResQNet Design Language) */}
      <div className="map-overlay">
        <div className="map-panel map-header-panel">
          <div className="map-title">COPERNICUS EARTH OBSERVATION & CHANGE DETECTION</div>
          <div className="map-subtitle">
            {viewMode === 'pre_disaster' && `BASELINE: ${satelliteData.pre_disaster_date}`}
            {viewMode === 'post_disaster' && `POST-EVENT: ${satelliteData.post_disaster_date}`}
            {viewMode === 'ai_damage' && `AI ML DAMAGE ASSESSMENT: ${satelliteData.region}`}
          </div>
        </div>

        <div className="map-panel map-actions">
          {/* Observation Mode Selector Pills */}
          <div className="map-layer-toggle" role="group" aria-label="Satellite Observation Mode">
            <button
              type="button"
              className={viewMode === 'pre_disaster' && !isSplitMode ? 'is-active' : ''}
              onClick={() => {
                setViewMode('pre_disaster');
                setIsSplitMode(false);
              }}
              title="View Earth observation imagery captured prior to catastrophe"
            >
              Pre-Disaster
            </button>
            <button
              type="button"
              className={viewMode === 'post_disaster' && !isSplitMode ? 'is-active' : ''}
              onClick={() => {
                setViewMode('post_disaster');
                setIsSplitMode(false);
              }}
              title="View Earth observation imagery captured right after event"
            >
              Post-Disaster
            </button>
            <button
              type="button"
              className={viewMode === 'ai_damage' && !isSplitMode ? 'is-active' : ''}
              onClick={() => {
                setViewMode('ai_damage');
                setIsSplitMode(false);
              }}
              title="View AI change detection mask, damaged buildings, and route graph"
            >
              AI Damage Mask
            </button>
            <button
              type="button"
              className={isSplitMode ? 'is-active' : ''}
              onClick={() => setIsSplitMode((prev) => !prev)}
              title="Compare Before vs After with an interactive swipe curtain"
            >
              {isSplitMode ? 'Exit Split' : '↔ Swipe Wipe'}
            </button>
          </div>

          {/* Layer Visibility Toggles */}
          {overlaysVisible && (
            <>
              <button
                type="button"
                style={{
                  background: showInundationMask ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: showInundationMask ? '#00f0ff' : 'var(--glass-stroke)',
                  color: showInundationMask ? '#00f0ff' : 'var(--text-muted)',
                }}
                onClick={() => setShowInundationMask((prev) => !prev)}
              >
                Change Extent
              </button>
              <button
                type="button"
                style={{
                  background: showBuildings ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: showBuildings ? '#ef4444' : 'var(--glass-stroke)',
                  color: showBuildings ? '#ef4444' : 'var(--text-muted)',
                }}
                onClick={() => setShowBuildings((prev) => !prev)}
              >
                Buildings ({buildings.length})
              </button>
              <button
                type="button"
                style={{
                  background: showRoads ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: showRoads ? '#22c55e' : 'var(--glass-stroke)',
                  color: showRoads ? '#22c55e' : 'var(--text-muted)',
                }}
                onClick={() => setShowRoads((prev) => !prev)}
              >
                Roads ({roadSegments.length})
              </button>
              <button
                type="button"
                style={{
                  background: showMissions ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: showMissions ? '#fbbf24' : 'var(--glass-stroke)',
                  color: showMissions ? '#fbbf24' : 'var(--text-muted)',
                }}
                onClick={() => setShowMissions((prev) => !prev)}
              >
                Rescue Routes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive On-Map Split Swipe Slider when Split Mode is Active */}
      {isSplitMode && (
        <div className="on-map-split-bar">
          <span className="split-tag">PRE-DISASTER ({swipeSplit}%)</span>
          <input
            type="range"
            min="0"
            max="100"
            value={swipeSplit}
            onChange={(e) => setSwipeSplit(Number(e.target.value))}
            className="split-slider"
          />
          <span className="split-tag">POST-DISASTER ({100 - swipeSplit}%)</span>
        </div>
      )}

      {/* Map Legend (ResQNet High-Tech Glass Style) */}
      <div className="map-legend">
        <div className="map-legend-title">SATELLITE & DAMAGE OVERLAYS</div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#00f0ff', boxShadow: '0 0 6px #00f0ff' }} />
          <span>Impact / Water Mask</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#ef4444' }} />
          <span>Collapsed / Submerged Building</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#f97316' }} />
          <span>Severe Structural Damage</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#22c55e' }} />
          <span>Passable Elevated Road</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#0284c7' }} />
          <span>NDRF Rescue Base</span>
        </div>
      </div>

      {/* Leaflet Map Stage */}
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapController onMap={setMapRef} center={center} />

        {/* 1. Base Earth Observation Satellite Imagery (Real Space Imagery) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri, Maxar, Earthstar Geographics'
          className="map-tiles map-tiles--base"
        />

        {/* Boundary & Place Labels Overlay */}
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=" "
          className="map-tiles map-tiles--labels"
        />

        {/* 2. Copernicus Sentinel Flood / Rubble Inundation Mask (NDWI/SAR Change Detection) */}
        {overlaysVisible && showInundationMask && satelliteData.flood_polygons && (
          <GeoJSON
            key={`flood-${viewMode}-${satelliteData.id}`}
            data={satelliteData.flood_polygons as any}
            style={changeGeoJsonStyle}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              layer.bindTooltip(
                `<div class="tactical-tooltip">
                  <strong>🛰️ ${props.name}</strong><br/>
                  <span>Sensor: ${props.satellite_source}</span><br/>
                  <span>Est. Depth/Severity: <strong>${props.estimated_depth_m > 0 ? `${props.estimated_depth_m}m` : 'High Rubble Field'}</strong></span><br/>
                  <span>Confidence: <strong>${Math.round(props.confidence * 100)}%</strong></span>
                </div>`,
                { sticky: true }
              );
            }}
          />
        )}

        {/* 3. Road Network Segments */}
        {overlaysVisible && showRoads &&
          roadSegments.map((road) => {
            const isBlocked = road.status === 'blocked';
            const color = isBlocked ? '#ef4444' : road.status === 'unsafe' ? '#f97316' : '#22c55e';
            return (
              <Polyline
                key={road.id}
                positions={road.coordinates}
                color={color}
                weight={isBlocked ? 5.5 : 4}
                dashArray={isBlocked ? '6, 8' : undefined}
                opacity={0.92}
              >
                <Tooltip sticky>
                  <div>
                    <strong>{road.name}</strong><br />
                    <span>Status: <strong>{road.status.toUpperCase()}</strong></span><br />
                    {road.flood_depth_meters !== undefined && road.flood_depth_meters > 0 && (
                      <span>Water Depth: {road.flood_depth_meters}m</span>
                    )}
                    <div>{road.last_updated}</div>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* 4. Active Rescue Vectors (Routes) */}
        {overlaysVisible && showMissions &&
          missions.map((m) => {
            const isBoat = m.approach === 'water_boat';
            return (
              <Polyline
                key={m.id}
                positions={m.route_coordinates}
                color={isBoat ? '#38bdf8' : '#fbbf24'}
                weight={3.5}
                dashArray="5, 6"
                opacity={0.95}
              >
                <Tooltip sticky>
                  <div>
                    <strong>{m.id}: {m.assigned_resource.name}</strong><br />
                    <span>Approach: {isBoat ? 'Waterway (Amphibious Boat)' : 'Heavy High-Clearance Road'}</span>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* 5. Building-Level Damage Assessment (Exact User Requirement) */}
        {overlaysVisible && showBuildings &&
          buildings.map((bld) => {
            const isCollapsed = bld.damage_level === 'collapsed';
            const isSevere = bld.damage_level === 'severe';
            const isSelected = selectedBuildingId === bld.id;
            const markerColor =
              isCollapsed ? '#ef4444' : isSevere ? '#f97316' : bld.damage_level === 'moderate' ? '#eab308' : '#22c55e';

            return (
              <CircleMarker
                key={bld.id}
                center={bld.coordinates}
                radius={isSelected ? 14 : isCollapsed ? 11 : 9}
                pathOptions={{
                  fillColor: markerColor,
                  color: isSelected ? '#ffffff' : '#0f172a',
                  weight: isSelected ? 3 : 2,
                  fillOpacity: 0.95,
                }}
                eventHandlers={{
                  click: () => onBuildingSelect?.(bld),
                }}
              >
                <Tooltip direction="top">
                  <span>🏢 {bld.name} ({bld.damage_level.toUpperCase()})</span>
                </Tooltip>
                <Popup>
                  <div className="struct-popup">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{bld.name}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: markerColor,
                          color: '#ffffff',
                          textTransform: 'uppercase',
                        }}
                      >
                        {bld.damage_level}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, color: '#cbd5e1', fontSize: 11 }}>
                      {bld.damage_description}
                    </div>
                    {bld.people_trapped !== undefined && bld.people_trapped > 0 && (
                      <div style={{ color: '#ff5b5b', fontWeight: 700, fontSize: 11, marginTop: 4 }}>
                        🚨 {bld.people_trapped} people trapped inside
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                      Sensor: {bld.sensor_source} &bull; AI Conf: {Math.round(bld.confidence * 100)}%
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 6. Rescue Resources & Depots */}
        {overlaysVisible &&
          resources.map((res) => {
            const isBoat = res.type === 'boat';
            return (
              <CircleMarker
                key={res.id}
                center={res.current_coordinates}
                radius={9}
                pathOptions={{
                  fillColor: isBoat ? '#0284c7' : '#16a34a',
                  color: '#ffffff',
                  weight: 2,
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top">
                  <span>{isBoat ? '⚓' : '🚒'} {res.name}</span>
                </Tooltip>
                <Popup>
                  <div className="struct-popup">
                    <strong style={{ color: '#f1f5f9' }}>{isBoat ? '⚓ Water Unit' : '🚒 Heavy SAR Unit'}: {res.name}</strong>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Base: {res.station}</div>
                    <div style={{ color: '#2dd4bf', fontWeight: 700, fontSize: 11, marginTop: 2 }}>
                      Status: {res.status.toUpperCase()} &bull; Capacity: {res.capacity} pers
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 7. Correlated Ground SOS Incident Clusters */}
        {overlaysVisible &&
          clusters.map((cluster) => {
            const isSelected = selectedClusterId === cluster.id;
            return (
              <CircleMarker
                key={cluster.id}
                center={[cluster.latitude, cluster.longitude]}
                radius={isSelected ? 16 : 12}
                pathOptions={{
                  fillColor: cluster.rps_score >= 80 ? '#ef4444' : '#f97316',
                  color: cluster.satellite_verified ? '#00f0ff' : '#ffffff',
                  weight: cluster.satellite_verified ? 3.5 : 2,
                  fillOpacity: 0.9,
                }}
                eventHandlers={{
                  click: () => onClusterSelect?.(cluster),
                }}
              >
                <Tooltip direction="top">
                  {cluster.id} &bull; RPS {cluster.rps_score}/100
                </Tooltip>
                <Popup>
                  <div className="struct-popup">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#f1f5f9' }}>{cluster.title}</strong>
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        RPS {cluster.rps_score}/100
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: '#e2e8f0' }}>
                      Stranded Population: <strong>~{cluster.estimated_population} people</strong>
                    </div>
                    {cluster.satellite_verified && (
                      <div style={{ color: '#00f0ff', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                        🛰️ Confirmed in Satellite Change Boundary
                      </div>
                    )}
                    <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                      {cluster.rps_explanation}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}