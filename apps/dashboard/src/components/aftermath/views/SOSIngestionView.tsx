import { useState } from 'react';
import {
  Send,
  Sparkles,
  User,
  MapPin,
  AlertTriangle,
  Phone,
  Flame,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { extractEmergencyIntelligence } from '../../../services/aftermathIntelligence';
import type { ProcessedSOSReport, ExtractedEmergencyInfo } from '@resqnet/shared-types';

interface SOSIngestionViewProps {
  onIngestReport: (report: ProcessedSOSReport) => void;
  onNavigateToMap: () => void;
  recentReports: ProcessedSOSReport[];
}

const PRESET_SCENARIOS = [
  {
    label: '🌊 Flash Flood Inundation SOS',
    name: 'Gurmeet Singh',
    phone: '98104-55291',
    category: 'Rescue Needed' as const,
    severity: 5 as const,
    lat: 28.6945,
    lng: 77.2305,
    message:
      'Water has reached the 1st floor of our apartment complex near Monastery Market. 7 people trapped including 3 young children and my 82-year-old mother. Current is very strong, road is cut off, we need an evacuation boat urgently!',
  },
  {
    label: '🏢 Earthquake Pancake Collapse SOS',
    name: 'Dr. Alok Verma',
    phone: '98731-09822',
    category: 'Rescue Needed' as const,
    severity: 5 as const,
    lat: 28.6740,
    lng: 77.2210,
    message:
      'The 3-story polytechnic lab building has pancaked! We hear tapping sounds from the void space below. 9 students trapped, 2 severely injured and bleeding. Heavy concrete cutting tools and USAR acoustic sensors required immediately!',
  },
  {
    label: '🏥 Cut-Off Triage Medical SOS',
    name: 'Nurse Rekha Sharma',
    phone: '99100-34821',
    category: 'Medical Emergency' as const,
    severity: 4 as const,
    lat: 28.6655,
    lng: 77.2185,
    message:
      'Dispensary cut off by 4 feet standing water. 5 trauma patients from collapsed masonry need oxygen cylinders and emergency IV saline. Road flooded, ambulance cannot pass, need high-clearance truck or boat!',
  },
];

export default function SOSIngestionView({
  onIngestReport,
  onNavigateToMap,
  recentReports,
}: SOSIngestionViewProps) {
  const [name, setName] = useState('Devendra Patel');
  const [phone, setPhone] = useState('98112-98442');
  const [category, setCategory] = useState<ProcessedSOSReport['category']>('Rescue Needed');
  const [severity, setSeverity] = useState<number>(5);
  const [latitude, setLatitude] = useState<number>(28.6890);
  const [longitude, setLongitude] = useState<number>(77.2280);
  const [message, setMessage] = useState(
    'Water level has crossed 5 feet in our lane near Majnu Ka Tilla school. 6 people trapped on the terrace including 2 toddlers and 1 disabled senior. No food since yesterday, boat needed!'
  );

  const [extracted, setExtracted] = useState<ExtractedEmergencyInfo | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRunNLP = () => {
    const info = extractEmergencyIntelligence(message, category || 'Rescue Needed', severity);
    setExtracted(info);
  };

  const handleLoadPreset = (preset: (typeof PRESET_SCENARIOS)[0]) => {
    setName(preset.name);
    setPhone(preset.phone);
    setCategory(preset.category);
    setSeverity(preset.severity);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setMessage(preset.message);
    setExtracted(null);
    setIsSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reportId = `LIVE-SOS-${Date.now().toString().slice(-4)}`;
    const info = extracted || extractEmergencyIntelligence(message, category || 'Rescue Needed', severity);

    const supplyMap: Record<string, number> = {};
    info.rescue_requirements.forEach((req) => {
      supplyMap[req] = 1;
    });

    const newReport: ProcessedSOSReport = {
      id: reportId,
      created_at: new Date().toISOString(),
      name: name || 'Citizen in Distress',
      phone: phone || 'Unlisted',
      latitude: Number(latitude),
      longitude: Number(longitude),
      category,
      verified_severity: Number(severity),
      district: 'Impact Zone Area',
      detailed_area: info.location.landmark || 'GPS Geo-Located Site',
      message,
      supply_requirements: supplyMap,
      casualties_reported: info.people.injured > 0 || info.people.total > 0 || severity >= 5,
      source_project: 'live_ingestion',
      processed_at: new Date().toISOString(),
      rephrased_message: `${info.people.total} citizens trapped (${info.people.children} kids, ${info.people.elderly} elderly). Urgency: ${info.situation.urgency.toUpperCase()}. Requires: ${info.rescue_requirements.join(', ')}.`,
    };

    onIngestReport(newReport);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 4000);
  };

  return (
    <div className="aftermath-file-view">
      {/* KPI Cards Row */}
      <div className="file-kpi-grid">
        <div className="file-kpi-card">
          <span className="file-kpi-label">INGESTED LIVE REPORTS</span>
          <div className="file-kpi-val" style={{ color: '#4cc9ff' }}>
            {recentReports.length}
          </div>
          <span className="file-kpi-sub">Active Field Signals</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">AI NLP PREPROCESSOR</span>
          <div className="file-kpi-val" style={{ color: '#7ae582' }}>
            ACTIVE
          </div>
          <span className="file-kpi-sub">Auto-Extracts Trapped & Danger</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">DYNAMIC ROUTING</span>
          <div className="file-kpi-val" style={{ color: '#ffd166' }}>
            READY
          </div>
          <span className="file-kpi-sub">Auto-Clustered & Resource Assigned</span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">STATUS</span>
          <div className="file-kpi-val" style={{ color: isSuccess ? '#7ae582' : '#4cc9ff' }}>
            {isSuccess ? 'INGESTED' : 'AWAITING'}
          </div>
          <span className="file-kpi-sub">Zero Database Lock Delay</span>
        </div>
      </div>

      {/* Action Bar with Presets */}
      <div className="file-action-bar">
        <div className="preset-strip">
          <span className="preset-label">Quick Presets:</span>
          {PRESET_SCENARIOS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-pill-btn"
              onClick={() => handleLoadPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onNavigateToMap}
          className="file-primary-action-btn"
        >
          <Compass size={14} />
          <span>View On Satellite Map</span>
        </button>
      </div>

      {/* Main Content: Split Ingestion Form and NLP Preview */}
      <div className="file-content-scrollable">
        <div className="ingest-dual-container">
          {/* Left: Input Form */}
          <form className="ingest-form-panel" onSubmit={handleSubmit}>
            <div className="form-group-row">
              <div className="form-field">
                <label>
                  <User size={12} /> Reporter Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  required
                />
              </div>

              <div className="form-field">
                <label>
                  <Phone size={12} /> Contact Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 98110-XXXXX"
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label>
                  <Flame size={12} /> Distress Category
                </label>
                <select
                  value={category || 'Rescue Needed'}
                  onChange={(e) => setCategory(e.target.value as ProcessedSOSReport['category'])}
                >
                  <option value="Rescue Needed">Rescue Needed</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Food / Water">Food / Water</option>
                  <option value="Shelter Needed">Shelter Needed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>
                  <AlertTriangle size={12} /> Severity (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label>
                  <MapPin size={12} /> Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-field">
                <label>
                  <MapPin size={12} /> Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Field Distress Signal / Message</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe exact conditions, trapped survivors, water depth or structural collapse..."
                required
              />
            </div>

            <div className="form-actions-bar">
              <button
                type="button"
                className="nlp-test-btn"
                onClick={handleRunNLP}
              >
                <Sparkles size={13} />
                <span>Test AI NLP Parser</span>
              </button>

              <button type="submit" className="ingest-submit-btn">
                <Send size={14} />
                <span>Inject Distress SOS into AFTERMATH</span>
              </button>
            </div>

            {isSuccess && (
              <div className="ingest-success-alert">
                <CheckCircle2 size={16} color="#7ae582" />
                <span>Distress signal ingested successfully! Clustering & routing updated.</span>
              </div>
            )}
          </form>

          {/* Right: NLP Output & Live Inspection */}
          <div className="nlp-preview-panel">
            <div className="nlp-header">
              <Sparkles size={16} color="#00f0ff" />
              <h4>REAL-TIME AI NLP INTELLIGENCE PREVIEW</h4>
            </div>

            {extracted ? (
              <div className="nlp-results-box">
                <div className="nlp-stat-row">
                  <span className="nlp-lbl">Trapped Survivors:</span>
                  <strong className="nlp-val" style={{ color: '#ef4444' }}>
                    {extracted.people.total} Citizens ({extracted.people.children} kids, {extracted.people.elderly} elderly)
                  </strong>
                </div>

                <div className="nlp-stat-row">
                  <span className="nlp-lbl">Danger / Urgency:</span>
                  <strong className="nlp-val">
                    {extracted.situation.danger} ({extracted.situation.urgency.toUpperCase()})
                  </strong>
                </div>

                <div className="nlp-stat-row">
                  <span className="nlp-lbl">Extracted Landmark:</span>
                  <p className="nlp-rephrased">
                    {extracted.location.landmark || 'GPS coordinates only'}
                  </p>
                </div>

                <div className="nlp-supplies-section">
                  <span className="nlp-lbl">Required Rescue Operations:</span>
                  <div className="supplies-tags">
                    {extracted.rescue_requirements.map((req, i) => (
                      <span key={i} className="supply-tag">
                        {req.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="nlp-placeholder">
                <p>Click <strong>"Test AI NLP Parser"</strong> to preview how the engine automatically analyzes raw text to extract survivor headcounts, injury tags, and required rescue equipment.</p>
              </div>
            )}

            {recentReports.length > 0 && (
              <div className="recent-ingests-box">
                <h5>RECENTLY INGESTED SOS REPORTS ({recentReports.length})</h5>
                <div className="recent-list">
                  {recentReports.slice(0, 5).map((r) => (
                    <div key={r.id} className="recent-item">
                      <div className="recent-top">
                        <strong>{r.name}</strong>
                        <span>{r.category}</span>
                      </div>
                      <p className="recent-msg">{r.rephrased_message || r.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
