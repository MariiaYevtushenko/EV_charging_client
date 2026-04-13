import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appInputCompactClass } from '../../components/station-admin/formStyles';
import { ApiError } from '../../api/http';
import { fetchForecastBias, saveForecastBias } from '../../api/forecastBias';
import {
  fetchTariffsList,
  fetchTariffsToday,
  postTariffsSyncMissing,
  putTariffsToday,
  type TariffListItemDto,
} from '../../api/tariffsAdmin';
import AdminListPagination from '../../components/admin/AdminListPagination';

const TARIFF_LIST_PAGE_SIZE = 20;

type Tab = 'tariffs' | 'bias';

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

/** У БД та в UI — грн/кВт·год (seed з API в € конвертує на сервері). */
function formatUahPerKwh(uah: number | null | undefined): string {
  if (uah == null || !Number.isFinite(uah)) return '—';
  return `${uah.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
}

/** Один рядок на календарну дату: денний і нічний тариф. */
function groupTariffsByDate(rows: TariffListItemDto[]) {
  const byDate = new Map<string, { day: number | null; night: number | null }>();
  for (const r of rows) {
    let e = byDate.get(r.effectiveDate);
    if (!e) {
      e = { day: null, night: null };
      byDate.set(r.effectiveDate, e);
    }
    if (r.tariffType === 'DAY') e.day = r.pricePerKwh;
    if (r.tariffType === 'NIGHT') e.night = r.pricePerKwh;
  }
  return [...byDate.entries()]
    .map(([effectiveDate, v]) => ({
      effectiveDate,
      dayPrice: v.day,
      nightPrice: v.night,
    }))
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
}

function ForecastBiasCard() {
  const [dayBias, setDayBias] = useState('');
  const [nightBias, setNightBias] = useState('');
  const [draftDay, setDraftDay] = useState('');
  const [draftNight, setDraftNight] = useState('');
  const [editing, setEditing] = useState(false);
  const [updatedDay, setUpdatedDay] = useState<string | null>(null);
  const [updatedNight, setUpdatedNight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    setEditing(false);
    void fetchForecastBias()
      .then((data) => {
        setDayBias(String(data.day));
        setNightBias(String(data.night));
        setDraftDay(String(data.day));
        setDraftNight(String(data.night));
        setUpdatedDay(data.updatedAtDay);
        setUpdatedNight(data.updatedAtNight);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити bias');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) {
      setDraftDay(dayBias);
      setDraftNight(nightBias);
    }
  }, [dayBias, nightBias, editing]);

  const startEdit = () => {
    setDraftDay(dayBias);
    setDraftNight(nightBias);
    setEditing(true);
    setError(null);
    setSavedOk(false);
  };

  const cancelEdit = () => {
    setDraftDay(dayBias);
    setDraftNight(nightBias);
    setEditing(false);
    setError(null);
  };

  const handleSave = () => {
    const d = parseFloat(draftDay.replace(',', '.'));
    const n = parseFloat(draftNight.replace(',', '.'));
    if (!Number.isFinite(d) || !Number.isFinite(n)) {
      setError('Введіть числа для денного та нічного зміщення');
      return;
    }
    setSaving(true);
    setError(null);
    setSavedOk(false);
    void saveForecastBias({ day: d, night: n })
      .then((data) => {
        setDayBias(String(data.day));
        setNightBias(String(data.night));
        setDraftDay(String(data.day));
        setDraftNight(String(data.night));
        setUpdatedDay(data.updatedAtDay);
        setUpdatedNight(data.updatedAtNight);
        setSavedOk(true);
        setEditing(false);
        window.setTimeout(() => setSavedOk(false), 2500);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : 'Збереження не вдалося');
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = `mt-1 ${appInputCompactClass}`;

  return (
    <AppCard className="space-y-4 border border-violet-100 bg-violet-50/40">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Корекція прогнозу</h2>
        {!editing && !loading ? (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-violet-100/80 hover:text-gray-900"
            aria-label="Редагувати корекцію прогнозу"
            title="Редагувати"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Завантаження…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor={editing ? 'fb-day' : undefined}>
              Денний
            </label>
            {editing ? (
              <input
                id="fb-day"
                value={draftDay}
                onChange={(e) => setDraftDay(e.target.value)}
                className={fieldClass}
                inputMode="decimal"
                disabled={saving}
              />
            ) : (
              <p className="mt-2 text-lg font-semibold tabular-nums text-gray-900">{dayBias}</p>
            )}
            {updatedDay ? (
              <p className="mt-1 text-xs text-gray-500">Оновлено: {new Date(updatedDay).toLocaleString('uk-UA')}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor={editing ? 'fb-night' : undefined}>
              Нічний
            </label>
            {editing ? (
              <input
                id="fb-night"
                value={draftNight}
                onChange={(e) => setDraftNight(e.target.value)}
                className={fieldClass}
                inputMode="decimal"
                disabled={saving}
              />
            ) : (
              <p className="mt-2 text-lg font-semibold tabular-nums text-gray-900">{nightBias}</p>
            )}
            {updatedNight ? (
              <p className="mt-1 text-xs text-gray-500">Оновлено: {new Date(updatedNight).toLocaleString('uk-UA')}</p>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {savedOk ? <p className="text-sm text-emerald-700">Збережено в базі.</p> : null}

      <div className="flex flex-wrap gap-2 border-t border-violet-100 pt-4">
        {editing ? (
          <>
            <PrimaryButton type="button" disabled={loading || saving} onClick={handleSave}>
              {saving ? 'Збереження…' : 'Зберегти bias'}
            </PrimaryButton>
            <OutlineButton type="button" disabled={loading || saving} onClick={cancelEdit}>
              Скасувати
            </OutlineButton>
          </>
        ) : (
          <OutlineButton type="button" disabled={loading || saving} onClick={load}>
            Оновити з сервера
          </OutlineButton>
        )}
      </div>
    </AppCard>
  );
}

function TodayTariffEditor({
  dayPrice,
  nightPrice,
  onSave,
  saving,
  loading,
}: {
  dayPrice: string;
  nightPrice: string;
  onSave: (dayUah: string, nightUah: string) => Promise<boolean>;
  saving: boolean;
  loading: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDay, setDraftDay] = useState('');
  const [draftNight, setDraftNight] = useState('');

  useEffect(() => {
    if (!editing) {
      setDraftDay(dayPrice);
      setDraftNight(nightPrice);
    }
  }, [dayPrice, nightPrice, editing]);

  const fieldClass = `mt-1 ${appInputCompactClass}`;

  const startEdit = () => {
    setDraftDay(dayPrice);
    setDraftNight(nightPrice);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftDay(dayPrice);
    setDraftNight(nightPrice);
    setEditing(false);
  };

  const submit = async () => {
    const ok = await onSave(draftDay, draftNight);
    if (ok) setEditing(false);
  };

  const canEdit = !loading;

  return (
    <AppCard className="space-y-4 border border-amber-100 bg-amber-50/50">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Тариф на сьогодні</h2>
        {!editing ? (
          <button
            type="button"
            disabled={!canEdit}
            onClick={startEdit}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-100/80 hover:text-gray-900 disabled:opacity-40"
            aria-label="Редагувати тариф"
            title="Редагувати"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Денний період <span className="font-normal normal-case text-gray-500">· грн/кВт·год</span>
          </p>
          {editing ? (
            <input
              value={draftDay}
              onChange={(e) => setDraftDay(e.target.value)}
              className={fieldClass}
              inputMode="decimal"
              disabled={loading || saving}
            />
          ) : (
            <p className="mt-2 text-lg font-semibold tabular-nums text-gray-900">
              {formatUahPerKwh(parseFloat(dayPrice.replace(',', '.')))}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-600 p-4 text-white shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">
            Нічний період <span className="font-normal normal-case text-sky-200/90">· грн/кВт·год</span>
          </p>
          {editing ? (
            <input
              value={draftNight}
              onChange={(e) => setDraftNight(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sky-400/50 bg-sky-500/40 px-3 py-2 text-sm text-white outline-none placeholder:text-sky-200 focus:ring-2 focus:ring-white/30"
              inputMode="decimal"
              disabled={loading || saving}
            />
          ) : (
            <p className="mt-2 text-lg font-semibold tabular-nums text-sky-50">
              {formatUahPerKwh(parseFloat(nightPrice.replace(',', '.')))}
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-wrap gap-2 border-t border-amber-100/80 pt-4">
          <PrimaryButton type="button" disabled={loading || saving} onClick={() => void submit()}>
            {saving ? 'Збереження…' : 'Зберегти'}
          </PrimaryButton>
          <OutlineButton type="button" disabled={loading || saving} onClick={cancelEdit}>
            Скасувати
          </OutlineButton>
        </div>
      ) : null}
    </AppCard>
  );
}

export default function GlobalTariffsPage() {
  const [tab, setTab] = useState<Tab>('tariffs');
  const [rows, setRows] = useState<TariffListItemDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [todayDate, setTodayDate] = useState('');
  const [dayPrice, setDayPrice] = useState('');
  const [nightPrice, setNightPrice] = useState('');
  const [todayLoading, setTodayLoading] = useState(true);
  const [todaySaving, setTodaySaving] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [todayOk, setTodayOk] = useState(false);
  const [gapSyncMessage, setGapSyncMessage] = useState<string | null>(null);
  const [syncGapError, setSyncGapError] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);

  const loadList = useCallback(() => {
    setListLoading(true);
    setListError(null);
    void fetchTariffsList()
      .then(setRows)
      .catch((e: unknown) => {
        setListError(e instanceof ApiError ? e.message : 'Не вдалося завантажити тарифи');
        setRows([]);
      })
      .finally(() => setListLoading(false));
  }, []);

  const loadToday = useCallback(() => {
    setTodayLoading(true);
    setTodayError(null);
    void fetchTariffsToday()
      .then((t) => {
        setTodayDate(t.date);
        setDayPrice(String(t.dayPrice));
        setNightPrice(String(t.nightPrice));
      })
      .catch((e: unknown) => {
        setTodayError(e instanceof ApiError ? e.message : 'Не вдалося завантажити тариф на сьогодні');
      })
      .finally(() => setTodayLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGapSyncMessage(null);
    setSyncGapError(null);
    void (async () => {
      try {
        const sync = await postTariffsSyncMissing();
        if (cancelled) return;
        if (sync.filledDays > 0) {
          setGapSyncMessage(
            sync.bootstrappedTodayOnly
              ? 'У базі не було тарифів — з API додано денну та нічну ціну на сьогодні.'
              : `Заповнено пропуск між останнім записом і сьогодні: ${sync.dates.join(', ')}.`
          );
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setSyncGapError(
            e instanceof ApiError ? e.message : 'Не вдалося доповнити пропущені дні тарифу'
          );
        }
      }
      if (cancelled) return;
      loadList();
      if (cancelled) return;
      loadToday();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList, loadToday]);

  const groupedRows = useMemo(() => groupTariffsByDate(rows), [rows]);

  const pagedRows = useMemo(() => {
    const start = (listPage - 1) * TARIFF_LIST_PAGE_SIZE;
    return groupedRows.slice(start, start + TARIFF_LIST_PAGE_SIZE);
  }, [groupedRows, listPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(groupedRows.length / TARIFF_LIST_PAGE_SIZE));
    setListPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [groupedRows.length]);

  const saveTodayWithValues = useCallback(
    async (dayUahStr: string, nightUahStr: string): Promise<boolean> => {
      const d = parseFloat(dayUahStr.replace(',', '.'));
      const n = parseFloat(nightUahStr.replace(',', '.'));
      if (!Number.isFinite(d) || !Number.isFinite(n)) {
        setTodayError('Введіть коректні числа для денного та нічного тарифу (грн)');
        return false;
      }
      if (d < 0 || n < 0) {
        setTodayError('Ціни не можуть бути від’ємними');
        return false;
      }
      setTodaySaving(true);
      setTodayError(null);
      setTodayOk(false);
      try {
        const t = await putTariffsToday({ dayPrice: d, nightPrice: n });
        setTodayDate(t.date);
        setDayPrice(String(t.dayPrice));
        setNightPrice(String(t.nightPrice));
        setTodayOk(true);
        window.setTimeout(() => setTodayOk(false), 2500);
        loadList();
        return true;
      } catch (e: unknown) {
        setTodayError(e instanceof ApiError ? e.message : 'Збереження не вдалося');
        return false;
      } finally {
        setTodaySaving(false);
      }
    },
    [loadList]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Тарифи та прогноз</h1>
        
      </div>

      <nav
        className="-mx-1 flex gap-6 overflow-x-auto border-b border-gray-200 px-1"
        aria-label="Розділи тарифів"
      >
        <button type="button" className={tabClass(tab === 'tariffs')} onClick={() => setTab('tariffs')}>
            Тарифи
        </button>
        <button type="button" className={tabClass(tab === 'bias')} onClick={() => setTab('bias')}>
          Прогноз цін
        </button>
      </nav>

      {tab === 'tariffs' ? (
        <div className="space-y-6">
          {todayError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {todayError}
            </p>
          ) : null}
          {syncGapError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{syncGapError}</p>
          ) : null}
          {gapSyncMessage ? (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{gapSyncMessage}</p>
          ) : null}
          {todayOk ? <p className="text-sm text-emerald-700">Тариф на сьогодні збережено в базі.</p> : null}

          <TodayTariffEditor
            dayPrice={dayPrice}
            nightPrice={nightPrice}
            onSave={saveTodayWithValues}
            saving={todaySaving}
            loading={todayLoading}
          />

          <AppCard padding={false} className="overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Архів тарифів</h2>
            
            </div>

            {listError ? (
              <p className="px-5 py-4 text-sm text-red-600">{listError}</p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Дата</th>
                    <th className="px-5 py-3 text-right">День (грн)</th>
                    <th className="px-5 py-3 text-right">Ніч (грн)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listLoading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-gray-500">
                        Завантаження…
                      </td>
                    </tr>
                  ) : null}
                  {pagedRows.map((r) => {
                    const isToday = todayDate && r.effectiveDate === todayDate;
                    return (
                      <tr
                        key={r.effectiveDate}
                        className={
                          isToday ? 'bg-emerald-50/80 hover:bg-emerald-50' : 'bg-white hover:bg-gray-50/80'
                        }
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-gray-800">{r.effectiveDate}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-900">
                          {formatUahPerKwh(r.dayPrice)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-900">
                          {formatUahPerKwh(r.nightPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {groupedRows.length > 0 ? (
              <div className="border-t border-gray-100 px-5 py-4">
                <AdminListPagination
                  page={listPage}
                  pageSize={TARIFF_LIST_PAGE_SIZE}
                  total={groupedRows.length}
                  onPageChange={setListPage}
                />
              </div>
            ) : null}
            {!listLoading && rows.length === 0 && !listError ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">У базі ще немає рядків тарифу.</p>
            ) : null}
          </AppCard>
        </div>
      ) : (
        <ForecastBiasCard />
      )}
    </div>
  );
}
