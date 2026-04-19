import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import type { UserCar } from '../../types/userPortal';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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

export default function UserCarsPage() {
  const { cars, removeCar } = useUserPortal();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserCar | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter(
      (c) =>
        c.model.toLowerCase().includes(q) ||
        c.plate.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, [cars, query]);

  const confirmDelete = () => {
    if (deleteTarget) {
      removeCar(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Мої авто</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Додавайте електромобілі з моделлю та номером — фото підбирається автоматично за назвою моделі.
          </p>
          {cars.length > 0 ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-700/90">
              У гаражі: {cars.length} авто
            </p>
          ) : null}
        </div>
        <Link to="/dashboard/cars/new" className={`${appPrimaryCtaClass} shrink-0 self-start sm:self-auto`}>
          + Додати авто
        </Link>
      </div>

      {cars.length > 0 ? (
        <div className="max-w-xl">
          <label htmlFor="car-search" className="sr-only">
            Пошук за моделлю або номером
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400"
              aria-hidden
            >
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              id="car-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Модель або номерний знак…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      ) : null}

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
      ) : filtered.length === 0 ? (
        <AppCard className="border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">Нічого не знайдено за запитом.</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            onClick={() => setQuery('')}
          >
            Очистити пошук
          </button>
        </AppCard>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const src = c.imageUrl?.trim() || suggestCarImageByModel(c.model) || DEFAULT_CAR_IMAGE;
            return (
              <li key={c.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-950/[0.04] transition hover:shadow-md hover:ring-emerald-500/20">
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).src = DEFAULT_CAR_IMAGE;
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent pt-16 pb-4 px-4">
                      <h2 className="text-lg font-bold leading-snug text-white drop-shadow-sm">
                        {c.model}
                      </h2>
                      <p className="mt-1 inline-block rounded-md bg-white/15 px-2 py-0.5 font-mono text-sm font-semibold tracking-wide text-white backdrop-blur-sm">
                        {c.plate}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-gray-100 p-4">
                    <Link
                      to={`/dashboard/cars/${c.id}/edit`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/80 hover:text-emerald-900 sm:flex-none"
                    >
                      Редагувати
                    </Link>
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:flex-none"
                      onClick={() => setDeleteTarget(c)}
                    >
                      Видалити
                    </button>
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
