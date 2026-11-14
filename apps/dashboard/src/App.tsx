import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import HeatmapPage from './pages/HeatmapPage';
import ReportsPage from './pages/ReportsPage';
import SheltersPage from './pages/SheltersPage';
import LoginPage from './pages/LoginPage';
import PublicPage from './pages/PublicPage';
import IntelPage from './pages/IntelPage';
import AftermathPage from './pages/AftermathPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // If loading and we don't even have a cached user, show brief tactical splash
  if (loading && !user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#07100b',
        color: '#9eb89f',
        fontSize: 12,
        letterSpacing: '0.15em',
        fontWeight: 700,
        fontFamily: 'monospace',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, color: '#a7c9ab', marginBottom: 16 }}>◆</div>
          AUTHENTICATING...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public" element={<PublicPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/aftermath" element={<AftermathPage />} />
        <Route path="/aftermath/:fileId" element={<AftermathPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/intel" element={<IntelPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/shelters" element={<SheltersPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
