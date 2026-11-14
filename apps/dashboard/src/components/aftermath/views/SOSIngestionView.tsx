import { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { extractSOSWithGemini, type ExtractedSOSGemini } from '../../../services/geminiService';
import { extractEmergencyIntelligence } from '../../../services/aftermathIntelligence';
import type { ProcessedSOSReport } from '@resqnet/shared-types';
import type { DisasterEventRecord } from '../../../services/indiaDisasterArchive';

interface SOSIngestionViewProps {
  onIngestReport: (report: ProcessedSOSReport) => void;
  onNavigateToMap: () => void;
  recentReports: ProcessedSOSReport[];
  currentDisaster?: DisasterEventRecord;
}

export default function SOSIngestionView({
  onIngestReport,
  onNavigateToMap,
  recentReports,
  currentDisaster,
}: SOSIngestionViewProps) {
  const centerLat = currentDisaster?.coordinates[0] || 11.524;
  const centerLng = currentDisaster?.coordinates[1] || 76.182;
  const disasterName = currentDisaster?.shortName || 'Current Disaster Zone';

  const [name, setName] = useState('Local Resident');
  const [phone, setPhone] = useState('98112-98442');
  const [category, setCategory] = useState<ProcessedSOSReport['category']>('Rescue Needed');
  const [severity, setSeverity] = useState<number>(5);
  const [latitude, setLatitude] = useState<number>(centerLat + 0.002);
  const [longitude, setLongitude] = useState<number>(centerLng + 0.001);
  const [message, setMessage] = useState(
    `Heavy breach in ${disasterName} sector! 6 citizens trapped in structural void including 2 toddlers and 1 disabled senior. Water/rubble level rising rapidly, urgent extraction required!`
  );

  const [geminiResult, setGeminiResult] = useState<ExtractedSOSGemini | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Update defaults when active disaster switches
  useEffect(() => {
    if (currentDisaster) {
      setLatitude(Number((currentDisaster.coordinates[0] + 0.002).toFixed(4)));
      setLongitude(Number((currentDisaster.coordinates[1] + 0.001).toFixed(4)));
      setMessage(
        `Critical emergency in ${currentDisaster.shortName}! 5 people trapped on upper floor, road access severed. Immediate NDRF rescue intervention needed!`
      );
      setGeminiResult(null);
    }
  }, [currentDisaster]);

  // Context-aware dynamic presets based on the active disaster
  const dynamicPresets = useMemo(() => {
    const lat = currentDisaster?.coordinates[0] || 11.524;
    const lng = currentDisaster?.coordinates[1] || 76.182;
    const cat = currentDisaster?.category || 'flood';
    const loc = currentDisaster?.shortName || 'Epicenter';

    if (cat === 'landslide' || cat === 'subsidence') {
      return [
        {
          label: '⛰️ Mudflow Rubble Void SOS',
          name: 'P. Vijayan',
          phone: '94470-12890',
          category: 'Rescue Needed' as const,
          severity: 5 as const,
          lat: lat + 0.0015,
          lng: lng - 0.0012,
          message: `Debris flow crashed into 2 houses at ${loc}. 7 people trapped inside void beneath collapsed roof slabs. We hear faint cries, heavy excavators and acoustic USAR listening devices needed urgently!`,
        },
        {
          label: '🏥 Cut-Off Triage Medical SOS',
          name: 'Sister Mary Varghese',
          phone: '98460-77123',
          category: 'Medical Emergency' as const,
          severity: 5 as const,
          lat: lat - 0.002,
          lng: lng + 0.0018,
          message: `Community clinic surrounded by mudflow at ${loc}. 4 critical crush injury survivors losing blood. Need emergency trauma stabilization kits, oxygen, and helicopter or zipline evacuation!`,
        },
        {
          label: '🍞 Stranded Workers Camp SOS',
          name: 'Ashok Kumar',
          phone: '97441-33451',
          category: 'Food / Water' as const,
          severity: 3 as const,
          lat: lat + 0.003,
          lng: lng + 0.002,
          message: `18 plantation laborers isolated on high ridge near ${loc}. Roads washed away on both sides. Zero potable drinking water and infant formula since 24 hours.`,
        },
      ];
    }

    if (cat === 'cyclone') {
      return [
        {
          label: '🌀 Coastal Storm Surge SOS',
          name: 'Ketan Baria',
          phone: '98251-44019',
          category: 'Rescue Needed' as const,
          severity: 5 as const,
          lat: lat + 0.0025,
          lng: lng - 0.002,
          message: `Seawater storm surge has breached coastal bund at ${loc}. 8 villagers stranded on temple roof, gale winds exceeding 110 km/h, fallen electric poles in water! Amphibious rescue boat needed.`,
        },
        {
          label: '🏥 Submerged Primary Health Post',
          name: 'Dr. Pravin Joshi',
          phone: '99240-88192',
          category: 'Medical Emergency' as const,
          severity: 4 as const,
          lat: lat - 0.0018,
          lng: lng + 0.0015,
          message: `PHC generator flooded at ${loc}. 3 snakebite patients and 2 oxygen-dependent seniors. Road blocked by uprooted banyan trees, high-clearance 4x4 or JCB required!`,
        },
      ];
    }

    // Default / Flood / Flash Flood
    return [
      {
        label: '🌊 Flash Flood Inundation SOS',
        name: 'Gurmeet Singh',
        phone: '98104-55291',
        category: 'Rescue Needed' as const,
        severity: 5 as const,
        lat: lat + 0.002,
        lng: lng + 0.001,
        message: `Water has crossed 5 feet in ${loc} sector. 7 people trapped on terrace including 3 young children and my 82-year-old grandmother. Current is violent, road is cut off, Zodiac boat needed urgently!`,
      },
      {
        label: '🏢 Pancaked Structure Void SOS',
        name: 'Dr. Alok Verma',
        phone: '98731-09822',
        category: 'Rescue Needed' as const,
        severity: 5 as const,
        lat: lat - 0.0025,
        lng: lng - 0.0015,
        message: `Masonry structure pancaked at ${loc}. 9 citizens trapped in basement cavity. We hear intermittent tapping. Hydraulic shears and USAR search cameras needed!`,
      },
      {
        label: '🏥 Cut-Off Triage Medical SOS',
        name: 'Nurse Rekha Sharma',
        phone: '99100-34821',
        category: 'Medical Emergency' as const,
        severity: 4 as const,
        lat: lat + 0.0012,
        lng: lng - 0.0028,
        message: `Dispensary cut off by 4 feet floodwater in ${loc}. 5 trauma patients from collapsed wall need IV saline and oxygen. High clearance truck or boat needed!`,
      },
    ];
  }, [currentDisaster]);

  const handleRunNLP = async () => {
    setIsAnalyzing(true);
    try {
      const result = await extractSOSWithGemini(message, category || 'Rescue Needed', severity);
      setGeminiResult(result);
    } catch (err) {
      console.warn('NLP extraction fallback:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadPreset = (preset: (typeof dynamicPresets)[0]) => {
    setName(preset.name);
    setPhone(preset.phone);
    setCategory(preset.category);
    setSeverity(preset.severity);
    setLatitude(Number(preset.lat.toFixed(4)));
    setLongitude(Number(preset.lng.toFixed(4)));
    setMessage(preset.message);
    setGeminiResult(null);
    setIsSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reportId = `LIVE-SOS-${Date.now().toString().slice(-4)}`;

    const supplyMap: Record<string, number> = {};
    if (geminiResult) {
      geminiResult.equipment_needed.forEach((eq) => {
        supplyMap[eq.toLowerCase()] = 1;
      });
    } else {
      const fallbackInfo = extractEmergencyIntelligence(message, category || 'Rescue Needed', severity);
      fallbackInfo.rescue_requirements.forEach((req) => {
        supplyMap[req] = 1;
      });
    }

    const trappedCount = geminiResult ? geminiResult.trapped_count : 2;

    const newReport: ProcessedSOSReport = {
      id: reportId,
      created_at: new Date().toISOString(),
      name: name || 'Citizen in Distress',
      phone: phone || 'Unlisted',
      latitude: Number(latitude),
      longitude: Number(longitude),
      category,
      verified_severity: Number(severity),
      district: currentDisaster?.district || 'Epicenter District',
      detailed_area: `${disasterName} Sector [${latitude.toFixed(3)}, ${longitude.toFixed(3)}]`,
      message,
      supply_requirements: supplyMap,
      casualties_reported: severity >= 4 || trappedCount > 0,
      source_project: 'live_ingestion',
      processed_at: new Date().toISOString(),
      rephrased_message: geminiResult
        ? `${trappedCount} trapped. ${geminiResult.concise_action_summary} [${geminiResult.model_used}]`
        : message.slice(0, 100),
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
          <div className="file-kpi-val" style={{ color: '#00f0ff' }}>
            GEMINI
          </div>
          <span className="file-kpi-sub">
            {geminiResult ? geminiResult.model_used : 'Multi-Model Flash Engine'}
          </span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">EPICENTER ANCHOR</span>
          <div className="file-kpi-val" style={{ color: '#ffd166', fontSize: 16 }}>
            {currentDisaster?.shortName || 'India Zone'}
          </div>
          <span className="file-kpi-sub">
            [{centerLat.toFixed(2)}, {centerLng.toFixed(2)}]
          </span>
        </div>

        <div className="file-kpi-card">
          <span className="file-kpi-label">PIPELINE STATUS</span>
          <div className="file-kpi-val" style={{ color: isSuccess ? '#7ae582' : '#4cc9ff' }}>
            {isSuccess ? 'INGESTED' : 'READY'}
          </div>
          <span className="file-kpi-sub">Live Leaflet & Cluster Sync</span>
        </div>
      </div>

      {/* Action Bar with Presets */}
      <div className="file-action-bar">
        <div className="preset-strip">
          <span className="preset-label">Dynamic Presets ({currentDisaster?.shortName}):</span>
          {dynamicPresets.map((preset, idx) => (
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
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <RefreshCw size={13} className="spin-animation" />
                ) : (
                  <Sparkles size={13} />
                )}
                <span>{isAnalyzing ? 'Gemini Analyzing...' : 'Run Gemini AI NLP Parser'}</span>
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
              <h4>GEMINI REAL-TIME NLP INTELLIGENCE PREVIEW</h4>
            </div>

            {geminiResult ? (
              <div className="nlp-results-box">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 240, 255, 0.08)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 10,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ color: '#00f0ff', fontWeight: 800 }}>
                    ⚡ Powered by Google Gemini ({geminiResult.model_used})
                  </span>
                  <span style={{ color: '#94a3b8' }}>Live NLP Inference</span>
                </div>

                <div className="nlp-stat-row">
                  <span className="nlp-lbl">Trapped Survivors:</span>
                  <strong className="nlp-val" style={{ color: '#ef4444' }}>
                    {geminiResult.trapped_count} Citizens
                  </strong>
                </div>

                <div className="nlp-stat-row">
                  <span className="nlp-lbl">Urgency Rating:</span>
                  <strong className="nlp-val" style={{ color: '#f97316' }}>
                    LEVEL {geminiResult.urgency_score} / 5 ({geminiResult.distress_type})
                  </strong>
                </div>

                {geminiResult.vulnerable_demographics.length > 0 && (
                  <div className="nlp-stat-row">
                    <span className="nlp-lbl">Vulnerabilities:</span>
                    <strong className="nlp-val" style={{ color: '#ffd166' }}>
                      {geminiResult.vulnerable_demographics.join(', ')}
                    </strong>
                  </div>
                )}

                <div className="nlp-stat-row">
                  <span className="nlp-lbl">Operational Takeaway:</span>
                  <p className="nlp-rephrased" style={{ color: '#f1f5f9' }}>
                    {geminiResult.concise_action_summary}
                  </p>
                </div>

                <div className="nlp-supplies-section">
                  <span className="nlp-lbl">Required Rescue Operations & Equipment:</span>
                  <div className="supplies-tags">
                    {geminiResult.equipment_needed.map((req, i) => (
                      <span key={i} className="supply-tag">
                        {req.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="nlp-placeholder">
                <p>
                  Click <strong>"Run Gemini AI NLP Parser"</strong> to watch Google Gemini (gemini-3.8-flash / gemini-2.5-flash) perform live natural language extraction of trapped headcounts, vulnerability tags, and required rescue equipment in real time.
                </p>
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
