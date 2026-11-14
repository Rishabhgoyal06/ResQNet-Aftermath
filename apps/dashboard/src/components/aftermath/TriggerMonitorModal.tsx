import { useState, useEffect } from 'react';
import {
  BellRing,
  Globe,
  Zap,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchLiveOfficialDisasterAlerts,
  type OfficialDisasterAlert,
  type SOSSurgeTriggerEvent,
} from '../../services/realtimeTriggers';
import type { ProcessedSOSReport } from '@resqnet/shared-types';
import './AftermathComponents.css';

interface TriggerMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeReports: ProcessedSOSReport[];
  activeSurgeEvent: SOSSurgeTriggerEvent | null;
  onSelectAlert: (alert: OfficialDisasterAlert) => void;
  onSimulateSurge: () => void;
}

export default function TriggerMonitorModal({
  isOpen,
  onClose,
  activeReports,
  activeSurgeEvent,
  onSelectAlert,
  onSimulateSurge,
}: TriggerMonitorModalProps) {
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
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="vision-modal-backdrop" onClick={onClose}>
      <div className="trigger-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vision-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BellRing size={20} color="var(--primary, #9eb89f)" />
            <div>
              <h3 className="vision-modal-title">
                REAL-TIME DISASTER TRIGGERS & OFFICIAL FEEDS
              </h3>
              <p className="vision-modal-subtitle">
                Automated triggering via SOS Density Surge or Live Global Feeds (USGS & NASA EONET)
              </p>
            </div>
          </div>
          <button type="button" className="vision-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Ground SOS Surge Trigger (Trigger Point 1) */}
        <div className="trigger-card" style={{ padding: 14 }}>
          <div className="trigger-card-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} color="#ef4444" />
              <strong style={{ fontSize: 12 }}>TRIGGER 1: GROUND SOS DENSITY SURGE (AUTOMATIC)</strong>
            </div>
            <span className="trigger-status-badge status-active">
              <span className="badge-pulse" /> {activeReports.length} ACTIVE REPORTS
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
              {activeSurgeEvent
                ? `🚨 Surge Active: ${activeSurgeEvent.reportCount} reports in ${activeSurgeEvent.clusterName} (Avg P${activeSurgeEvent.avgSeverity}). Automated satellite comparison running.`
                : 'Monitors incoming SOS calls. When ≥3 reports arrive in a 2.5km radius, satellite comparison and rescue routing launch automatically.'}
            </p>
            <button
              type="button"
              className="simulate-trigger-btn"
              style={{ width: 'auto', padding: '6px 14px', flexShrink: 0 }}
              onClick={() => {
                onSimulateSurge();
                onClose();
              }}
            >
              <Zap size={13} />
              <span>Simulate SOS Surge</span>
            </button>
          </div>
        </div>

        {/* Section 2: Official Disaster Feeds (Trigger Point 2) */}
        <div className="official-alerts-view">
          <div className="alerts-top-strip">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={15} color="#a7c9ab" />
              <strong style={{ fontSize: 12, color: '#fff' }}>
                TRIGGER 2: OFFICIAL DISASTER FEEDS (LIVE USGS & NASA)
              </strong>
            </div>
            <button
              type="button"
              className="refresh-alerts-btn"
              onClick={loadAlerts}
              disabled={loadingAlerts}
            >
              <RefreshCw size={12} className={loadingAlerts ? 'spin' : ''} />
              <span>Refresh Feeds</span>
            </button>
          </div>

          <div className="official-alerts-stream" style={{ maxHeight: 360 }}>
            {officialAlerts.map((alert) => (
              <div key={alert.id} className="official-alert-card">
                <div className="alert-card-header">
                  <div>
                    <span className="alert-cat-pill">{alert.category.toUpperCase()}</span>
                    <h4 className="alert-title">{alert.title}</h4>
                  </div>
                  <button
                    type="button"
                    className="launch-analysis-btn"
                    onClick={() => {
                      onSelectAlert(alert);
                      onClose();
                    }}
                    title="Launch Earth Observation Change Analysis for this event"
                  >
                    <Zap size={12} />
                    <span>ANALYZE THIS DISASTER</span>
                  </button>
                </div>

                <p className="alert-summary">{alert.summary}</p>

                <div className="alert-card-footer">
                  <span>Source: <strong>{alert.source.replace('_', ' ')}</strong></span>
                  <span>Magnitude/Level: <strong>{alert.magnitudeOrLevel}</strong></span>
                  <span>Coords: <strong>[{alert.coordinates[0].toFixed(2)}, {alert.coordinates[1].toFixed(2)}]</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="vision-modal-footer">
          <button type="button" className="vision-modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}