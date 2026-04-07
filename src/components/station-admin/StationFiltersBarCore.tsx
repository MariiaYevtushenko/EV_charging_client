import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { OutlineButton } from "./Primitives";
import { appPrimaryCtaMdClass, appSelectFilterClass } from "./formStyles";
import { STATION_SORT_OPTIONS } from "../../features/station-list/stationSortOptions";

export type StationFiltersBarCoreProps = {
  uniqueCities: string[];
  selectedCities: string[];
  toggleCity: (city: string) => void;
  clearSelectedCities: () => void;
  sortValue: string;
  setSortValue: (v: string) => void;
  showAddButton?: boolean;
  drawerExtra?: ReactNode;
};

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function StationFiltersBarCore({
  uniqueCities,
  selectedCities,
  toggleCity,
  clearSelectedCities,
  sortValue,
  setSortValue,
  showAddButton = false,
  drawerExtra,
}: StationFiltersBarCoreProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="rounded-2xl border border-emerald-100/90 bg-white/95 px-3 py-2.5 shadow-sm shadow-emerald-900/5 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          {showAddButton ? (
            <Link
              to="/station-dashboard/stations/new"
              className={`order-2 w-full whitespace-nowrap sm:order-1 sm:w-auto ${appPrimaryCtaMdClass}`}
            >
              + Нова станція
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative order-1 inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-emerald-100/90 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm shadow-emerald-900/5 transition hover:border-emerald-300 hover:bg-emerald-50/90 hover:text-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 sm:order-2 sm:w-auto"
            title="Фільтр за містом і сортування"
            aria-expanded={open}
            aria-controls={open ? "station-map-city-filter-panel" : undefined}
          >
            <FilterIcon className="h-5 w-5 text-emerald-700/90" />
            <span>Місто та сортування</span>
            {selectedCities.length > 0 ? (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-[11px] font-bold text-white">
                {selectedCities.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="station-map-city-filter-title"
        >
          <button
            type="button"
            className="animate-city-filter-backdrop absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"
            aria-label="Закрити фільтр"
            onClick={() => setOpen(false)}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex max-w-full justify-end">
            <div
              id="station-map-city-filter-panel"
              className="animate-city-filter-panel pointer-events-auto flex h-full w-[min(100%,22rem)] flex-col overflow-hidden rounded-l-3xl border-l-2 border-emerald-200/70 bg-white shadow-[0_25px_50px_-12px_rgba(6,78,59,0.2)] ring-1 ring-emerald-900/5 sm:w-[min(100%,26rem)]"
            >
              <div className="relative shrink-0 border-b border-emerald-100/90 bg-gradient-to-bl from-emerald-50/90 via-white to-white px-5 pb-4 pt-5 sm:px-6">
                <div
                  className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500/90"
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <h2
                      id="station-map-city-filter-title"
                      className="text-lg font-bold tracking-tight text-gray-900"
                    >
                      Фільтр за містом
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      Позначте міста або залиште без вибору — тоді видно всі станції.
                    </p>
                    <div className="mt-4">
                      <label
                        htmlFor="station-map-sort"
                        className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Сортування
                      </label>
                      <select
                        id="station-map-sort"
                        className={`mt-1.5 w-full ${appSelectFilterClass}`}
                        value={sortValue}
                        onChange={(e) => setSortValue(e.target.value)}
                      >
                        {STATION_SORT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-xl border border-emerald-100/90 bg-white/90 p-2 text-gray-500 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-gray-800"
                    aria-label="Закрити"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                {selectedCities.length > 0 ? (
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-green-700 underline decoration-green-600/35 underline-offset-2 transition hover:text-green-800"
                    onClick={() => clearSelectedCities()}
                  >
                    Скинути вибір · показати всі міста
                  </button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                {uniqueCities.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm text-gray-500">
                    Немає міст у списку станцій.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {uniqueCities.map((city) => {
                      const checked = selectedCities.includes(city);
                      return (
                        <li key={city}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                              checked
                                ? "border-green-200 bg-emerald-50/80 text-green-950 shadow-sm shadow-emerald-900/5"
                                : "border-gray-100/90 bg-white text-gray-800 hover:border-emerald-200/80 hover:bg-emerald-50/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCity(city)}
                              className="h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="min-w-0 leading-snug">{city}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="shrink-0 border-t border-emerald-100/90 bg-emerald-50/30 p-4 sm:px-6">
                <OutlineButton type="button" className="w-full" onClick={() => setOpen(false)}>
                  Готово
                </OutlineButton>
              </div>
              {drawerExtra ? (
                <div className="border-t border-emerald-100/90 px-5 py-4 sm:px-6">{drawerExtra}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
