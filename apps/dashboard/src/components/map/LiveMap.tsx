import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SOSReport } from '../../hooks/useRealtimeSOS';
import { CATEGORY_ICONS, SEVERITY_COLORS, SEVERITY_LABELS, type SOSCategory, type SeverityLevel } from '@resqnet/shared-types';
import './MapStyles.css';

function AutoCenter({ points, follow }: { points: [number, number][]; follow: boolean }) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!follow || points.length === 0) return;

    // Filter points strictly to the Indian Subcontinent bounds (lat: 6 to 38, lng: 66 to 98)
    const validPoints = points.filter(([lat, lng]) => {
      const nLat = Number(lat);
      const nLng = Number(lng);
      return !isNaN(nLat) && !isNaN(nLng) && nLat >= 6 && nLat <= 38 && nLng >= 66 && nLng <= 98;
    });

    if (validPoints.length === 0) return;

    try {
      const bounds = L.latLngBounds(validPoints);
      if (!initializedRef.current) {
        initializedRef.current = true;
        map.fitBounds(bounds.pad(0.12), { maxZoom: 10, animate: false });
      } else {
        map.fitBounds(bounds.pad(0.12), { maxZoom: 10, animate: true, duration: 0.5 });
      }
    } catch (e) {
      console.warn('AutoCenter fitBounds error:', e);
    }
  }, [follow, map, points]);

  return null;
}

function MapController({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

function FlyToSelected({ selectedReport }: { selectedReport?: SOSReport | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedReport) return;
    map.setView([selectedReport.latitude, selectedReport.longitude], Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.5,
    });
  }, [map, selectedReport]);
  return null;
}

