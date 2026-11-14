import { useState, useEffect } from 'react';
import {
  Globe,
  Zap,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchLiveOfficialDisasterAlerts,
  type OfficialDisasterAlert,
  type SOSSurgeTriggerEvent,
} from '../../../services/realtimeTriggers';
import type { ProcessedSOSReport } from '@resqnet/shared-types';

interface DisasterTriggersViewProps {
  activeReports: ProcessedSOSReport[];
  activeSurgeEvent: SOSSurgeTriggerEvent | null;
  onSelectAlert: (alert: OfficialDisasterAlert) => void;
  onSimulateSurge: () => void;
  onNavigateToMap: () => void;
}

export default function DisasterTriggersView({
  activeReports,
  activeSurgeEvent,
  onSelectAlert,
  onSimulateSurge,
  onNavigateToMap,
}: DisasterTriggersViewProps) {
  const [officialAlerts, setOfficialAlerts] = useState<OfficialDisasterAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const data = await fetchLiveOfficialDisasterAlerts();
      setOfficialAlerts(data);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="aftermath-file-view">
      {/* KPI Cards Row */}
      <div className="file-kpi-grid">
        <div className="file-kpi-card">
          <span className="file-kpi-label">GROUND SOS REPORTS</span>
          <div className="file-kpi-val" style={{ color: '#9eb89f' }}>
            {activeReports.length}
          </div>
          <span className="file-kpi-sub">Continuous Spatial Monitoring</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">SURGE TRIGGER STATUS</span>
          <div
            className="file-kpi-val"
            style={{ color: activeSurgeEvent ? '#ef4444' : '#7ae582' }}
          >
            {activeSurgeEvent ? 'SURGE ACTIVE' : 'NOMINAL'}
          </div>
          <span className="file-kpi-sub">
            {activeSurgeEvent
              ? `${activeSurgeEvent.reportCount} SOS in ${activeSurgeEvent.clusterName}`
              : 'Threshold: ≥3 SOS within 2.5km'}
          </span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">OFFICIAL GLOBAL FEEDS</span>
          <div className="file-kpi-val" style={{ color: '#ffd166' }}>
            {officialAlerts.length}
          </div>
          <span className="file-kpi-sub">Live USGS Seismic & NASA EONET</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">AUTOMATED PIPELINE</span>
          <div className="file-kpi-val" style={{ color: '#7ae582' }}>
            READY
          </div>
          <span className="file-kpi-sub">Satellite Compare &rarr; Fast Recovery</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="file-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e6edf9' }}>
            Dual Trigger Detection Engine (Zero API Keys Needed)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="file-filter-btn"
            onClick={loadAlerts}
            disabled={loadingAlerts}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={12} className={loadingAlerts ? 'animate-spin' : ''} />
            <span>{loadingAlerts ? 'Syncing Feeds...' : 'Sync Live Feeds'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToMap}
            className="file-primary-action-btn"
          >
            <Compass size={14} />
            <span>View Affected Region</span>
          </button>
        </div>
      </div>

      {/* Main Content: Split into Trigger 1 & Trigger 2 Panels */}
      <div className="file-content-scrollable">
        <div className="triggers-dual-container">
          {/* Panel 1: Ground SOS Surge */}
          <div className="trigger-engine-panel">
            <div className="engine-panel-header">
              <div className="engine-title-group">
                <AlertTriangle size={18} color="#ef4444" />
                <div>
                  <h4 className="engine-title">TRIGGER 1: GROUND SOS DENSITY SURGE</h4>
                  <span className="engine-sub">Autonomous Spatial Clustering Engine</span>
                </div>
              </div>
              <span
                className={`trigger-badge ${
                  activeSurgeEvent ? 'trigger-badge--alert' : 'trigger-badge--normal'
                }`}
              >
                {activeSurgeEvent ? 'SURGE TRIGGER ACTIVE' : 'MONITORING NOMINAL'}
              </span>
            </div>

            <p className="engine-desc">
              When disaster strikes, clusters of distress calls surge from the impacted zone. 
              AFTERMATH continuously clusters incoming GPS coordinates. If ≥3 reports land within a 2.5km radius, 
              satellite change detection and rescue dispatch launch automatically!
            </p>

            {activeSurgeEvent ? (
              <div className="surge-active-box">
                <div className="surge-header">
                  <strong>🚨 DENSITY SURGE DETECTED: {activeSurgeEvent.clusterName}</strong>
                  <span>Radius: 2.5km (2500m)</span>
                </div>
                <div className="surge-meta">
                  <span>Reports: <strong>{activeSurgeEvent.reportCount}</strong></span>
                  <span>Avg Severity: <strong>P{activeSurgeEvent.avgSeverity.toFixed(1)}</strong></span>
                  <span>Initiated: <strong>{activeSurgeEvent.timestamp}</strong></span>
                </div>
                <p className="surge-note">
                  {activeSurgeEvent.triggerReason}
                </p>
              </div>
            ) : (
              <div className="surge-nominal-box">
                <CheckCircle2 size={16} color="#7ae582" />
                <span>
                  Normal baseline density ({activeReports.length} reports logged). No spatial surge threshold breach detected.
                </span>
              </div>
            )}

            <div className="engine-actions">
              <button
                type="button"
                className="simulate-trigger-btn"
                onClick={onSimulateSurge}
              >
                <Zap size={14} />
                <span>Simulate Instant SOS Density Surge in North Delhi</span>
              </button>
            </div>
          </div>

          {/* Panel 2: Live Official Feeds (USGS / NASA) */}
          <div className="trigger-engine-panel">
            <div className="engine-panel-header">
              <div className="engine-title-group">
                <Globe size={18} color="#a7c9ab" />
                <div>
                  <h4 className="engine-title">TRIGGER 2: OFFICIAL DISASTER FEEDS</h4>
                  <span className="engine-sub">Live USGS Earthquakes & NASA EONET Catastrophes</span>
                </div>
              </div>
              <span className="trigger-badge trigger-badge--live">LIVE FEED</span>
            </div>

            <p className="engine-desc">
              AFTERMATH pulls directly from USGS real-time seismic sensors and NASA Earth Observatory natural catastrophe trackers without requiring user API keys. Click any official event to trigger satellite analysis:
            </p>

            <div className="official-alerts-scroll">
              {officialAlerts.length === 0 ? (
                <div className="alerts-empty">
                  {loadingAlerts ? 'Fetching live feeds from USGS and NASA...' : 'No active alerts returned.'}
                </div>
              ) : (
                officialAlerts.map((alert) => (
                  <div key={alert.id} className="official-alert-card">
                    <div className="alert-card-top">
                      <div className="alert-type-badge">
                        {alert.category.toUpperCase()} {alert.magnitudeOrLevel ? `${alert.magnitudeOrLevel}` : ''}
                      </div>
                      <span className="alert-time">{alert.timestamp}</span>
                    </div>

                    <h5 className="alert-title">{alert.title}</h5>

                    <div className="alert-footer">
                      <span className="alert-source">
                        Source: {alert.source} • [{alert.coordinates[0].toFixed(2)}, {alert.coordinates[1].toFixed(2)}]
                      </span>

                      <div style={{ display: 'flex', gap: 6 }}>
                        {alert.url && (
                          <a
                            href={alert.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="alert-link-icon"
                            title="Official USGS/NASA bulletin"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="activate-alert-btn"
                          onClick={() => {
                            onSelectAlert(alert);
                            onNavigateToMap();
                          }}
                        >
                          <span>Analyze Region</span>
                          &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
