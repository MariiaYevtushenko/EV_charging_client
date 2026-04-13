import AdminStationsListPage from '../shared/AdminStationsListPage';

/** Спільний UI з глобальним адміном; відрізняється лише префіксом маршруту. */
export default function StationsListPage() {
  return <AdminStationsListPage dashboardBase="/station-dashboard" />;
}
