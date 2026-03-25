import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';
import { DEFAULT_CAR_IMAGE } from '../../utils/carImageSuggest';
import { appInputClass, appPrimaryCtaClass } from '../../components/station-admin/formStyles';

const carCardIconBtnClass =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-md ring-1 ring-black/10 backdrop-blur-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600';

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
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
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export default function UserCarsPage() {
  const { cars, removeCar } = useUserPortal();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter(
      (c) =>
        c.model.toLowerCase().includes(q) ||
        c.plate.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        c.connector.toLowerCase().includes(q)
    );
  }, [cars, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Мої авто</h1>
         
        </div>
        <Link to="/dashboard/cars/new" className={appPrimaryCtaClass}>
          Додати авто
        </Link>
      </div>

      <div>
        <label htmlFor="car-search" className="sr-only">
          Пошук авто
        </label>
        <input
          id="car-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук..."
          className={`${appInputClass} bg-white/90 shadow-sm shadow-emerald-900/5`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const src = c.imageUrl?.trim() || DEFAULT_CAR_IMAGE;
          return (
            <article
              key={c.id}
              className="group overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-0 transition hover:shadow-md hover:ring-2 hover:ring-green-500/15"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <img src={src} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
                  <Link
                    to={`/dashboard/cars/${c.id}/edit`}
                    className={`${carCardIconBtnClass} hover:text-green-700`}
                    aria-label={`Редагувати ${c.model}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className={`${carCardIconBtnClass} text-gray-600 hover:bg-red-50 hover:text-red-600 hover:ring-red-200/60`}
                    aria-label={`Видалити ${c.model}`}
                    onClick={() => removeCar(c.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[42%] min-h-[5.5rem] bg-black/65" aria-hidden />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-lg font-bold leading-tight drop-shadow-sm">{c.model}</p>
                  <p className="mt-0.5 text-sm font-medium text-white/90">{c.plate}</p>
                </div>
              </div>
              <div className="p-4">
                <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {c.connector}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {cars.length === 0 ? (
        <AppCard className="py-12 text-center text-sm text-gray-500">
          Ще немає збережених авто.{' '}
          <Link to="/dashboard/cars/new" className="font-semibold text-green-700 hover:underline">
            Додати перше
          </Link>
        </AppCard>
      ) : filtered.length === 0 ? (
        <AppCard className="py-10 text-center text-sm text-gray-500">Нічого не знайдено за запитом.</AppCard>
      ) : null}
    </div>
  );
}
