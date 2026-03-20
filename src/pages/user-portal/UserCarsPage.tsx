import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, DangerButton } from '../../components/station-admin/Primitives';
import { DEFAULT_CAR_IMAGE } from '../../utils/carImageSuggest';
import { appInputClass, appPrimaryCtaClass, appSecondaryCtaSmClass } from '../../components/station-admin/formStyles';

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
          <p className="mt-1 text-sm text-gray-500">
            Картки з фото, пошук за моделлю або номером. Додавання — на окремій сторінці.
          </p>
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
          placeholder="Пошук за моделлю, номером або конектором…"
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
                <div className="absolute inset-x-0 bottom-0 h-[42%] min-h-[5.5rem] bg-black/65" aria-hidden />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-lg font-bold leading-tight drop-shadow-sm">{c.model}</p>
                  <p className="mt-0.5 text-sm font-medium text-white/90">{c.plate}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {c.connector}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/dashboard/cars/${c.id}/edit`} className={appSecondaryCtaSmClass}>
                    Редагувати
                  </Link>
                  <DangerButton type="button" className="!text-xs !py-2" onClick={() => removeCar(c.id)}>
                    Видалити
                  </DangerButton>
                </div>
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
