import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { StationsProvider } from './context/StationsContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Імпорт сторінок
import Login from "./pages/auth/Login"
import Signup from './pages/auth/SignUp';
import UserDashboard from './pages/dashboard/UserDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import StationAdminLayout from './layouts/StationAdminLayout';
import StationAdminHome from './pages/station-admin/StationAdminHome';
import StationsListPage from './pages/station-admin/StationsListPage';
import StationDetailPage from './pages/station-admin/StationDetailPage';
import StationEditPage from './pages/station-admin/StationEditPage';
import StationFunctionalityPage from './pages/station-admin/StationFunctionalityPage';
import StationAnalyticsPage from './pages/station-admin/StationAnalyticsPage';
import StationAdminProfilePage from './pages/station-admin/StationAdminProfilePage';
import StationNewPage from './pages/station-admin/StationNewPage';
import StationNotificationsPage from './pages/station-admin/StationNotificationsPage';
import StationNotificationDetailPage from './pages/station-admin/StationNotificationDetailPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Публічні маршрути */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Маршрути для звичайного Користувача */}
          <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
            <Route path="/dashboard" element={<UserDashboard />} />
          </Route>

          {/* Маршрути для Адміна Станцій */}
          <Route element={<ProtectedRoute allowedRoles={['STATION_ADMIN']} />}>
            <Route
              path="/station-dashboard"
              element={
                <StationsProvider>
                  <NotificationsProvider>
                    <StationAdminLayout />
                  </NotificationsProvider>
                </StationsProvider>
              }
            >
              <Route index element={<StationAdminHome />} />
              <Route path="stations" element={<StationsListPage />} />
              <Route path="stations/new" element={<StationNewPage />} />
              <Route path="stations/:stationId" element={<StationDetailPage />} />
              <Route path="stations/:stationId/edit" element={<StationEditPage />} />
              <Route
                path="stations/:stationId/functionality"
                element={<StationFunctionalityPage />}
              />
              <Route path="analytics" element={<StationAnalyticsPage />} />
              <Route path="notifications" element={<StationNotificationsPage />} />
              <Route path="notifications/:notificationId" element={<StationNotificationDetailPage />} />
              <Route path="profile" element={<StationAdminProfilePage />} />
            </Route>
          </Route>

          {/* Маршрути для Глобального Адміна */}
          <Route element={<ProtectedRoute allowedRoles={['GLOBAL_ADMIN']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Редирект за замовчуванням */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<div className="p-10 text-center">404 - Сторінку не знайдено</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;