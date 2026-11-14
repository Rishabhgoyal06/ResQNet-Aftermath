import { useState } from 'react';
import {
  Radio,
  X,
  Sparkles,
  User,
  MapPin,
  AlertTriangle,
  Phone,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { extractEmergencyIntelligence } from '../../services/aftermathIntelligence';
import type { ProcessedSOSReport, ExtractedEmergencyInfo } from '@resqnet/shared-types';
import './AftermathComponents.css';

interface LiveDistressIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestReport: (report: ProcessedSOSReport) => void;
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
    message: 'Water has reached the 1st floor of our apartment complex near Monastery Market. 7 people trapped including 3 young children and my 82-year-old mother. Current is very strong, road is cut off, we need an evacuation boat urgently!',
  },
  {
    label: '🏢 Earthquake Pancake Collapse SOS',
    name: 'Dr. Alok Verma',
    phone: '98731-09822',
    category: 'Rescue Needed' as const,
    severity: 5 as const,
    lat: 28.6740,
    lng: 77.2210,
    message: 'The 3-story polytechnic lab building has pancaked! We hear tapping sounds from the void space below. 9 students trapped, 2 severely injured and bleeding. Heavy concrete cutting tools and USAR acoustic sensors required immediately!',
  },
  {
    label: '🏥 Cut-Off Triage Medical SOS',
    name: 'Nurse Rekha Sharma',
    phone: '99100-34821',
    category: 'Medical Emergency' as const,
    severity: 4 as const,
    lat: 28.6655,
    lng: 77.2185,
    message: 'Dispensary cut off by 4 feet standing water. 5 trauma patients from collapsed masonry need oxygen cylinders and emergency IV saline. Road flooded, ambulance cannot pass, need high-clearance truck or boat!',
  },
];