interface LiveMapProps {
  reports: SOSReport[];
  selectedReportId?: string | null;
  onMarkerClick?: (report: SOSReport) => void;
  detailedAreaById?: Record<string, string | null | undefined>;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiveMap({ reports, selectedReportId, onMarkerClick, detailedAreaById, className, style }: LiveMapProps) {
  const [follow, setFollow] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [baseLayer, setBaseLayer] = useState<'dark' | 'streets' | 'satellite' | 'osm'>('dark');
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [recentReports, setRecentReports] = useState<Record<string, number>>({});
  const previousIdsRef = useRef<Set<string> | null>(null);
  // Dark-only map styling.

  useEffect(() => {
    const currentIds = new Set(reports.map((r) => r.id));
    if (!previousIdsRef.current) {
      previousIdsRef.current = currentIds;
      return;
    }
    const newIds = Array.from(currentIds).filter((id) => !previousIdsRef.current?.has(id));
    if (newIds.length > 0) {
      const now = Date.now();
      setRecentReports((prev) => {
        const next = { ...prev };
        newIds.forEach((id) => {
          next[id] = now;
        });
        return next;
      });
      newIds.forEach((id) => {
        setTimeout(() => {
          setRecentReports((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 8000);
      });
    }
    previousIdsRef.current = currentIds;
  }, [reports]);
  const visibleReports = useMemo(() => {
    return showResolved ? reports : reports.filter((r) => r.status !== 'resolved');
  }, [reports, showResolved]);

  const selectedReport = useMemo(() => {
    if (!selectedReportId) return null;
    return reports.find((r) => r.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, SOSReport[]>();
    visibleReports.forEach((report) => {
      // Group nearby coordinates (~30 meters) to prevent zero-pixel overlaps
      const latKey = (Math.round(report.latitude * 3500) / 3500).toFixed(4);
      const lngKey = (Math.round(report.longitude * 3500) / 3500).toFixed(4);
      const key = `${latKey},${lngKey}`;
      const list = groups.get(key) ?? [];
      list.push(report);
      groups.set(key, list);
    });
    return groups;
  }, [visibleReports]);

  const plottedReports = useMemo(() => {
    const plotted: Array<
      | { type: 'report'; report: SOSReport; lat: number; lng: number; stackSize: number }
      | { type: 'cluster'; clusterKey: string; lat: number; lng: number; count: number }
    > = [];
    groupedReports.forEach((list, key) => {
      if (list.length === 1) {
        plotted.push({
          type: 'report',
          report: list[0],
          lat: list[0].latitude,
          lng: list[0].longitude,
          stackSize: 1,
        });
        return;
      }

      // If cluster is expanded OR list is 2 to 4 reports:
      // Spread them in a clean circular rosette so they NEVER sit on top of each other!
      if (expandedClusters.includes(key) || list.length <= 4) {
        const spreadRadius = 0.00022; // ~24m separation
        list.forEach((report, index) => {
          const angle = (index / list.length) * Math.PI * 2;
          plotted.push({
            type: 'report',
            report,
            lat: report.latitude + Math.cos(angle) * spreadRadius,
            lng: report.longitude + Math.sin(angle) * spreadRadius,
            stackSize: list.length,
          });
        });
      } else {
        plotted.push({
          type: 'cluster',
          clusterKey: key,
          lat: list[0].latitude,
          lng: list[0].longitude,
          count: list.length,
        });
      }
    });
    return plotted;
  }, [groupedReports, expandedClusters]);

  const activeReports = useMemo(
    () => visibleReports.filter((r) => r.status !== 'resolved'),
    [visibleReports]
  );

  const criticalCount = activeReports.filter((r) => r.severity >= 4).length;

  const plottedPoints = useMemo(() => {
    return visibleReports.map((r) => [r.latitude, r.longitude] as [number, number]);
  }, [visibleReports]);

  const severityCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    visibleReports.forEach((r) => {
      if (counts[r.severity as 1 | 2 | 3 | 4 | 5] !== undefined) {
        counts[r.severity as 1 | 2 | 3 | 4 | 5] += 1;
      }
    });
    return counts;
  }, [visibleReports]);

  const formatTime = (t: string) => {
    const d = new Date(t);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className={`map-shell ${className || ''}`} style={{ width: '100%', height: '100%', ...style }}>
      <MapContainer
        center={[22.5, 78.9]}
        zoom={5}
        minZoom={4}
        maxZoom={18}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapController onMap={setMapRef} />
        {baseLayer === 'dark' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
              className="map-tiles map-tiles--base"
            />
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              attribution=" "
              className="map-tiles map-tiles--labels"
            />
          </>
        )}
        {baseLayer === 'streets' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            className="map-tiles map-tiles--base"
          />
        )}
        {baseLayer === 'osm' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="map-tiles map-tiles--base"
          />
        )}
        {baseLayer === 'satellite' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              className="map-tiles map-tiles--base"
            />
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=" "
              className="map-tiles map-tiles--labels"
            />
          </>
        )}
        <AutoCenter points={plottedPoints} follow={follow} />
        <FlyToSelected selectedReport={selectedReport} />
        {plottedReports.map((item) => {
          if (item.type === 'cluster') {
            const radius = Math.min(18, 12 + Math.floor(item.count * 1.5));
            return (
              <CircleMarker
                key={`cluster-${item.clusterKey}`}
                center={[item.lat, item.lng]}
                radius={radius}
                pathOptions={{
                  color: '#a7c9ab',
                  fillColor: '#12261b',
                  fillOpacity: 0.95,
                  weight: 2,
                  className: 'map-cluster',
                }}
                eventHandlers={{
                  click: () => {
                    setExpandedClusters((prev) =>
                      prev.includes(item.clusterKey) ? prev : [...prev, item.clusterKey]
                    );
                  },
                }}
              >
                <Tooltip permanent direction="center" className="map-cluster-label">
                  {item.count}
                </Tooltip>
              </CircleMarker>
            );
          }

          const { report, lat, lng, stackSize } = item;
          const color = SEVERITY_COLORS[report.severity as SeverityLevel] || '#94a3b8';
          const isCritical = report.severity >= 4;
          const isFresh = Boolean(recentReports[report.id] && Date.now() - recentReports[report.id] < 12000);
          const isSelected = selectedReportId === report.id;
          const baseRadius = isSelected ? 11 : isCritical ? 8.5 : 7;

          return (
            <Fragment key={report.id}>
              {/* Tactical perimeter ring for selected, fresh, or critical incidents */}
              {(isCritical || isFresh || isSelected) && (
                <CircleMarker
                  key={`${report.id}-ring`}
                  center={[lat, lng]}
                  radius={isSelected ? 16 : isFresh ? 14 : 12}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : isFresh ? '#7ae582' : color,
                    fillColor: isSelected ? '#ffffff' : isFresh ? '#7ae582' : color,
                    fillOpacity: isSelected ? 0.35 : 0.15,
                    weight: isSelected ? 2 : 1.5,
                    dashArray: isSelected ? undefined : '3, 3',
                    className: 'map-tactical-ring',
                  }}
                  interactive={false}
                />
              )}
              {/* Primary crisp tactical incident pin */}
              <CircleMarker
                key={report.id}
                center={[lat, lng]}
                radius={baseRadius}
                pathOptions={{
                  color: isSelected ? '#ffffff' : '#f8fafc',
                  fillColor: color,
                  fillOpacity: report.status === 'resolved' ? 0.4 : 0.95,
                  weight: isSelected ? 3 : 2,
                  className: `map-tactical-dot ${isSelected ? 'map-tactical-dot--selected' : ''}`,
                }}
                eventHandlers={{
                  click: () => {
                    onMarkerClick?.(report);
                  },
                  mouseover: (e) => {
                    const marker = e.target;
                    marker.setRadius(baseRadius + 3);
                    marker.setStyle({ weight: 3, fillOpacity: 1 });
                  },
                  mouseout: (e) => {
                    const marker = e.target;
                    marker.setRadius(baseRadius);
                    marker.setStyle({
                      weight: isSelected ? 3 : 2,
                      fillOpacity: report.status === 'resolved' ? 0.4 : 0.95,
                    });
                  },
                }}
              >
                {/* Instant Hover Tooltip Preview */}
                <Tooltip
                  direction="top"
                  offset={[0, -10]}
                  opacity={1}
                  className="map-tactical-tooltip"
                >
                  <div className="map-tooltip-card">
                    <div className="map-tooltip-head">
                      <span className="map-tooltip-category">
                        {CATEGORY_ICONS[report.category as SOSCategory] || '⚠️'} {report.category}
                      </span>
                      <span className="map-tooltip-sev" style={{ background: color }}>
                        L{report.severity}
                      </span>
                    </div>
                    <div className="map-tooltip-body">
                      {report.message || 'Distress signal active'}
                    </div>
                    <div className="map-tooltip-footer">
                      <span>👤 {report.name || 'Anonymous'}</span>
                      <span>🕐 {formatTime(report.created_at)}</span>
                    </div>
                  </div>
                </Tooltip>

                {/* Full Click Popup */}
                <Popup className="map-popup">
                  <div className="map-popup-content">
                    <div className="map-popup-title">
                      <span className="map-popup-icon">{CATEGORY_ICONS[report.category as SOSCategory] || '⚠️'}</span>
                      <strong>{report.category}</strong>
                    </div>
                    <div className="map-popup-severity" style={{ background: color }}>
                      {SEVERITY_LABELS[report.severity as SeverityLevel]} - Level {report.severity}
                    </div>
                    {detailedAreaById?.[report.id] && (
                      <div className="map-popup-area">
                        <span>Area:</span> {detailedAreaById[report.id]}
                      </div>
                    )}
                    {stackSize > 1 && (
                      <div className="map-popup-area">
                        <span>Cluster:</span> {stackSize} reports in this vicinity
                      </div>
                    )}
                    {report.message && <p className="map-popup-message">{report.message}</p>}
                    <div className="map-popup-meta">
                      {report.name && <span>👤 {report.name} · </span>}
                      <span>🕐 {formatTime(report.created_at)}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          );
        })}
      </MapContainer>

      <div className="map-overlay">
        <div className="map-panel">
          <div className="map-title">LIVE INCIDENT MAP</div>
          <div className="map-subtitle">
            {activeReports.length} active · {criticalCount} critical · {visibleReports.length} visible
          </div>
        </div>

        <div className="map-panel map-actions">
          <button type="button" onClick={() => setShowResolved((prev) => !prev)}>
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </button>
          <button type="button" onClick={() => setFollow((prev) => !prev)}>
            {follow ? 'Follow: On' : 'Follow: Off'}
          </button>
          {expandedClusters.length > 0 && (
            <button type="button" onClick={() => setExpandedClusters([])}>
              Collapse Clusters
            </button>
          )}
          <div className="map-layer-toggle" role="group" aria-label="Map style">
            {[
              { id: 'streets', label: 'Streets' },
              { id: 'osm', label: 'OSM' },
              { id: 'dark', label: 'Dark' },
              { id: 'satellite', label: 'Satellite' },
            ].map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={baseLayer === layer.id ? 'is-active' : ''}
                onClick={() => setBaseLayer(layer.id as 'dark' | 'streets' | 'satellite' | 'osm')}
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="map-legend">
        <div className="map-legend-title">SEVERITY</div>
        {[
          { color: '#ff5b5b', label: 'Critical', count: severityCounts[5] },
          { color: '#ff8a4c', label: 'High', count: severityCounts[4] },
          { color: '#ffd166', label: 'Important', count: severityCounts[3] },
          { color: '#9eb89f', label: 'Moderate', count: severityCounts[2] },
          { color: '#6a8cff', label: 'Low', count: severityCounts[1] },
        ].map((item) => (
          <div key={item.label} className="map-legend-item">
            <span className="map-legend-dot" style={{ background: item.color }} />
            <span>
              {item.label} · {item.count}
            </span>
          </div>
        ))}
      </div>

      <div className="map-controls">
        <button type="button" onClick={() => mapRef?.zoomIn()}>
          +
        </button>
        <button type="button" onClick={() => mapRef?.zoomOut()}>
          -
        </button>
        <button
          type="button"
          title="Recenter India tactical view"
          onClick={() => {
            if (!mapRef) return;
            const valid = plottedPoints.filter(
              ([lat, lng]) => lat >= 6 && lat <= 38 && lng >= 66 && lng <= 98
            );
            if (valid.length > 0) {
              const bounds = L.latLngBounds(valid);
              mapRef.fitBounds(bounds.pad(0.12), { maxZoom: 10, animate: true });
            } else {
              mapRef.setView([22.5, 78.9], 5, { animate: true });
            }
          }}
        >
          ⌖
        </button>
      </div>
    </div>
  );
}












