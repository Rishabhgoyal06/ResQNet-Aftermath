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
  ImageOverlay,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sparkles, X, RefreshCw, ShieldAlert, Route, Info } from 'lucide-react';
import type {
  IncidentCluster,
  RoadSegment,
  RescueResource,
  RescueMission,
  SatelliteDataset,
  BuildingDamageItem,
} from '@resqnet/shared-types';
import { generateDisasterSITREP, type DisasterSITREP } from '../../services/geminiService';
import {
  fetchCopernicusSentinelImage,
  type ProcessedSentinelImage,
  type SentinelPreset,
} from '../../services/copernicusService';
import type { DisasterEventRecord } from '../../services/indiaDisasterArchive';
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
  disasterRecord?: DisasterEventRecord;
  selectedClusterId?: string;
  selectedBuildingId?: string;
  onClusterSelect?: (cluster: IncidentCluster) => void;
  onBuildingSelect?: (building: BuildingDamageItem) => void;
  onSelectMission?: (mission: RescueMission) => void;
}

// Map Controller for immediate, accurate centering & resize on disaster change
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
    map.invalidateSize();
    map.setView(center, zoom, { animate: false });
  }, [map, center[0], center[1], zoom, onMap]);
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
  disasterRecord,
  selectedClusterId,
  selectedBuildingId,
  onClusterSelect,
  onBuildingSelect,
}: SatelliteEarthObservationMapProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  // Satellite Earth Observation View Modes
  const [viewMode, setViewMode] = useState<'ai_damage' | 'pre_disaster' | 'post_disaster'>('ai_damage');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [swipeSplit, setSwipeSplit] = useState(50); // percentage for split comparison

  // Dragging state for real on-map curtain wipe
  const [isDraggingWipe, setIsDraggingWipe] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Disable Leaflet map dragging when dragging the curtain wipe slider to prevent conflict
  useEffect(() => {
    if (isDraggingWipe) {
      mapInstanceRef.current?.dragging?.disable();
    } else {
      mapInstanceRef.current?.dragging?.enable();
    }
  }, [isDraggingWipe]);

  // Satellite Imagery Provider: 'esri' | 'copernicus' | 'nasa_gibs'
  const [satelliteProvider, setSatelliteProvider] = useState<'esri' | 'copernicus' | 'nasa_gibs'>('esri');
  const [copernicusPreset, setCopernicusPreset] = useState<SentinelPreset>('TRUE_COLOR');
  const [copernicusImage, setCopernicusImage] = useState<ProcessedSentinelImage | null>(null);
  const [isLoadingCopernicus, setIsLoadingCopernicus] = useState(false);

  // Gemini AI Tactical SITREP
  const [isAiHudOpen, setIsAiHudOpen] = useState(false);
  const [sitrep, setSitrep] = useState<DisasterSITREP | null>(null);
  const [isLoadingSitrep, setIsLoadingSitrep] = useState(false);

  // Layer Visibility Toggles
  const [showInundationMask, setShowInundationMask] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showMissions, setShowMissions] = useState(true);

  // Fetch Copernicus Sentinel-2 L2A optical image when provider is selected or preset changes
  useEffect(() => {
    if (satelliteProvider !== 'copernicus') return;

    let isMounted = true;
    setIsLoadingCopernicus(true);

    fetchCopernicusSentinelImage(
      centerCoordinates,
      copernicusPreset,
      satelliteData.post_disaster_date
    )
      .then((img) => {
        if (isMounted) {
          setCopernicusImage(img);
          setIsLoadingCopernicus(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingCopernicus(false);
      });

    return () => {
      isMounted = false;
    };
  }, [satelliteProvider, copernicusPreset, centerCoordinates, satelliteData.post_disaster_date]);

  // Fetch or refresh Gemini Tactical SITREP
  const handleFetchSitrep = useCallback(async () => {
    if (!disasterRecord) return;
    setIsLoadingSitrep(true);
    try {
      const result = await generateDisasterSITREP(
        disasterRecord,
        clusters,
        buildings,
        roadSegments
      );
      setSitrep(result);
    } catch (e) {
      console.warn('Failed to generate Gemini SITREP:', e);
    } finally {
      setIsLoadingSitrep(false);
    }
  }, [disasterRecord, clusters, buildings, roadSegments]);

  // Automatically trigger SITREP when AI HUD is opened if not yet loaded
  useEffect(() => {
    if (isAiHudOpen && !sitrep && !isLoadingSitrep && disasterRecord) {
      handleFetchSitrep();
    }
  }, [isAiHudOpen, sitrep, isLoadingSitrep, disasterRecord, handleFetchSitrep]);

  // Clear cached sitrep on disaster change so it refreshes dynamically
  useEffect(() => {
    setSitrep(null);
  }, [disasterRecord?.id]);

  // GeoJSON style for satellite detected change polygon
  const changeGeoJsonStyle = useMemo(() => {
    const isPre = viewMode === 'pre_disaster' && !isSplitMode;
    return {
      fillColor: '#a7c9ab',
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
    e.stopPropagation();
    setIsDraggingWipe(true);
  };

  const handleTouchStartWipe = (e: React.TouchEvent) => {
    e.stopPropagation();
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

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleWipeMove(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsDraggingWipe(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingWipe, handleWipeMove]);

  return (
    <div
      className="map-shell aftermath-map-shell"
      ref={mapContainerRef}
      style={{ userSelect: isDraggingWipe ? 'none' : 'auto' }}
    >
      {/* Top Glassmorphic Tactical Map Toolbar (Clean, Un-Cramped & Segmented) */}
      <div className="map-tactical-hud">
        {/* Left: Disaster Target Context */}
        <div className="hud-card hud-disaster-info">
          <div className="hud-disaster-header">
            <span className="hud-status-led" />
            <span className="hud-disaster-name">
              {disasterRecord?.title || satelliteData.region}
            </span>
          </div>
          <div className="hud-disaster-meta">
            <span>[{centerCoordinates[0].toFixed(3)}°N, {centerCoordinates[1].toFixed(3)}°E]</span>
            <span className="hud-divider">•</span>
            <span className="hud-pre-date">PRE: {satelliteData.pre_disaster_date}</span>
            <span className="hud-divider">↔</span>
            <span className="hud-post-date">POST: {satelliteData.post_disaster_date}</span>
          </div>
        </div>

        {/* Center: View Modes Segmented Control */}
        <div className="hud-card hud-viewmodes">
          <button
            type="button"
            className={`hud-mode-btn ${viewMode === 'pre_disaster' && !isSplitMode ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('pre_disaster');
              setIsSplitMode(false);
            }}
          >
            Pre-Disaster
          </button>
          <button
            type="button"
            className={`hud-mode-btn ${viewMode === 'post_disaster' && !isSplitMode ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('post_disaster');
              setIsSplitMode(false);
            }}
          >
            Post-Disaster
          </button>
          <button
            type="button"
            className={`hud-mode-btn ${viewMode === 'ai_damage' && !isSplitMode ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('ai_damage');
              setIsSplitMode(false);
            }}
          >
            AI Damage Mask
          </button>
          <button
            type="button"
            className={`hud-mode-btn hud-swipe-btn ${isSplitMode ? 'is-active' : ''}`}
            onClick={() => setIsSplitMode((prev) => !prev)}
            title="Interactive before and after curtain swipe comparison"
          >
            ↔ Curtain Swipe
          </button>
        </div>

        {/* Right: Satellite Providers, AI Brief & Layer Toggles */}
        <div className="hud-card hud-feed-controls">
          {/* Provider Pill Switcher */}
          <div className="hud-provider-group">
            <button
              type="button"
              className={`hud-pill-btn ${satelliteProvider === 'esri' ? 'is-active' : ''}`}
              onClick={() => setSatelliteProvider('esri')}
              title="Esri World Imagery High-Res Base"
            >
              🛰️ Esri High-Res
            </button>
            <button
              type="button"
              className={`hud-pill-btn ${satelliteProvider === 'copernicus' ? 'is-active' : ''}`}
              onClick={() => setSatelliteProvider('copernicus')}
              title="ESA Copernicus Sentinel-2 L2A Multispectral"
            >
              🇪🇺 Sentinel-2 L2A
              {isLoadingCopernicus && <RefreshCw size={10} className="spin-animation" />}
            </button>
            <button
              type="button"
              className={`hud-pill-btn ${satelliteProvider === 'nasa_gibs' ? 'is-active' : ''}`}
              onClick={() => setSatelliteProvider('nasa_gibs')}
              title="NASA GIBS MODIS Daily Reflectance"
            >
              🛰️ NASA GIBS
            </button>
          </div>

          {/* Sentinel Sub-bands if Copernicus is active */}
          {satelliteProvider === 'copernicus' && (
            <div className="hud-subband-group">
              <button
                type="button"
                className={`hud-subband-btn ${copernicusPreset === 'TRUE_COLOR' ? 'is-active' : ''}`}
                onClick={() => setCopernicusPreset('TRUE_COLOR')}
              >
                RGB
              </button>
              <button
                type="button"
                className={`hud-subband-btn ${copernicusPreset === 'FALSE_COLOR' ? 'is-active' : ''}`}
                onClick={() => setCopernicusPreset('FALSE_COLOR')}
              >
                IR FalseColor
              </button>
              <button
                type="button"
                className={`hud-subband-btn ${copernicusPreset === 'NDWI_WATER' ? 'is-active' : ''}`}
                onClick={() => setCopernicusPreset('NDWI_WATER')}
              >
                NDWI Water
              </button>
            </div>
          )}

          {/* AI Damage Brief Trigger */}
          <button
            type="button"
            className={`hud-ai-brief-btn ${isAiHudOpen ? 'is-active' : ''}`}
            onClick={() => setIsAiHudOpen((prev) => !prev)}
            title="Open Gemini AI SITREP Drawer"
          >
            <Sparkles size={12} />
            <span>AI Damage Brief</span>
          </button>

          {/* Layer Visibility Toggles */}
          {overlaysVisible && (
            <div className="hud-layer-toggles">
              <button
                type="button"
                className={`hud-layer-btn ${showInundationMask ? 'is-active' : ''}`}
                onClick={() => setShowInundationMask((prev) => !prev)}
                title="Toggle Hazard / Flood Mask"
              >
                <span className="layer-status-dot" style={{ background: '#a7c9ab' }} />
                <span>Mask</span>
              </button>
              <button
                type="button"
                className={`hud-layer-btn ${showBuildings ? 'is-active' : ''}`}
                onClick={() => setShowBuildings((prev) => !prev)}
                title="Toggle Damaged Buildings"
              >
                <span className="layer-status-dot" style={{ background: '#ef4444' }} />
                <span>Buildings ({buildings.length})</span>
              </button>
              <button
                type="button"
                className={`hud-layer-btn ${showRoads ? 'is-active' : ''}`}
                onClick={() => setShowRoads((prev) => !prev)}
                title="Toggle Passable & Blocked Roads"
              >
                <span className="layer-status-dot" style={{ background: '#22c55e' }} />
                <span>Roads ({roadSegments.length})</span>
              </button>
              <button
                type="button"
                className={`hud-layer-btn ${showMissions ? 'is-active' : ''}`}
                onClick={() => setShowMissions((prev) => !prev)}
                title="Toggle Active Rescue Routes"
              >
                <span className="layer-status-dot" style={{ background: '#fbbf24' }} />
                <span>Routes</span>
              </button>
            </div>
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
              background: '#a7c9ab',
              boxShadow: '0 0 14px #a7c9ab, 0 0 28px rgba(167, 201, 171, 0.5)',
              zIndex: 1000,
              cursor: 'ew-resize',
              transform: 'translateX(-50%)',
            }}
            onMouseDown={handleMouseDownWipe}
            onTouchStart={handleTouchStartWipe}
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
                border: '2px solid #a7c9ab',
                boxShadow: '0 0 16px rgba(167, 201, 171, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a7c9ab',
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
            width: 380,
            maxHeight: 'calc(100% - 100px)',
            background: 'rgba(10, 14, 26, 0.95)',
            border: '1px solid rgba(158, 184, 159, 0.4)',
            borderRadius: 14,
            padding: 16,
            zIndex: 1000,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(167, 201, 171, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#a7c9ab" />
              <strong style={{ fontSize: 13, color: '#ffffff', letterSpacing: '0.04em' }}>
                TACTICAL AI SITREP
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={handleFetchSitrep}
                disabled={isLoadingSitrep}
                style={{
                  background: 'rgba(158, 184, 159, 0.1)',
                  border: '1px solid rgba(158, 184, 159, 0.3)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  color: '#a7c9ab',
                  cursor: isLoadingSitrep ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
                title="Regenerate SITREP using Gemini"
              >
                <RefreshCw size={10} className={isLoadingSitrep ? 'spin-animation' : ''} />
                <span>{isLoadingSitrep ? 'Analyzing...' : 'Refresh'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAiHudOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Model Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(167, 201, 171, 0.08)',
              border: '1px solid rgba(167, 201, 171, 0.2)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 10,
            }}
          >
            <span style={{ color: '#a7c9ab', fontWeight: 800 }}>
              ⚡ Model: {sitrep ? sitrep.model_used : 'Gemini Multi-Model'}
            </span>
            <span style={{ color: '#94a3b8' }}>{sitrep ? sitrep.generated_at : 'Syncing'}</span>
          </div>

          {isLoadingSitrep ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              <RefreshCw size={20} className="spin-animation" style={{ color: '#a7c9ab', marginBottom: 8, display: 'inline-block' }} />
              <div>Gemini AI analyzing satellite change & distress signals...</div>
            </div>
          ) : sitrep ? (
            <>
              {/* Headline & Summary */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#f8fafc', fontWeight: 800 }}>
                  {sitrep.headline}
                </h4>
                <p style={{ margin: 0, fontSize: 11, color: '#b3bdd6', lineHeight: 1.5 }}>
                  {sitrep.executive_summary}
                </p>
              </div>

              {/* Trapped & Impact KPI */}
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
                  <span style={{ fontSize: 9.5, color: '#7281a5' }}>Trapped Civilians</span>
                  <div style={{ fontSize: 13, color: '#ffd166', fontWeight: 800 }}>
                    {sitrep.estimated_trapped} Citizens
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 9.5, color: '#7281a5' }}>Target Epicenter</span>
                  <div style={{ fontSize: 11.5, color: '#a7c9ab', fontWeight: 700 }}>
                    {disasterRecord?.district || satelliteData.region}
                  </div>
                </div>
              </div>

              {/* Critical Hazards */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <ShieldAlert size={12} color="#ef4444" />
                  <strong style={{ fontSize: 10.5, color: '#ef4444', letterSpacing: '0.04em' }}>
                    IMMINENT HAZARDS
                  </strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#e2e8f0', lineHeight: 1.45 }}>
                  {sitrep.critical_hazards.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>

              {/* Priority Rescue Corridors */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Route size={12} color="#22c55e" />
                  <strong style={{ fontSize: 10.5, color: '#22c55e', letterSpacing: '0.04em' }}>
                    PRIORITY CORRIDORS
                  </strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#e2e8f0', lineHeight: 1.45 }}>
                  {sitrep.priority_routes.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Tactical Directives */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Info size={12} color="#38bdf8" />
                  <strong style={{ fontSize: 10.5, color: '#38bdf8', letterSpacing: '0.04em' }}>
                    NEXT 24H DIRECTIVES
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {sitrep.tactical_directives.map((dir, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 10,
                        color: '#cbd5e1',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '5px 8px',
                        borderRadius: 5,
                        borderLeft: '2px solid #a7c9ab',
                      }}
                    >
                      {dir}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: 11 }}>
              Click Refresh to generate live AI SITREP briefing.
            </div>
          )}

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: 8,
              fontSize: 9.5,
              color: '#64748b',
              fontFamily: 'var(--mono-family)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Telemetry: CDSE Sentinel-2 / NASA GIBS</span>
            <span>NDMA Operational AI</span>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="map-legend">
        <div className="map-legend-title">SATELLITE & DAMAGE OVERLAYS</div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#a7c9ab', boxShadow: '0 0 6px #a7c9ab' }} />
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
        key={disasterRecord?.id || `${centerCoordinates[0]}_${centerCoordinates[1]}`}
        center={centerCoordinates}
        zoom={zoomLevel}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapController center={centerCoordinates} zoom={zoomLevel} onMap={handleMapReady} />

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

        {/* 1.5 Real Copernicus Sentinel-2 L2A Processed Image Overlay */}
        {satelliteProvider === 'copernicus' && copernicusImage && (
          <ImageOverlay
            bounds={copernicusImage.leafletBounds}
            url={copernicusImage.imageUrl}
            opacity={0.92}
            zIndex={300}
          />
        )}

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