export default function LiveDistressIngestionModal({
  isOpen,
  onClose,
  onIngestReport,
}: LiveDistressIngestionModalProps) {
  const [name, setName] = useState('Devendra Patel');
  const [phone, setPhone] = useState('98112-98442');
  const [category, setCategory] = useState<ProcessedSOSReport['category']>('Rescue Needed');
  const [severity, setSeverity] = useState<number>(5);
  const [latitude, setLatitude] = useState<number>(28.6890);
  const [longitude, setLongitude] = useState<number>(77.2280);
  const [message, setMessage] = useState(
    'Water level has crossed 5 feet in our lane near Majnu Ka Tilla school. 6 people trapped on the terrace including 2 toddlers and 1 disabled senior. No food since yesterday, boat needed!'
  );

  // Live NLP Extraction State
  const [extracted, setExtracted] = useState<ExtractedEmergencyInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleRunNLP = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const info = extractEmergencyIntelligence(message, category || 'Rescue Needed', severity);
      setExtracted(info);
      setIsProcessing(false);
    }, 180);
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
  };

  const handleSubmit = () => {
    const reportId = `LIVE-SOS-${Date.now().toString().slice(-4)}`;
    const info = extracted || extractEmergencyIntelligence(message, category || 'Rescue Needed', severity);

    const newReport: ProcessedSOSReport = {
      id: reportId,
      name,
      phone,
      latitude,
      longitude,
      category,
      verified_severity: severity,
      district: 'North Delhi Emergency Sector',
      detailed_area: info.location.landmark || 'Incident Location',
      message,
      rephrased_message: message,
      supply_requirements: {
        food: info.rescue_requirements.includes('food_rations') ? 1 : 0,
        water: info.rescue_requirements.includes('clean_water') ? 1 : 0,
        doctor: info.rescue_requirements.includes('medical_team') ? 1 : 0,
        shelter: 1,
        medicines: info.rescue_requirements.includes('medical_team') ? 1 : 0,
      },
      casualties_reported: info.people.injured > 0 || severity >= 5,
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      source_project: 'live_ingestion',
    };

    onIngestReport(newReport);
    onClose();
  };

  return (
    <div className="vision-modal-backdrop" onClick={onClose}>
      <div className="distress-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vision-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={22} color="var(--primary, #4cc9ff)" />
            <div>
              <h3 className="vision-modal-title">
                LIVE DISTRESS SIGNAL INGESTION & NLP EXTRACTION PIPELINE
              </h3>
              <p className="vision-modal-subtitle">
                Test real-time emergency text understanding, entity extraction, and satellite fusion
              </p>
            </div>
          </div>
          <button type="button" className="vision-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Presets Quick Pick Row */}
        <div className="preset-quick-row">
          <span className="preset-lbl">QUICK PRESET:</span>
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-btn"
              onClick={() => handleLoadPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="distress-form-grid">
          {/* Left: Input Form */}
          <div className="distress-form-left">
            <div className="input-row-2col">
              <div className="field-group">
                <label><User size={11} /> Caller Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modal-input"
                />
              </div>
              <div className="field-group">
                <label><Phone size={11} /> Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>

            <div className="input-row-2col">
              <div className="field-group">
                <label><AlertTriangle size={11} /> Category</label>
                <select
                  value={category || 'Rescue Needed'}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="modal-input"
                >
                  <option value="Rescue Needed">Rescue Needed</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Food / Water">Food / Water</option>
                  <option value="Shelter Needed">Shelter Needed</option>
                  <option value="Fire">Fire</option>
                </select>
              </div>

              <div className="field-group">
                <label><Flame size={11} /> Urgency Severity (1-5)</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="modal-input"
                >
                  <option value={5}>P1 - Severity 5 (Life Critical)</option>
                  <option value={4}>P2 - Severity 4 (Urgent Threat)</option>
                  <option value={3}>P3 - Severity 3 (Important Needs)</option>
                  <option value={2}>P4 - Severity 2 (Moderate)</option>
                  <option value={1}>P5 - Severity 1 (Advisory)</option>
                </select>
              </div>
            </div>

            <div className="input-row-2col">
              <div className="field-group">
                <label><MapPin size={11} /> Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="modal-input"
                />
              </div>
              <div className="field-group">
                <label><MapPin size={11} /> Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="modal-input"
                />
              </div>
            </div>

            <div className="field-group">
              <label>Distress Message (Natural Language Text)</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setExtracted(null);
                }}
                className="modal-textarea"
                placeholder="Describe trapped people, water depth, building condition, urgent needs..."
              />
            </div>

            <button
              type="button"
              className="nlp-analyze-btn"
              onClick={handleRunNLP}
              disabled={isProcessing}
            >
              <Sparkles size={14} />
              <span>RUN LIVE AI NLP EXTRACTION</span>
            </button>
          </div>

          {/* Right: Real-time NLP Extraction Output */}
          <div className="distress-form-right">
            <span className="nlp-panel-tag">LIVE NLP STRUCTURED OUTPUT</span>
            {extracted ? (
              <div className="nlp-extracted-card">
                <div className="nlp-metric-row">
                  <div className="nlp-stat">
                    <span className="n-val">{extracted.people.total}</span>
                    <span className="n-lbl">Total People</span>
                  </div>
                  <div className="nlp-stat">
                    <span className="n-val" style={{ color: '#f97316' }}>
                      {extracted.people.children}
                    </span>
                    <span className="n-lbl">Children</span>
                  </div>
                  <div className="nlp-stat">
                    <span className="n-val" style={{ color: '#eab308' }}>
                      {extracted.people.elderly}
                    </span>
                    <span className="n-lbl">Elderly</span>
                  </div>
                  <div className="nlp-stat">
                    <span className="n-val" style={{ color: '#ef4444' }}>
                      {extracted.people.injured}
                    </span>
                    <span className="n-lbl">Injured</span>
                  </div>
                </div>

                <div className="nlp-detail-strip">
                  <strong>Situation Type:</strong> {extracted.situation.type.toUpperCase()} ({extracted.situation.danger})
                </div>

                <div className="nlp-detail-strip">
                  <strong>Urgency Classification:</strong>{' '}
                  <span className={`prio-tag prio-${extracted.situation.urgency}`}>
                    {extracted.situation.urgency.toUpperCase()}
                  </span>
                </div>

                {extracted.location.landmark && (
                  <div className="nlp-detail-strip">
                    <strong>Extracted Landmark:</strong> {extracted.location.landmark}
                  </div>
                )}

                <div className="nlp-reqs-row">
                  <strong>Rescue Reqs:</strong>
                  {extracted.rescue_requirements.map((req, i) => (
                    <span key={i} className="req-pill">
                      {req.replace('_', ' ').toUpperCase()}
                    </span>
                  ))}
                </div>

                <div className="nlp-json-block">
                  <pre>{JSON.stringify(extracted, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="nlp-idle-box">
                <Radio size={24} color="var(--primary, #4cc9ff)" />
                <p>Click "Run Live AI NLP Extraction" to parse the natural language message into structured JSON entities.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="vision-modal-footer">
          <button type="button" className="vision-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="vision-btn-apply"
            onClick={handleSubmit}
          >
            <CheckCircle size={15} />
            <span>DEPLOY LIVE SOS TO TACTICAL MAP & CLUSTER ENGINE</span>
          </button>
        </div>
      </div>
    </div>
  );
}