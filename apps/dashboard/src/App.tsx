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
  const { user } = useAuth();

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
