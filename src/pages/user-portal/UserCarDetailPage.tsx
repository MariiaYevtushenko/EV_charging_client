import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { appChipSelectedClass, appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { UserCarFormShell } from '../../components/user-portal/UserCarFormShell';
import {
  fetchUserVehicleAggregates,
  userCarInitialBrandModel,
  type UserVehicleAggregatesDto,
} from '../../api/userVehicles';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';
import { carStatsForIdInPeriod, type CarDetailPeriod } from '../../utils/carStatsForCar';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wide text-gray-500';

function fmtBatteryKwh(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} кВт·год`;
}

const PERIOD_OPTIONS: { id: CarDetailPeriod; label: string }[] = [
  { id: 'today', label: 'Сьогодні' },
  { id: '7d', label: '7 днів' },
  { id: '30d', label: '30 днів' },
  { id: 'all', label: 'Весь час' },
];

function dbBucketForPeriod(p: CarDetailPeriod): keyof Omit<UserVehicleAggregatesDto, 'vehicleId'> {
  if (p === 'today') return 'today';
  if (p === '7d') return 'last7d';
  if (p === '30d') return 'last30d';
  return 'all';
}

function isPersistedVehicleId(id: string): boolean {
  return /^\d+$/.test(id.trim());
}

export default function UserCarDetailPage() {
  const { carId } = useParams<{ carId: string }>();
  const { user } = useAuth();
  const { cars, sessions } = useUserPortal();
  const [period, setPeriod] = useState<CarDetailPeriod>('30d');
  const [dbAgg, setDbAgg] = useState<UserVehicleAggregatesDto | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const car = useMemo(() => (carId ? cars.find((c) => c.id === carId) : undefined), [cars, carId]);

  const previewSrc = useMemo(
    () => (car ? car.imageUrl?.trim() || suggestCarImageByModel(car.model) || DEFAULT_CAR_IMAGE : ''),
    [car]
  );

  const detailStats = useMemo(
    () => (car ? carStatsForIdInPeriod(car.id, sessions, period) : null),
    [car, sessions, period]
  );

  const dbStatsForPeriod = useMemo(() => {
    if (!dbAgg) return null;
    return dbAgg[dbBucketForPeriod(period)];
  }, [dbAgg, period]);

  useEffect(() => {
    if (!car || !isPersistedVehicleId(car.id)) {
      setDbAgg(null);
      setDbError(null);
      setDbLoading(false);
      return;
    }
    const uid = Number(user?.id);
    const vid = Number(car.id);
    if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(vid)) {
      setDbAgg(null);
      return;
    }
    let cancelled = false;
    setDbLoading(true);
    setDbError(null);
    fetchUserVehicleAggregates(uid, vid)
      .then((data) => {
        if (!cancelled) setDbAgg(data);
      })
      .catch(() => {
        if (!cancelled) {
          setDbAgg(null);
          setDbError('Не вдалося отримати агрегати з БД');
        }
      })
      .finally(() => {
        if (!cancelled) setDbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [car, user?.id]);

  if (!carId || !car) {
    return <Navigate to="/dashboard/cars" replace />;
  }

  const bm = userCarInitialBrandModel(car);

  return (
    <UserCarFormShell
      title="Деталі авто"
      description=""
      previewSrc={previewSrc}
      compact
      rightColumnJustify="start"
      rightColumnHeader={
        <div>
          <p className="text-base font-semibold text-gray-900">{bm.brand}</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-800">{bm.vehicleModel}</p>
          <p className="mt-1 font-mono text-sm tabular-nums tracking-wide text-gray-600">{car.plate}</p>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 sm:grid-cols-2 sm:gap-3">
          <div>
            <p className={sectionLabel}>Бренд</p>
            <p className="mt-1.5 text-sm font-semibold text-gray-900">{bm.brand || '—'}</p>
          </div>
          <div>
            <p className={sectionLabel}>Модель</p>
            <p className="mt-1.5 text-sm font-semibold text-gray-900">{bm.vehicleModel || '—'}</p>
          </div>
          <div>
            <p className={sectionLabel}>Державний номер</p>
            <p className="mt-1.5 font-mono text-sm font-semibold tabular-nums tracking-wide text-gray-900">{car.plate}</p>
          </div>
          <div>
            <p className={sectionLabel}>Ємність акумулятора (кВт·год)</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-gray-900">{fmtBatteryKwh(car.batteryCapacity)}</p>
          </div>
        </div>

        <div>
          <p className={`${sectionLabel} mb-1.5`}>Період</p>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Період статистики"
          >
            {PERIOD_OPTIONS.map((p) => {
              const selected = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setPeriod(p.id)}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 sm:px-4 ${
                    selected ? appChipSelectedClass : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100/90 bg-emerald-50/40 p-3 sm:p-4">
          <p className={`${sectionLabel} text-emerald-900/80`}>Агрегати з бази даних</p>
          {isPersistedVehicleId(car.id) ? (
            <p className="mt-1 text-[11px] leading-snug text-emerald-900/70">
              За наявності функції <span className="font-mono">GetVehicleReportForPeriod</span> — лише сесії зі статусом
              COMPLETED та оплачений рахунок (SUCCESS). Інакше показуються всі сесії з кабінету через Prisma.
            </p>
          ) : null}
          {!isPersistedVehicleId(car.id) ? (
            <p className="mt-3 text-sm text-gray-600">
              Після збереження авто в обліковому записі з’явиться зв’язок з БД. Нижче — оцінка зі списку сесій, завантаженого в
              кабінет.
            </p>
          ) : null}
          {dbError ? <p className="mt-2 text-xs font-medium text-amber-800">{dbError}</p> : null}
          {dbLoading && isPersistedVehicleId(car.id) ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((k) => (
                <div key={k} className="h-14 animate-pulse rounded-lg bg-white/50" />
              ))}
            </div>
          ) : dbStatsForPeriod ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
              <div>
                <p className={sectionLabel}>Сесій</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                  {dbStatsForPeriod.sessionCount.toLocaleString('uk-UA')}
                </p>
              </div>
              <div>
                <p className={sectionLabel}>Спожито енергії</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                  {dbStatsForPeriod.kwhTotal.toLocaleString('uk-UA', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3,
                  })}{' '}
                  <span className="text-sm font-semibold text-gray-600">кВт·год</span>
                </p>
              </div>
              <div>
                <p className={sectionLabel}>Сума рахунків</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-800 sm:text-xl">
                  {dbStatsForPeriod.revenueUah.toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-sm font-semibold text-gray-600">грн</span>
                </p>
              </div>
            </div>
          ) : detailStats && (!isPersistedVehicleId(car.id) || dbError) ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
              <div>
                <p className={sectionLabel}>Сесій (кабінет)</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                  {detailStats.sessionCount.toLocaleString('uk-UA')}
                </p>
              </div>
              <div>
                <p className={sectionLabel}>Спожито енергії (кабінет)</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                  {detailStats.kwhTotal.toLocaleString('uk-UA', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3,
                  })}{' '}
                  <span className="text-sm font-semibold text-gray-600">кВт·год</span>
                </p>
              </div>
              <div>
                <p className={sectionLabel}>Сума зарядок (кабінет)</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-800 sm:text-xl">
                  {detailStats.costTotal.toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-sm font-semibold text-gray-600">грн</span>
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <Link
            to={`/dashboard/cars/${car.id}/edit`}
            className={`${appPrimaryCtaClass} inline-flex items-center justify-center text-center text-sm`}
          >
            Редагувати авто
          </Link>
        </div>
      </div>
    </UserCarFormShell>
  );
}
