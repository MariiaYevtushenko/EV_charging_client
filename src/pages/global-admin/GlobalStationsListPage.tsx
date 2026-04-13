import AdminStationsListPage from '../shared/AdminStationsListPage';

/** Спільний UI з адміністратором станцій; відрізняється лише префіксом маршруту. */
export default function GlobalStationsListPage() {
  return <AdminStationsListPage dashboardBase="/admin-dashboard" />;
}
