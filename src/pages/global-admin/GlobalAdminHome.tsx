import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useStations } from '../../context/StationsContext';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';

export default function GlobalAdminHome() {
  const { stations } = useStations();
  const { endUsers, allPayments } = useGlobalAdmin();

  const active = useMemo(() => stations.filter((s) => !s.archived), [stations]);
  const totalStations = stations.length;
  const working = active.filter((s) => s.status === 'working').length;
  const offline = active.filter((s) => s.status === 'offline').length;
  const maintenance = active.filter((s) => s.status === 'maintenance').length;
  const todayRev = active.reduce((a, s) => a + s.todayRevenue, 0);
  const todaySess = active.reduce((a, s) => a + s.todaySessions, 0);
  const paymentsOk = allPayments.filter((p) => p.status === 'success').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Головна панель</h1>
      </div>

      <AppCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Мережа</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalStations} <span className="text-lg font-semibold text-gray-600">станцій у базі</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Активних на карті: {active.length} · Користувачів  : {endUsers.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin-dashboard/stations">
            <OutlineButton type="button">Управляти станціями</OutlineButton>
          </Link>
          <Link to="/admin-dashboard/stations/new">
            <PrimaryButton type="button">Додати станцію</PrimaryButton>
          </Link>
        </div>
      </AppCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <span className="text-lg" aria-hidden>
                ●
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Працює</p>
              <p className="text-2xl font-bold text-gray-900">{working}</p>
            </div>
          </div>
        </AppCard>
        <AppCard className="!p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-200 text-gray-600">
              <span className="text-lg" aria-hidden>
                ●
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Оффлайн</p>
              <p className="text-2xl font-bold text-gray-900">{offline}</p>
            </div>
          </div>
        </AppCard>
        <AppCard className="!p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <span className="text-lg" aria-hidden>
                ●
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Обслуговування</p>
              <p className="text-2xl font-bold text-gray-900">{maintenance}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{todayRev.toLocaleString('uk-UA')} грн</p>
            </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії сьогодні</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{todaySess}</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні платежі</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{paymentsOk}</p>
          </AppCard>
      
      </div>

  
    </div>
  );
}
