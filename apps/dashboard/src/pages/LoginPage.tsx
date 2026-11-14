import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  isSupabaseConfigured,
  saveSupabaseConfig,
  clearSupabaseConfig,
} from '../services/supabase';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  // Auth form states
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('aditi.kapoor@resqnet.in');
  const [password, setPassword] = useState('aditi123456');
  const [name, setName] = useState('Aditi Kapoor');
  const [role, setRole] = useState('official');
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Optional collapsible Supabase config
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configAnon, setConfigAnon] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = isSignup
        ? await signup(email, password, name, role)
        : await login(email, password);

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please check credentials.');
      setLoading(false);
    }
  };

  // Quick 1-click Demo Login for hackathon testing & evaluators
  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    const demoEmail = 'official@resqnet.in';
    const demoPass = 'official123456';
    setEmail(demoEmail);
    setPassword(demoPass);
    setRole('official');

    try {
      const res = await login(demoEmail, demoPass);
      if (res.error) {
        // Fallback to admin if official is not yet registered
        const adminRes = await login('admin@resqnet.in', 'admin123456');
        if (adminRes.error) {
          setError('Demo account error: ' + (adminRes.error || res.error));
          setLoading(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/dashboard');
    }
  };

  return (
    <div className="resqnet-tactical-page">
      {/* ── Top Navigation Bar ── */}
      <header className="tactical-navbar">
        <div className="nav-brand-group">
          <div className="nav-logo-box">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a7c9ab"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m4.93 4.93 4.24 4.24" />
              <path d="m14.83 9.17 4.24-4.24" />
              <path d="m14.83 14.83 4.24 4.24" />
              <path d="m9.17 14.83-4.24 4.24" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <span className="nav-brand-title">RESQNET</span>
            <span className="nav-brand-sub">EMERGENCY INTELLIGENCE</span>
          </div>
        </div>

        <div className="nav-center-meta">
          <span>INDIA RESPONSE NETWORK</span>
          <span className="meta-square">■</span>
          <span>DEMO ENVIRONMENT</span>
        </div>

        <div className="nav-system-status">
          <div className="signal-bars">
            <span className="bar bar-1" />
            <span className="bar bar-2" />
            <span className="bar bar-3" />
          </div>
          <span>SYSTEM READY</span>
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <div className="tactical-workspace">
        {/* Left Hero & Visual Globe Section */}
        <section className="hero-section">
          {/* Tag */}
          <div className="hero-tag">
            <span className="tag-square">■</span>
            <span>INDIA • RESPONDER NETWORK</span>
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            When the world needs
            <br />
            help, every <span className="highlight-second">second</span>
            <br />
            matters.
          </h1>

          {/* Description */}
          <p className="hero-subtext">
            A shared operating picture for those who respond. See the signal,
            understand the need, move with purpose.
          </p>

          {/* 3D Photorealistic Earth Globe & Orbital Telemetry Visual */}
          <div className="globe-telemetry-stage">
            {/* Ambient Background Radial Glow */}
            <div className="globe-ambient-glow" />

            {/* 3D Earth Globe Sphere */}
            <div className="earth-sphere-container">
              <div className="earth-sphere">
                {/* Atmospheric Rim Lighting Layer */}
                <div className="earth-atmosphere" />
              </div>

              {/* 3D Inclined Orbital Rings */}
              <div className="orbital-ring orbital-ring-primary" />
              <div className="orbital-ring orbital-ring-secondary" />

              {/* Telemetry Hotspot Beacons on Globe */}
              {/* 1. Assam Live Sensor Ping */}
              <div className="telemetry-pin pin-assam">
                <div className="pin-marker" />
                <div className="pin-leader" />
                <div className="pin-callout">
                  <span className="pin-red-square">■</span>
                  <span>27.48° N • ASSAM</span>
                </div>
              </div>

              {/* 2. Maritime Monsoon Surge Indicator */}
              <div className="telemetry-pin pin-ocean">
                <div className="pin-pulse-beacon" />
              </div>

              {/* 3. Southern Peninsula Coordinate Node */}
              <div className="telemetry-pin pin-south">
                <div className="pin-yellow-dot" />
              </div>
            </div>

            {/* Technical Georeference Telemetry Meta at bottom right of globe */}
            <div className="globe-tech-meta">
              <span>EARTH OBSERVATION SYSTEM</span>
              <span>GEOREFERENCE: WGS 84</span>
            </div>
          </div>

          {/* Bottom KPI Stats Strip */}
          <div className="hero-stats-row">
            <div className="stat-column">
              <span className="stat-label">DISTRICTS MONITORED</span>
              <strong className="stat-val">742</strong>
            </div>

            <div className="stat-column">
              <span className="stat-label">RESPONSE PARTNERS</span>
              <strong className="stat-val">186</strong>
            </div>

            <div className="stat-column">
              <span className="stat-label">CURRENT NETWORK</span>
              <div className="stat-network-status">
                <span className="status-square">■</span>
                <span>Online</span>
              </div>
            </div>
          </div>

          {/* Active Monsoon System Badge */}
          <div className="hero-monsoon-system">
            <span className="monsoon-amber-square">■</span>
            <span>ACTIVE MONSOON SYSTEM</span>
          </div>
        </section>

        {/* Right Tactical "Command Center" Login Card */}
        <aside className="command-card-container">
          <div className="command-card">
            {/* Card Header */}
            <div className="command-card-top">
              <span className="secure-access-label">SECURE ACCESS</span>
              <div className="lock-icon-box" title="Encrypted Aerospace Grade Channel">
                <Lock size={13} />
              </div>
            </div>

            <h2 className="command-title">Command center</h2>
            <p className="command-sub">
              {isSignup ? 'Register new responder credentials' : 'Sign in to your response workspace'}
            </p>

            {/* Error Banner */}
            {error && (
              <div className="tactical-error-banner">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="tactical-form">
              {isSignup && (
                <div className="form-field-group">
                  <label className="field-label">OPERATOR NAME</label>
                  <input
                    type="text"
                    className="field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aditi Kapoor"
                    required
                  />
                </div>
              )}

              {/* Work Email */}
              <div className="form-field-group">
                <label className="field-label">WORK EMAIL</label>
                <input
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aditi.kapoor@resqnet.in"
                  required
                />
              </div>

              {/* Password */}
              <div className="form-field-group">
                <label className="field-label">PASSWORD</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="field-input password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Workspace Role */}
              <div className="form-field-group">
                <label className="field-label">WORKSPACE ROLE</label>
                <div className="select-wrapper">
                  <select
                    className="field-input field-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="official">Government Official</option>
                    <option value="admin">NDRF Commander (Disaster Ops)</option>
                    <option value="ngo">Relief Coordinator (NGO)</option>
                    <option value="volunteer">Field First Responder</option>
                  </select>
                </div>
              </div>

              {/* Remember Session */}
              <label className="remember-checkbox-row">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                />
                <span className="checkbox-custom" />
                <span className="remember-text">Remember this session</span>
              </label>

              {/* Sign In Primary Button */}
              <button type="submit" className="tactical-submit-btn" disabled={loading}>
                <Shield size={15} />
                <span>
                  {loading
                    ? 'AUTHENTICATING...'
                    : isSignup
                    ? 'Create Workspace Account →'
                    : 'Sign in →'}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="tactical-divider">
              <span className="divider-line" />
              <span className="divider-text">OR PREVIEW</span>
              <span className="divider-line" />
            </div>

            {/* Quick Demo Login */}
            <button
              type="button"
              className="quick-demo-btn"
              onClick={handleQuickDemo}
              disabled={loading}
              title="1-click Instant Demo Sign In for Hackathon Evaluators"
            >
              <Sparkles size={14} />
              <span>Quick demo login</span>
            </button>

            {/* Continue as Public Citizen */}
            <button
              type="button"
              className="public-citizen-link"
              onClick={() => navigate('/public')}
            >
              <Globe size={14} />
              <span>Continue as public citizen</span>
            </button>

            {/* Switch between Sign In / Sign Up */}
            <div className="card-sub-footer">
              <button
                type="button"
                className="toggle-mode-btn"
                onClick={() => setIsSignup((prev) => !prev)}
              >
                {isSignup
                  ? 'Already have an account? Sign In'
                  : 'Need new operator credentials? Sign Up'}
              </button>

              {/* Collapsible Supabase Settings */}
              <button
                type="button"
                className="db-settings-btn"
                onClick={() => setShowDbConfig((prev) => !prev)}
                title="Database Configuration"
              >
                <Settings size={12} />
              </button>
            </div>

            {/* Discreet Database Configuration Drawer (Only when opened or unconfigured) */}
            {(showDbConfig || !isSupabaseConfigured) && (
              <div className="discreet-db-config">
                <span className="db-config-title">SUPABASE CONNECTION SETUP</span>
                <input
                  className="db-config-input"
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                />
                <input
                  className="db-config-input"
                  type="text"
                  value={configAnon}
                  onChange={(e) => setConfigAnon(e.target.value)}
                  placeholder="eyJhbGciOi..."
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    type="button"
                    className="db-action-btn primary"
                    onClick={() => saveSupabaseConfig(configUrl, configAnon)}
                  >
                    Save & Sync
                  </button>
                  <button
                    type="button"
                    className="db-action-btn"
                    onClick={clearSupabaseConfig}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
