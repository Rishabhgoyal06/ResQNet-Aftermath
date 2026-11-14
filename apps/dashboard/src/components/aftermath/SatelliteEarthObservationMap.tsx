import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
  Pane,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sparkles, X } from 'lucide-react';
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
  centerCoordinates: [number, number];
  zoomLevel?: number;
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

// Map Controller for smooth flyTo on coordinate change
function MapController({
  center,
  zoom,
  onMap,
}: {
  center: [number, number];
  zoom: number;
  onMap?: (map: L.Map) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (onMap) onMap(map);
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [map, center, zoom, onMap]);
  return null;
}

export default function SatelliteEarthObservationMap({
  centerCoordinates,
  zoomLevel = 13,
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
  const [viewMode, setViewMode] = useState<'ai_damage' | 'pre_disaster' | 'post_disaster'>('ai_damage');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [swipeSplit, setSwipeSplit] = useState(50); // percentage for split comparison

  // Dragging state for real on-map curtain wipe
  const [isDraggingWipe, setIsDraggingWipe] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Satellite Imagery Provider
  const [satelliteProvider, setSatelliteProvider] = useState<'esri' | 'nasa_gibs'>('esri');
  const [isAiHudOpen, setIsAiHudOpen] = useState(false);

  // Layer Visibility Toggles
  const [showInundationMask, setShowInundationMask] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showMissions, setShowMissions] = useState(true);

  // GeoJSON style for satellite detected change polygon
  const changeGeoJsonStyle = useMemo(() => {
    const isPre = viewMode === 'pre_disaster' && !isSplitMode;
    return {
      fillColor: '#00f0ff',
      weight: isPre ? 0 : 2.5,
      opacity: isPre ? 0 : 0.95,
      color: '#00ffff',
      dashArray: '4, 4',
      fillOpacity: isPre ? 0 : 0.35,
    };
  }, [viewMode, isSplitMode]);

  // Determine if overlays should show based on viewMode
  const overlaysVisible = viewMode !== 'pre_disaster' || isSplitMode;

  // Tile URLs
  const activeDate = viewMode === 'pre_disaster' ? satelliteData.pre_disaster_date : satelliteData.post_disaster_date;
  const nasaGibsTileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${activeDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
  const esriTileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`;

  // Interactive Curtain Wipe Mouse/Touch Drag Handlers
  const handleWipeMove = useCallback((clientX: number) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, Math.round((x / rect.width) * 100)));
    setSwipeSplit(pct);
  }, []);

  const handleMouseDownWipe = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWipe(true);
  };

  useEffect(() => {
    if (!isDraggingWipe) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleWipeMove(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingWipe(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWipe, handleWipeMove]);

  return (
    <div
      className="map-shell aftermath-map-shell"
      ref={mapContainerRef}
      style={{ userSelect: isDraggingWipe ? 'none' : 'auto' }}
    >
      {/* Top Glassmorphic Control Bar */}
      <div className="map-overlay">
        <div className="map-panel map-header-panel">
          <div className="map-title">COPERNICUS & NASA EARTH OBSERVATION INTELLIGENCE</div>
          <div className="map-subtitle">
            {isSplitMode
              ? `CURTAIN WIPE: PRE (${satelliteData.pre_disaster_date}) vs POST (${satelliteData.post_disaster_date})`
              : viewMode === 'pre_disaster'
              ? `BASELINE SATELLITE: ${satelliteData.pre_disaster_date}`
              : viewMode === 'post_disaster'
              ? `POST-EVENT SATELLITE: ${satelliteData.post_disaster_date}`
              : `AI ML DAMAGE ASSESSMENT: ${satelliteData.region}`}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="map-panel map-viewmode-panel">
          <button
            type="button"
            className={`viewmode-btn ${viewMode === 'pre_disaster' && !isSplitMode ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('pre_disaster');
              setIsSplitMode(false);
            }}
          >
            Pre-Disaster
          </button>
          <button
            type="button"
            className={`viewmode-btn ${viewMode === 'post_disaster' && !isSplitMode ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('post_disaster');
              setIsSplitMode(false);
            }}
          >
            Post-Disaster
          </button>
          <button
            type="button"
            className={`viewmode-btn ${viewMode === 'ai_damage' && !isSplitMode ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('ai_damage');
              setIsSplitMode(false);
            }}
          >
            AI Damage Mask
          </button>
          <button
            type="button"
            className={`viewmode-btn split-toggle-btn ${isSplitMode ? 'is-active-split' : ''}`}
            onClick={() => setIsSplitMode((prev) => !prev)}
            title="Curtain swipe wipe slider comparison"
          >
            {isSplitMode ? 'Exit Curtain' : '↔ Curtain Swipe'}
          </button>
        </div>

        {/* Satellite Provider & AI HUD Buttons */}
        <div className="map-panel map-layers-panel">
          <button
            type="button"
            style={{
              background: satelliteProvider === 'nasa_gibs' ? 'rgba(76, 201, 255, 0.25)' : 'rgba(255,255,255,0.05)',
              borderColor: satelliteProvider === 'nasa_gibs' ? '#00f0ff' : 'var(--glass-stroke)',
              color: satelliteProvider === 'nasa_gibs' ? '#00f0ff' : 'var(--text-muted)',
              fontWeight: 700,
            }}
            onClick={() => setSatelliteProvider((p) => (p === 'esri' ? 'nasa_gibs' : 'esri'))}
            title="Switch between NASA Daily MODIS/VIIRS True Color vs Esri High-Resolution Satellite"
          >
            {satelliteProvider === 'nasa_gibs' ? '🛰️ NASA GIBS (True Color)' : '🛰️ Esri High-Res'}
          </button>

          <button
            type="button"
            style={{
              background: isAiHudOpen ? 'linear-gradient(135deg, #1d9bf0 0%, #00f0ff 100%)' : 'rgba(76, 201, 255, 0.15)',
              borderColor: '#00f0ff',
              color: isAiHudOpen ? '#070d19' : '#00f0ff',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => setIsAiHudOpen((prev) => !prev)}
          >
            <Sparkles size={12} />
            <span>AI Damage Brief</span>
          </button>

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
                Change Polygon
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

      {/* REAL WORKING ON-MAP CURTAIN WIPE DIVIDER */}
      {isSplitMode && (
        <>
          {/* Top Floating Badges */}
          <div
            style={{
              position: 'absolute',
              top: 76,
              left: 20,
              zIndex: 1000,
              background: 'rgba(10, 14, 26, 0.85)',
              border: '1px solid rgba(122, 229, 130, 0.4)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#7ae582',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            ◀ PRE-DISASTER: {satelliteData.pre_disaster_date} (BASELINE)
          </div>

          <div
            style={{
              position: 'absolute',
              top: 76,
              right: 20,
              zIndex: 1000,
              background: 'rgba(10, 14, 26, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#ef4444',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            POST-DISASTER: {satelliteData.post_disaster_date} (HAZARDS) ▶
          </div>

          {/* Interactive Vertical Curtain Wipe Line with Grab Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${swipeSplit}%`,
              width: 4,
              background: '#00f0ff',
              boxShadow: '0 0 14px #00f0ff, 0 0 28px rgba(0, 240, 255, 0.5)',
              zIndex: 1000,
              cursor: 'ew-resize',
              transform: 'translateX(-50%)',
            }}
            onMouseDown={handleMouseDownWipe}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#0a0e1a',
                border: '2px solid #00f0ff',
                boxShadow: '0 0 16px rgba(0, 240, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f0ff',
                fontSize: 10,
                fontWeight: 900,
                cursor: 'ew-resize',
                userSelect: 'none',
              }}
            >
              ◀▶
            </div>
          </div>
        </>
      )}

      {/* Floating AI Intelligence Analysis HUD Drawer */}
      {isAiHudOpen && (
        <div
          style={{
            position: 'absolute',
            top: 76,
            right: 18,
            width: 360,
            maxHeight: 'calc(100% - 100px)',
            background: 'rgba(10, 14, 26, 0.94)',
            border: '1px solid rgba(76, 201, 255, 0.4)',
            borderRadius: 14,
            padding: 16,
            zIndex: 1000,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#00f0ff" />
              <strong style={{ fontSize: 13, color: '#ffffff', letterSpacing: '0.04em' }}>
                AI DISASTER RECOVERY BRIEF
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setIsAiHudOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.5 }}>
            <strong>Target Epicenter:</strong> {satelliteData.region} [{centerCoordinates[0].toFixed(3)}, {centerCoordinates[1].toFixed(3)}]
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              background: 'rgba(6, 10, 20, 0.6)',
              padding: 8,
              borderRadius: 8,
            }}
          >
            <div>
              <span style={{ fontSize: 9.5, color: '#7281a5' }}>Pre-Event Baseline</span>
              <div style={{ fontSize: 11.5, color: '#7ae582', fontWeight: 700 }}>
                {satelliteData.pre_disaster_date}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 9.5, color: '#7281a5' }}>Post-Event Observation</span>
              <div style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 700 }}>
                {satelliteData.post_disaster_date}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#b3bdd6', lineHeight: 1.4 }}>
            <strong>Operational Assessment:</strong> Multi-band satellite change extraction indicates high structural displacement. Fast recovery assets are mapped and route passability is synchronized in real time.
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: 8,
              fontSize: 9.5,
              color: '#64748b',
              fontFamily: 'var(--mono-family)',
            }}
          >
            Telemetry: NASA GIBS / UN GDACS / USGS Global Seismology
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="map-legend">
        <div className="map-legend-title">SATELLITE & DAMAGE OVERLAYS</div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#00f0ff', boxShadow: '0 0 6px #00f0ff' }} />
          <span>Active Impact / Hazard Mask</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#ef4444' }} />
          <span>Collapsed Building</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#f97316' }} />
          <span>Severe Damage</span>
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
        center={centerCoordinates}
        zoom={zoomLevel}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapController center={centerCoordinates} zoom={zoomLevel} onMap={setMapRef} />

        {/* 1. Base Earth Observation Satellite Imagery */}
        <TileLayer
          key={`${satelliteProvider}-${activeDate}`}
          url={satelliteProvider === 'nasa_gibs' ? nasaGibsTileUrl : esriTileUrl}
          attribution={
            satelliteProvider === 'nasa_gibs'
              ? '&copy; NASA EOSDIS GIBS / Terra MODIS'
              : '&copy; Esri, Maxar, Earthstar Geographics'
          }
          className="map-tiles map-tiles--base"
          maxNativeZoom={satelliteProvider === 'nasa_gibs' ? 9 : 19}
          maxZoom={19}
        />

        {/* Boundary & Place Labels Overlay */}
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=" "
          className="map-tiles map-tiles--labels"
        />

        {/* 2. REAL CLIPPED POST-DISASTER PANE (Active during Curtain Swipe or Normal Post Mode) */}
        <Pane
          name="postDisasterPane"
          style={{
            zIndex: 450,
            clipPath: isSplitMode ? `polygon(${swipeSplit}% 0, 100% 0, 100% 100%, ${swipeSplit}% 100%)` : undefined,
          }}
        >
          {/* Post-Disaster GeoJSON Inundation / Change Mask */}
          {overlaysVisible && showInundationMask && satelliteData.flood_polygons && (
            <GeoJSON
              key={`flood-${satelliteData.id}`}
              data={satelliteData.flood_polygons as any}
              style={changeGeoJsonStyle}
              onEachFeature={(feature, layer) => {
                const props = feature.properties || {};
                layer.bindTooltip(
                  `<div class="tactical-tooltip">
                    <strong>🛰️ ${props.name}</strong><br/>
                    <span>Sensor: ${props.satellite_source}</span><br/>
                    <span>Est. Depth/Severity: <strong>${props.estimated_depth_m > 0 ? `${props.estimated_depth_m}m` : 'Rubble Field'}</strong></span><br/>
                    <span>Confidence: <strong>${Math.round(props.confidence * 100)}%</strong></span>
                  </div>`,
                  { sticky: true }
                );
              }}
            />
          )}

          {/* Road Network Segments */}
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

          {/* Active Rescue Routes */}
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

          {/* Building Damage Markers */}
          {overlaysVisible && showBuildings &&
            buildings.map((bld) => {
              const isCollapsed = bld.damage_level === 'collapsed';
              const isSevere = bld.damage_level === 'severe';
              const isSelected = selectedBuildingId === bld.id;

              return (
                <CircleMarker
                  key={bld.id}
                  center={bld.coordinates}
                  radius={isSelected ? 10 : isCollapsed ? 8 : 6.5}
                  pathOptions={{
                    color: isCollapsed ? '#ff0033' : isSevere ? '#ff7700' : '#ffd166',
                    fillColor: isCollapsed ? '#ef4444' : isSevere ? '#f97316' : '#ffd166',
                    fillOpacity: isSelected ? 1 : 0.85,
                    weight: isSelected ? 3.5 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onBuildingSelect) onBuildingSelect(bld);
                    },
                  }}
                >
                  <Popup>
                    <div className="building-popup-box">
                      <div className="bld-pop-header">
                        <strong>{bld.name}</strong>
                        <span className={`bld-tag ${isCollapsed ? 'tag-crit' : 'tag-warn'}`}>
                          {bld.damage_level.toUpperCase()}
                        </span>
                      </div>
                      <div className="bld-pop-desc">{bld.damage_description}</div>
                      <div className="bld-pop-meta">
                        <div>Trapped: <strong>{bld.people_trapped || 0} Citizens</strong></div>
                        <div>Confidence: <strong>{Math.round(bld.confidence * 100)}%</strong></div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Rescue Resource Units */}
          {overlaysVisible &&
            resources.map((res) => (
              <CircleMarker
                key={res.id}
                center={res.current_coordinates}
                radius={8}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#0284c7',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ color: '#000', fontSize: 12 }}>
                    <strong>{res.name}</strong><br />
                    <span>Status: <strong>{res.status.toUpperCase()}</strong></span><br />
                    <span>Station: {res.station}</span>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Incident Clusters */}
          {overlaysVisible &&
            clusters.map((cluster) => {
              const isSelected = selectedClusterId === cluster.id;
              return (
                <CircleMarker
                  key={cluster.id}
                  center={[cluster.latitude, cluster.longitude]}
                  radius={isSelected ? 14 : 10}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#ef4444',
                    fillOpacity: isSelected ? 0.95 : 0.8,
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onClusterSelect) onClusterSelect(cluster);
                    },
                  }}
                >
                  <Popup>
                    <div style={{ color: '#000', fontSize: 12 }}>
                      <strong>{cluster.title}</strong><br />
                      <span>Trapped: <strong>{cluster.confirmed_population || cluster.estimated_population}</strong></span><br />
                      <span>RPS Priority: <strong>{cluster.rps_score.toFixed(1)}/100</strong></span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </Pane>
      </MapContainer>
    </div>
  );
}
