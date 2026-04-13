import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StationsProvider } from './context/StationsContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Імпорт сторінок
import Login from "./pages/auth/Login"
import Signup from './pages/auth/SignUp';
import UserPortalLayout from './layouts/UserPortalLayout';
import { UserPortalProvider } from './context/UserPortalContext';
import UserHomePage from './pages/user-portal/UserHomePage';
import UserCarsPage from './pages/user-portal/UserCarsPage';
import UserSessionsPage from './pages/user-portal/UserSessionsPage';
import UserSessionDetailPage from './pages/user-portal/UserSessionDetailPage';
import UserBookingsPage from './pages/user-portal/UserBookingsPage';
import UserBookingNewPage from './pages/user-portal/UserBookingNewPage';
import UserBookingDetailPage from './pages/user-portal/UserBookingDetailPage';
import UserPaymentsPage from './pages/user-portal/UserPaymentsPage';
import UserPaymentDetailPage from './pages/user-portal/UserPaymentDetailPage';
import UserCarNewPage from './pages/user-portal/UserCarNewPage';
import UserCarEditPage from './pages/user-portal/UserCarEditPage';
import UserAnalyticsPage from './pages/user-portal/UserAnalyticsPage';
import UserProfilePage from './pages/user-portal/UserProfilePage';
import UserStationDetailPage from './pages/user-portal/UserStationDetailPage';
import UserSessionStartPage from './pages/user-portal/UserSessionStartPage';
import StationAdminLayout from './layouts/StationAdminLayout';
import GlobalAdminLayout from './layouts/GlobalAdminLayout';
import { GlobalAdminProvider } from './context/GlobalAdminContext';
import GlobalAdminHome from './pages/global-admin/GlobalAdminHome';
import GlobalStationsListPage from './pages/global-admin/GlobalStationsListPage';
import GlobalUsersPage from './pages/global-admin/GlobalUsersPage';
import GlobalUserDetailPage from './pages/global-admin/GlobalUserDetailPage';
import GlobalUserEditPage from './pages/global-admin/GlobalUserEditPage';
import GlobalPaymentsPage from './pages/global-admin/GlobalPaymentsPage';
import GlobalBookingsPage from './pages/global-admin/GlobalBookingsPage';
import GlobalBookingDetailPage from './pages/global-admin/GlobalBookingDetailPage';
import GlobalSessionsPage from './pages/global-admin/GlobalSessionsPage';
import GlobalSessionDetailPage from './pages/global-admin/GlobalSessionDetailPage';
import GlobalAnalyticsPage from './pages/global-admin/GlobalAnalyticsPage';
import GlobalTariffsPage from './pages/global-admin/GlobalTariffsPage';
import GlobalAdminProfilePage from './pages/global-admin/GlobalAdminProfilePage';
import { StationAdminNetworkProvider } from './context/StationAdminNetworkContext';
import StationAdminHome from './pages/station-admin/StationAdminHome';
import StationsListPage from './pages/station-admin/StationsListPage';
import StationDetailPage from './pages/station-admin/StationDetailPage';
import StationEditPage from './pages/station-admin/StationEditPage';
import StationFunctionalityPage from './pages/station-admin/StationFunctionalityPage';
import StationAnalyticsPage from './pages/station-admin/StationAnalyticsPage';
import StationBookingsPage from './pages/station-admin/StationBookingsPage';
import StationSessionsPage from './pages/station-admin/StationSessionsPage';
import StationSessionDetailPage from './pages/station-admin/StationSessionDetailPage';
import StationAdminProfilePage from './pages/station-admin/StationAdminProfilePage';
import StationNewPage from './pages/station-admin/StationNewPage';
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
            <Route
              path="/dashboard"
              element={
                <StationsProvider>
                  <UserPortalProvider>
                    <UserPortalLayout />
                  </UserPortalProvider>
                </StationsProvider>
              }
            >
              <Route index element={<UserHomePage />} />
              <Route path="session" element={<UserSessionStartPage />} />
              <Route path="cars/new" element={<UserCarNewPage />} />
              <Route path="cars/:carId/edit" element={<UserCarEditPage />} />
              <Route path="cars" element={<UserCarsPage />} />
              <Route path="sessions/:sessionId" element={<UserSessionDetailPage />} />
              <Route path="sessions" element={<UserSessionsPage />} />
              <Route path="bookings" element={<UserBookingsPage />} />
              <Route path="bookings/new" element={<UserBookingNewPage />} />
              <Route path="bookings/:bookingId" element={<UserBookingDetailPage />} />
              <Route path="payments" element={<UserPaymentsPage />} />
              <Route path="payments/:paymentId" element={<UserPaymentDetailPage />} />
              <Route path="analytics" element={<UserAnalyticsPage />} />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="stations/:stationId" element={<UserStationDetailPage />} />
            </Route>
          </Route>

          {/* Маршрути для Адміна Станцій */}
          <Route element={<ProtectedRoute allowedRoles={['STATION_ADMIN']} />}>
            <Route
              path="/station-dashboard"
              element={
                <StationsProvider>
                  <StationAdminNetworkProvider>
                    <StationAdminLayout />
                  </StationAdminNetworkProvider>
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
              <Route path="bookings" element={<StationBookingsPage />} />
              <Route path="sessions" element={<StationSessionsPage />} />
              <Route path="sessions/:sessionId" element={<StationSessionDetailPage />} />
              <Route path="analytics" element={<StationAnalyticsPage />} />
              <Route path="profile" element={<StationAdminProfilePage />} />
            </Route>
          </Route>

          {/* Маршрути для Глобального Адміна */}
          <Route element={<ProtectedRoute allowedRoles={['GLOBAL_ADMIN']} />}>
            <Route
              path="/admin-dashboard"
              element={
                <StationsProvider>
                  <GlobalAdminProvider>
                    <GlobalAdminLayout />
                  </GlobalAdminProvider>
                </StationsProvider>
              }
            >
              <Route index element={<GlobalAdminHome />} />
              <Route path="stations" element={<GlobalStationsListPage />} />
              <Route path="stations/new" element={<StationNewPage />} />
              <Route path="stations/:stationId" element={<StationDetailPage />} />
              <Route path="stations/:stationId/edit" element={<StationEditPage />} />
              <Route path="users" element={<GlobalUsersPage />} />
              <Route path="users/:userId" element={<GlobalUserDetailPage />} />
              <Route path="users/:userId/edit" element={<GlobalUserEditPage />} />
              <Route path="payments" element={<GlobalPaymentsPage />} />
              <Route path="bookings/:bookingId" element={<GlobalBookingDetailPage />} />
              <Route path="bookings" element={<GlobalBookingsPage />} />
              <Route path="sessions/:sessionId" element={<GlobalSessionDetailPage />} />
              <Route path="sessions" element={<GlobalSessionsPage />} />
              <Route path="analytics" element={<GlobalAnalyticsPage />} />
              <Route path="tariffs" element={<GlobalTariffsPage />} />
              <Route path="profile" element={<GlobalAdminProfilePage />} />
            </Route>
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