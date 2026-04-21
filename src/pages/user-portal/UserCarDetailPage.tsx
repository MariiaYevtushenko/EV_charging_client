import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { appChipSelectedClass, appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { UserCarFormShell } from '../../components/user-portal/UserCarFormShell';
import { userCarInitialBrandModel } from '../../api/userVehicles';
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

export default function UserCarDetailPage() {
  const { carId } = useParams<{ carId: string }>();
  const { cars, sessions } = useUserPortal();
  const [period, setPeriod] = useState<CarDetailPeriod>('30d');

  const car = useMemo(() => (carId ? cars.find((c) => c.id === carId) : undefined), [cars, carId]);

  const previewSrc = useMemo(
    () => (car ? car.imageUrl?.trim() || suggestCarImageByModel(car.model) || DEFAULT_CAR_IMAGE : ''),
    [car]
  );

  const detailStats = useMemo(
    () => (car ? carStatsForIdInPeriod(car.id, sessions, period) : null),
    [car, sessions, period]
  );

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

        {detailStats ? (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50/90 p-3 sm:grid-cols-3 sm:gap-3">
            <div>
              <p className={sectionLabel}>Сесій</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                {detailStats.sessionCount.toLocaleString('uk-UA')}
              </p>
            </div>
            <div>
              <p className={sectionLabel}>Спожито енергії</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                {detailStats.kwhTotal.toLocaleString('uk-UA', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 3,
                })}{' '}
                <span className="text-sm font-semibold text-gray-600">кВт·год</span>
              </p>
            </div>
            <div>
              <p className={sectionLabel}>Сума зарядок</p>
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
