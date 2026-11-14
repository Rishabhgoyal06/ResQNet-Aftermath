import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Flame,
  FileText,
  Building2,
  LogOut,
  Globe,
  LineChart,
  FolderOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  Satellite,
  Building,
  LifeBuoy,
  Route,
  BellRing,
  Send,
  Columns3,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = user?.role || 'public';
  const canManageShelters = ['admin', 'official', 'ngo'].includes(role);

  const isAftermathPath = location.pathname.startsWith('/aftermath');
  const [isAftermathOpen, setIsAftermathOpen] = useState(true);

  // Auto-expand folder when navigating inside aftermath
  useEffect(() => {
    if (isAftermathPath) {
      setIsAftermathOpen(true);
    }
  }, [isAftermathPath]);

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">◆</span>
            <span className="logo-text">RESQNET</span>
          </div>
          <span className="logo-subtitle">COMMAND CENTER</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Map size={18} />
            <span>Live Map</span>
          </NavLink>
          <NavLink to="/heatmap" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Flame size={18} />
            <span>Heatmap</span>
          </NavLink>
          <NavLink to="/intel" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <LineChart size={18} />
            <span>Intel</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <FileText size={18} />
            <span>Reports</span>
          </NavLink>
          {canManageShelters && (
            <NavLink to="/shelters" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
              <Building2 size={18} />
              <span>Shelters</span>
            </NavLink>
          )}

          {/* —— AFTERMATH AI Collapsible Folder with Files —— */}
          <div className={`nav-folder ${isAftermathPath ? 'nav-folder--active' : ''}`}>
            <button
              type="button"
              className="folder-toggle-btn"
              onClick={() => setIsAftermathOpen((prev) => !prev)}
              aria-expanded={isAftermathOpen}
              title="Click to expand/collapse Aftermath AI reports & tools"
            >
              <div className="folder-toggle-left">
                {isAftermathOpen ? (
                  <FolderOpen size={17} className="folder-icon folder-icon--open" />
                ) : (
                  <Folder size={17} className="folder-icon" />
                )}
                <span className="folder-name">AFTERMATH AI</span>
              </div>
              <div className="folder-toggle-right">
                <span className="folder-badge">7 FILES</span>
                {isAftermathOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {isAftermathOpen && (
              <div className="folder-files-tree">
                <NavLink
                  to="/aftermath/satellite"
                  className={({ isActive }) =>
                    `file-nav-item ${
                      isActive || location.pathname === '/aftermath' ? 'file-nav-item--active' : ''
                    }`
                  }
                >
                  <Satellite size={13} className="file-icon" />
                  <span className="file-name">Earth Observation</span>
                  <span className="file-ext">.map</span>
                </NavLink>

                <NavLink
                  to="/aftermath/damage"
                  className={({ isActive }) => `file-nav-item ${isActive ? 'file-nav-item--active' : ''}`}
                >
                  <Building size={13} className="file-icon" />
                  <span className="file-name">Damage Assessment</span>
                  <span className="file-ext">.rep</span>
                </NavLink>

                <NavLink
                  to="/aftermath/missions"
                  className={({ isActive }) => `file-nav-item ${isActive ? 'file-nav-item--active' : ''}`}
                >
                  <LifeBuoy size={13} className="file-icon" />
                  <span className="file-name">Rescue Missions</span>
                  <span className="file-ext">.ops</span>
                </NavLink>

                <NavLink
                  to="/aftermath/roads"
                  className={({ isActive }) => `file-nav-item ${isActive ? 'file-nav-item--active' : ''}`}
                >
                  <Route size={13} className="file-icon" />
                  <span className="file-name">Road Corridors</span>
                  <span className="file-ext">.nav</span>
                </NavLink>

                <NavLink
                  to="/aftermath/triggers"
                  className={({ isActive }) => `file-nav-item ${isActive ? 'file-nav-item--active' : ''}`}
                >
                  <BellRing size={13} className="file-icon" />
                  <span className="file-name">Disaster Triggers</span>
                  <span className="file-ext">.live</span>
                </NavLink>

                <NavLink
                  to="/aftermath/ingest"
                  className={({ isActive }) => `file-nav-item ${isActive ? 'file-nav-item--active' : ''}`}
                >
                  <Send size={13} className="file-icon" />
                  <span className="file-name">SOS Distress Intake</span>
                  <span className="file-ext">.log</span>
                </NavLink>

                <NavLink
                  to="/aftermath/split"
                  className={({ isActive }) => `file-nav-item ${isActive ? 'file-nav-item--active' : ''}`}
                >
                  <Columns3 size={13} className="file-icon" />
                  <span className="file-name">Dual Workspace</span>
                  <span className="file-ext">.dual</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/public" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Globe size={18} />
            <span>Public View</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <div className="user-avatar">{(user.name || user.email || 'U')[0].toUpperCase()}</div>
              <div className="user-details">
                <span className="user-name">{user.name || user.email}</span>
                <span className="user-role">{user.role.toUpperCase()}</span>
              </div>
              <button className="logout-btn" onClick={logout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
