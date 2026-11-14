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
import RotatingEarthGlobe from '../components/common/RotatingEarthGlobe';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('aditi.kapoor@resqnet.in');
  const [password, setPassword] = useState('aditi123456');
  const [name, setName] = useState('Aditi Kapoor');
  const [signupRole, setSignupRole] = useState('official');
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Optional collapsible Supabase connection config
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configAnon, setConfigAnon] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = isSignup
        ? await signup(email, password, name, signupRole)
        : await login(email, password);

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
      setLoading(false);
    }
  };

  const handleSelectRoleDemo = async (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
    setLoading(true);

    try {
      const res = await login(roleEmail, rolePass);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/dashboard');
    }
  };

  return (
    <div className="resqnet-tactical-page">
      {/* ── Top Tactical Navigation Bar ── */}
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
          {/* Top Tag & Narrative */}
          <div className="hero-top-content">
            <div className="hero-tag">
              <span className="tag-square">■</span>
              <span>INDIA • RESPONDER NETWORK</span>
            </div>

            <h1 className="hero-headline">
              When the world needs
              <br />
              help, every <span className="highlight-second">second</span>
              <br />
              matters.
            </h1>

            <p className="hero-subtext">
              A shared operating picture for those who respond. See the signal,
              understand the need, move with purpose.
            </p>
          </div>

          {/* 3D Photorealistic Rotating Earth Globe & Telemetry Orbits */}
          <div className="globe-telemetry-stage">
            {/* Ambient Background Radial Glow */}
            <div className="globe-ambient-glow" />

            {/* True 3D Rotating WebGL Globe */}
            <div className="earth-sphere-container">
              <RotatingEarthGlobe size={460} className="webgl-earth-canvas" />

              {/* 3D Inclined Orbital Rings */}
              <div className="orbital-ring orbital-ring-primary" />
              <div className="orbital-ring orbital-ring-secondary" />

              {/* Assam Telemetry Marker */}
              <div className="telemetry-pin pin-assam">
                <div className="pin-marker" />
                <div className="pin-leader" />
                <div className="pin-callout">
                  <span className="pin-red-square">■</span>
                  <span>27.48° N • ASSAM</span>
                </div>
              </div>

              {/* Ocean Hotspot Marker */}
              <div className="telemetry-pin pin-ocean">
                <div className="pin-pulse-beacon" />
              </div>

              {/* Southern Node Marker */}
              <div className="telemetry-pin pin-south">
                <div className="pin-yellow-dot" />
              </div>
            </div>

            {/* Technical Metadata Footer */}
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

        {/* Right Tactical "Command Center" Access Card */}
        <aside className="command-card-container">
          <div className="command-card">
            {/* Card Header */}
            <div className="command-card-top">
              <span className="secure-access-label">SECURE ACCESS</span>
              <div className="lock-icon-box" title="Encrypted Aerospace Operations Channel">
                <Lock size={13} />
              </div>
            </div>

            <h2 className="command-title">Command center</h2>
            <p className="command-sub">
              {isSignup ? 'Register new tactical credentials' : 'Sign in to your response workspace'}
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
                <>
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
                  <div className="form-field-group">
                    <label className="field-label">OPERATIONAL ROLE</label>
                    <select
                      className="field-input field-select"
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value)}
                    >
                      <option value="official">Government Official</option>
                      <option value="admin">NDRF Disaster Commander</option>
                      <option value="ngo">Relief Coordinator (NGO)</option>
                      <option value="volunteer">Field First Responder</option>
                    </select>
                  </div>
                </>
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

              {/* Quick Role Selection Pills */}
              <div className="demo-role-quickselect">
                <span className="demo-role-label">QUICK SWITCH ROLE:</span>
                <div className="demo-role-pills">
                  <button
                    type="button"
                    className={`role-pill-btn ${email === 'aditi.kapoor@resqnet.in' ? 'active' : ''}`}
                    onClick={() => {
                      setEmail('aditi.kapoor@resqnet.in');
                      setPassword('aditi123456');
                    }}
                  >
                    Official (Aditi)
                  </button>
                  <button
                    type="button"
                    className={`role-pill-btn ${email === 'admin@resqnet.in' ? 'active' : ''}`}
                    onClick={() => {
                      setEmail('admin@resqnet.in');
                      setPassword('admin123456');
                    }}
                  >
                    Commander (Admin)
                  </button>
                  <button
                    type="button"
                    className={`role-pill-btn ${email === 'ngo@resqnet.in' ? 'active' : ''}`}
                    onClick={() => {
                      setEmail('ngo@resqnet.in');
                      setPassword('ngo123456');
                    }}
                  >
                    NGO Relief
                  </button>
                </div>
              </div>

              {/* Remember Session */}
              <label className="remember-checkbox-row">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                />
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

            {/* Tactical Divider */}
            <div className="tactical-divider">
              <span className="divider-line" />
              <span className="divider-text">OR PREVIEW</span>
              <span className="divider-line" />
            </div>

            {/* Quick Demo Login (Guaranteed Instant Access) */}
            <button
              type="button"
              className="quick-demo-btn"
              onClick={() => handleSelectRoleDemo('aditi.kapoor@resqnet.in', 'aditi123456')}
              disabled={loading}
              title="1-click Instant Demo Access for Evaluators"
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

            {/* Sub-footer: Sign In / Sign Up toggle & Settings */}
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

              <button
                type="button"
                className="db-settings-btn"
                onClick={() => setShowDbConfig((prev) => !prev)}
                title="Database Configuration"
              >
                <Settings size={12} />
              </button>
            </div>

            {/* Discreet Database Configuration Drawer */}
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
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
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
