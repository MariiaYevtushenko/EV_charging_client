import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { StationSortDir, StationSortKey } from "../../context/StationsContext";
import { OutlineButton } from "./Primitives";
import { appPrimaryCtaClass, appPrimaryCtaMdClass, appSelectClass } from "./formStyles";

export type StationFiltersSortOption = { key: StationSortKey; label: string };

export type StationFiltersBarCoreProps = {
  uniqueCities: string[];
  cityFilter: string;
  setCityFilter: (city: string) => void;
  sortKeyOptions: StationFiltersSortOption[];
  sortKey: StationSortKey;
  setSortKey: (key: StationSortKey) => void;
  sortDir: StationSortDir;
  setSortDir: (dir: StationSortDir) => void;
  toggleSortDir: () => void;
  showAddButton?: boolean;
  drawerExtra?: ReactNode;
};

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
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
  cityFilter,
  setCityFilter,
  sortKeyOptions,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  toggleSortDir,
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

  const resetFilters = () => {
    setCityFilter("");
    const first = sortKeyOptions[0]?.key ?? "name";
    setSortKey(first);
    setSortDir("asc");
  };

  const defaultKey = sortKeyOptions[0]?.key ?? "name";
  const hasNonDefault =
    cityFilter !== "" || sortKey !== defaultKey || sortDir !== "asc";

  const currentSortLabel =
    sortKeyOptions.find((o) => o.key === sortKey)?.label ?? sortKey;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-white/95 px-3 py-2.5 shadow-sm shadow-emerald-900/5 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-gray-500">Поточний вигляд:</span>
          <span className="truncate text-gray-800">
            {cityFilter ? (
              <span className="font-semibold text-green-800">{cityFilter}</span>
            ) : (
              <span className="text-gray-600">усі міста</span>
            )}
            <span className="mx-2 text-gray-300" aria-hidden>
              ·
            </span>
            <span className="text-gray-700">
              {currentSortLabel}{" "}
              <span className="tabular-nums text-gray-500">
                ({sortDir === "asc" ? "зростання ↑" : "спадання ↓"})
              </span>
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showAddButton ? (
            <Link
              to="/station-dashboard/stations/new"
              className={`hidden whitespace-nowrap sm:inline-flex ${appPrimaryCtaMdClass}`}
            >
              + Нова станція
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100/90 bg-white/90 text-gray-700 shadow-sm shadow-emerald-900/5 transition hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            title="Фільтр і сортування"
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <SlidersIcon className="h-5 w-5" />
            <span className="sr-only">Відкрити фільтр і сортування</span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Фільтр і сортування"
        >
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/25 transition"
            aria-label="Закрити"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-emerald-200/80 bg-white shadow-2xl shadow-emerald-900/10">
            <div className="flex items-center justify-between border-b border-emerald-100/80 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Фільтр і сортування</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-gray-500 transition hover:bg-emerald-50 hover:text-gray-800"
                aria-label="Закрити"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="drawer-filter-city"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Місто
                  </label>
                  <select
                    id="drawer-filter-city"
                    className={appSelectClass}
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  >
                    <option value="">Усі міста</option>
                    {uniqueCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="drawer-filter-sort"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Сортувати за
                  </label>
                  <select
                    id="drawer-filter-sort"
                    className={appSelectClass}
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as StationSortKey)}
                  >
                    {sortKeyOptions.map(({ key, label }) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Напрямок
                  </p>
                  <OutlineButton type="button" className="w-full" onClick={toggleSortDir}>
                    {sortDir === "asc"
                      ? "↑ Зростання (A→Z, менше→більше)"
                      : "↓ Спадання (Z→A, більше→менше)"}
                  </OutlineButton>
                </div>
                {hasNonDefault ? (
                  <OutlineButton type="button" className="w-full" onClick={resetFilters}>
                    Скинути фільтр і сортування
                  </OutlineButton>
                ) : null}
                {drawerExtra ? (
                  <div className="border-t border-emerald-100/80 pt-6">{drawerExtra}</div>
                ) : null}
              </div>
            </div>
            <div className="border-t border-emerald-100/80 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                {showAddButton ? (
                  <Link
                    to="/station-dashboard/stations/new"
                    onClick={() => setOpen(false)}
                    className={`inline-flex flex-1 ${appPrimaryCtaClass}`}
                  >
                    + Нова станція
                  </Link>
                ) : null}
                <OutlineButton type="button" className="w-full sm:flex-1" onClick={() => setOpen(false)}>
                  Готово
                </OutlineButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
