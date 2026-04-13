import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, PrimaryButton } from '../../components/station-admin/Primitives';
import { fetchAdminDashboard } from '../../api/adminDashboard';

export default function GlobalAdminHome() {
  const { stationsTotal, stationStatusCounts, loading: stationsLoading } = useStations();
  const { usersTotal, endUsersReady } = useGlobalAdmin();

  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [todayRev, setTodayRev] = useState(0);
  const [todaySess, setTodaySess] = useState(0);
  const [paymentsOk, setPaymentsOk] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDashLoading(true);
      setDashError(null);
      try {
        const d = await fetchAdminDashboard();
        if (cancelled) return;
        setTodayRev(d.todayRevenueUah);
        setTodaySess(d.todaySessions);
        setPaymentsOk(d.todaySuccessfulPayments);
      } catch {
        if (!cancelled) {
          setDashError('Не вдалося завантажити статистику');
          setTodayRev(0);
          setTodaySess(0);
          setPaymentsOk(0);
        }
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const working = stationStatusCounts?.working ?? 0;
  const offline = stationStatusCounts?.offline ?? 0;
  const maintenance = stationStatusCounts?.maintenance ?? 0;
  const archived = stationStatusCounts?.archived ?? 0;
  const activeOnMap = Math.max(0, stationsTotal - archived);

  const showDashPlaceholder = dashLoading;
  const usersLabel =
    !endUsersReady && usersTotal === 0 ? '…' : usersTotal.toLocaleString('uk-UA');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Головна панель</h1>
      </div>

      <AppCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Мережа</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stationsLoading ? '…' : stationsTotal.toLocaleString('uk-UA')}{' '}
            <span className="text-lg font-semibold text-gray-600">станцій у базі</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Активних на карті: {stationsLoading ? '…' : activeOnMap.toLocaleString('uk-UA')} ·
            Користувачів: {usersLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
              <p className="text-2xl font-bold text-gray-900">
                {stationsLoading ? '…' : working.toLocaleString('uk-UA')}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {stationsLoading ? '…' : offline.toLocaleString('uk-UA')}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {stationsLoading ? '…' : maintenance.toLocaleString('uk-UA')}
              </p>
            </div>
          </div>
        </AppCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід сьогодні</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {showDashPlaceholder ? '…' : todayRev.toLocaleString('uk-UA')} грн
          </p>
          {dashError ? <p className="mt-1 text-xs text-red-600">{dashError}</p> : null}
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії сьогодні</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {showDashPlaceholder ? '…' : todaySess.toLocaleString('uk-UA')}
          </p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні платежі сьогодні</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {showDashPlaceholder ? '…' : paymentsOk.toLocaleString('uk-UA')}
          </p>
        </AppCard>
      </div>
    </div>
  );
}
