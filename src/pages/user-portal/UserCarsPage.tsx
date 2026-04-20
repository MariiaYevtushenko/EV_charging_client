import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton } from '../../components/station-admin/Primitives';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { userPortalPageSubtitle, userPortalPageTitle } from '../../styles/userPortalTheme';
import type { UserCar } from '../../types/userPortal';

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function CarGarageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 17h8M4 17v-5l2-4h12l2 4v5M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2M9 14h6"
      />
    </svg>
  );
}

function carStatsForId(
  carId: string,
  sessions: { vehicleId?: string; kwh: number }[]
): { sessionCount: number; kwhTotal: number } {
  let sessionCount = 0;
  let kwhTotal = 0;
  for (const s of sessions) {
    if (s.vehicleId === carId) {
      sessionCount += 1;
      kwhTotal += s.kwh;
    }
  }
  return {
    sessionCount,
    kwhTotal: Math.round(kwhTotal * 1000) / 1000,
  };
}

export default function UserCarsPage() {
  const { cars, sessions, removeCar } = useUserPortal();
  const [deleteTarget, setDeleteTarget] = useState<UserCar | null>(null);
  const [detailCar, setDetailCar] = useState<UserCar | null>(null);

  const confirmDelete = () => {
    if (deleteTarget) {
      removeCar(deleteTarget.id);
      setDeleteTarget(null);
      if (detailCar?.id === deleteTarget.id) setDetailCar(null);
    }
  };

  const detailStats = useMemo(
    () => (detailCar ? carStatsForId(detailCar.id, sessions) : null),
    [detailCar, sessions]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={userPortalPageTitle}>Мої авто</h1>
          <p className={userPortalPageSubtitle}>
            Натисніть картку, щоб переглянути дані та статистику зарядок. Фото підбираються за назвою моделі.
          </p>
        </div>
        <Link to="/dashboard/cars/new" className={`${appPrimaryCtaClass} shrink-0 self-start sm:self-auto`}>
          + Додати авто
        </Link>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget ? `Прибрати «${deleteTarget.model}» з гаража?` : 'Видалити авто?'}
        description={
          <p className="text-sm text-gray-600">
            Авто зникне зі списку. Потім його можна буде додати знову.
          </p>
        }
        confirmLabel="Так, прибрати"
        cancelLabel="Скасувати"
        variant="danger"
      />

      {detailCar ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="car-detail-title"
          onClick={() => setDetailCar(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDetailCar(null);
          }}
        >
          <div
            className="relative max-h-[min(90dvh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-emerald-100/80 bg-white shadow-2xl ring-1 ring-slate-900/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Закрити"
              onClick={() => setDetailCar(null)}
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <div className="aspect-[2/1] w-full overflow-hidden rounded-t-xl bg-slate-100">
              <img
                src={
                  detailCar.imageUrl?.trim() ||
                  suggestCarImageByModel(detailCar.model) ||
                  DEFAULT_CAR_IMAGE
                }
                alt=""
                className="h-full w-full object-cover"
                onError={(ev) => {
                  (ev.target as HTMLImageElement).src = DEFAULT_CAR_IMAGE;
                }}
              />
            </div>
            <div className="space-y-4 p-5 pt-6">
              <div>
                <h2 id="car-detail-title" className="text-lg font-semibold text-slate-900">
                  {detailCar.model}
                </h2>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-600">{detailCar.plate}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Роз’єм: <span className="font-medium text-slate-900">{detailCar.connector}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-emerald-100/90 bg-emerald-50/40 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/60">Сесій</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{detailStats.sessionCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/60">Енергія</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                    {detailStats.kwhTotal.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Підрахунок лише для сесій, де обрано це авто. Якщо сесії без прив’язки до авто — тут буде 0.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  to={`/dashboard/cars/${detailCar.id}/edit`}
                  className={`${appPrimaryCtaClass} flex-1 text-center text-sm`}
                  onClick={() => setDetailCar(null)}
                >
                  Редагувати
                </Link>
                <OutlineButton type="button" className="flex-1" onClick={() => setDetailCar(null)}>
                  Закрити
                </OutlineButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cars.length === 0 ? (
        <AppCard className="relative overflow-hidden border border-emerald-100/90 !p-0">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-100/40 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-center px-6 py-14 text-center sm:py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80">
              <CarGarageIcon className="h-9 w-9" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-gray-900">Поки що порожньо</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
              Додайте хоча б один електромобіль — зручніше бронювати зарядку та бачити авто у списку.
            </p>
            <Link
              to="/dashboard/cars/new"
              className={`${appPrimaryCtaClass} mt-8 px-8 py-3 text-base`}
            >
              Додати перше авто
            </Link>
          </div>
        </AppCard>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((c) => {
            const src = c.imageUrl?.trim() || suggestCarImageByModel(c.model) || DEFAULT_CAR_IMAGE;
            const { sessionCount, kwhTotal } = carStatsForId(c.id, sessions);
            return (
              <li key={c.id}>
                <article
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailCar(c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDetailCar(c);
                    }
                  }}
                  className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/[0.04] transition hover:shadow-md hover:ring-emerald-500/15"
                >
                  <div className="relative aspect-[2/1] overflow-hidden bg-gradient-to-br from-slate-100 to-emerald-50/30">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).src = DEFAULT_CAR_IMAGE;
                      }}
                    />
                    <div
                      className="absolute right-2 top-2 z-[1] flex gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/dashboard/cars/${c.id}/edit`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow-md shadow-slate-900/10 ring-1 ring-slate-200/90 transition hover:bg-emerald-50 hover:text-emerald-800 hover:ring-emerald-300/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                        title="Редагувати"
                        aria-label={`Редагувати ${c.model}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-red-600 shadow-md shadow-slate-900/10 ring-1 ring-red-100 transition hover:bg-red-50 hover:text-red-700 hover:ring-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                        title="Видалити"
                        aria-label={`Видалити ${c.model}`}
                        onClick={() => setDeleteTarget(c)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 border-t border-slate-100 p-3 sm:p-3.5">
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{c.model}</h2>
                    <p className="font-mono text-xs font-semibold tabular-nums tracking-wide text-slate-600">{c.plate}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Сесій: <span className="font-semibold text-slate-700">{sessionCount}</span>
                      {' · '}
                      {kwhTotal.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} кВт·год
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
