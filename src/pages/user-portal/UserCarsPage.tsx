import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';
import { UserPortalEmptyState } from '../../components/user-portal/UserPortalEmptyState';
import {
  userPortalListPageShell,
  userPortalPageTitle,
  userPortalPrimaryCta,
} from '../../styles/userPortalTheme';
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

export default function UserCarsPage() {
  const navigate = useNavigate();
  const { cars, removeCar } = useUserPortal();
  const [deleteTarget, setDeleteTarget] = useState<UserCar | null>(null);

  const confirmDelete = () => {
    if (deleteTarget) {
      removeCar(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className={`space-y-6 ${userPortalListPageShell}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={userPortalPageTitle}>Мої авто</h1>
          
        </div>
        <Link to="/dashboard/cars/new" className={`${userPortalPrimaryCta} shrink-0 self-start sm:self-auto`}>
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
            Авто зникне зі списку. Потім його можна буде додати знову
          </p>
        }
        confirmLabel="Так, прибрати"
        cancelLabel="Скасувати"
        variant="danger"
      />

      {cars.length === 0 ? (
        <UserPortalEmptyState
          icon={<CarGarageIcon className="h-8 w-8" />}
          title="Поки що порожньо"
          description="Додайте хоча б один електромобіль, щоб бачити його в списку й бронювати зарядку"
          footer={
            <Link to="/dashboard/cars/new" className={userPortalPrimaryCta}>
              Додати перше авто
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((c) => {
            const src = c.imageUrl?.trim() || suggestCarImageByModel(c.model) || DEFAULT_CAR_IMAGE;
            return (
              <li key={c.id}>
                <article
                  role="link"
                  tabIndex={0}
                  aria-label={`Деталі авто ${c.model}`}
                  onClick={() => navigate(`/dashboard/cars/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/dashboard/cars/${c.id}`);
                    }
                  }}
                  className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-950/[0.04] transition hover:shadow-md hover:ring-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
                        onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(c);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 border-t border-slate-100 p-3 sm:p-3.5">
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{c.model}</h2>
                    <p className="font-mono text-xs font-semibold tabular-nums tracking-wide text-slate-600">{c.plate}</p>
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
