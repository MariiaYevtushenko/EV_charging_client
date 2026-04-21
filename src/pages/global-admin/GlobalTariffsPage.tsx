import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appInputCompactClass } from '../../components/station-admin/formStyles';
import { userFacingApiErrorMessage } from '../../api/http';
import { fetchForecastBias, saveForecastBias } from '../../api/forecastBias';
import {
  fetchTariffsList,
  fetchTariffsToday,
  postTariffsSyncMissing,
  postTariffsTodayRefresh,
  putTariffsToday,
  type TariffListItemDto,
} from '../../api/tariffsAdmin';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import {
  globalAdminPageTitle,
  globalAdminUnderlineTabActive,
  globalAdminUnderlineTabIdle,
} from '../../styles/globalAdminTheme';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';

const TARIFF_LIST_PAGE_SIZE = 20;

type Tab = 'tariffs' | 'bias';

const tabClass = (active: boolean) =>
  active ? globalAdminUnderlineTabActive : globalAdminUnderlineTabIdle;

/** У БД та в UI — грн/кВт·год (seed з API в € конвертує на сервері). */
function formatUahPerKwh(uah: number | null | undefined): string {
  if (uah == null || !Number.isFinite(uah)) return '—';
  return `${uah.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
}

/** Парсить грн/кВт·год з поля вводу (кома або крапка). */
function parseUahPerKwhInput(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (trimmed === '') {
    return { ok: false, message: 'Введіть ціну' };
  }
  const v = Number(trimmed);
  if (!Number.isFinite(v)) {
    return { ok: false, message: 'Некоректне число' };
  }
  if (v < 0) {
    return { ok: false, message: 'Ціна не може бути від’ємною' };
  }
  if (v > 1_000_000) {
    return { ok: false, message: 'Значення занадто велике' };
  }
  return { ok: true, value: v };
}

/** Дата календарного дня тарифу (YYYY-MM-DD) — день, місяць повністю, рік (як у списку сесій, без часу). */
function formatTariffCalendarDate(isoDate: string): string {
  const parts = isoDate.trim().split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const mo = Number(parts[1]);
    const day = Number(parts[2]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(day)) {
      return new Date(y, mo - 1, day).toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  try {
    const d = new Date(isoDate);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    /* fallthrough */
  }
  return isoDate;
}

type TariffGroupedRow = {
  effectiveDate: string;
  dayPrice: number | null;
  nightPrice: number | null;
};

type TariffSortKey = 'effectiveDate' | 'dayPrice' | 'nightPrice';

function cmpTariffRows(a: TariffGroupedRow, b: TariffGroupedRow, sortKey: TariffSortKey, sortDir: SortDir): number {
  let c = 0;
  switch (sortKey) {
    case 'effectiveDate':
      c = a.effectiveDate.localeCompare(b.effectiveDate);
      break;
    case 'dayPrice':
      c = (a.dayPrice ?? -Infinity) - (b.dayPrice ?? -Infinity);
      break;
    case 'nightPrice':
      c = (a.nightPrice ?? -Infinity) - (b.nightPrice ?? -Infinity);
      break;
    default:
      c = a.effectiveDate.localeCompare(b.effectiveDate);
  }
  return sortDir === 'desc' ? -c : c;
}

/** Один рядок на календарну дату: денний і нічний тариф. */
function groupTariffsByDate(rows: TariffListItemDto[]): TariffGroupedRow[] {
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
  return [...byDate.entries()].map(([effectiveDate, v]) => ({
    effectiveDate,
    dayPrice: v.day,
    nightPrice: v.night,
  }));
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
        setError(userFacingApiErrorMessage(e, 'Не вдалося завантажити корекцію прогнозу'));
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
        setError(userFacingApiErrorMessage(e, 'Збереження не вдалося'));
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = `mt-1 ${appInputCompactClass}`;

  return (
    <AppCard className="space-y-4 border border-violet-100/90 bg-gradient-to-br from-violet-50/80 via-white to-slate-50/30 shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Корекція прогнозу</h2>
          {!editing && !loading ? (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-violet-100/80 hover:text-slate-900"
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
        <p className={`mt-2 text-sm leading-relaxed text-gray-600 ${loading ? 'hidden' : ''}`}>
          Коефіцієнти зміщення для зовнішнього прогнозу цін (окремо для денного та нічного інтервалу).
        </p>
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
              <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{dayBias}</p>
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
              <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{nightBias}</p>
            )}
            {updatedNight ? (
              <p className="mt-1 text-xs text-gray-500">Оновлено: {new Date(updatedNight).toLocaleString('uk-UA')}</p>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {savedOk ? (
        <p className="rounded-xl border border-green-200 bg-green-50/90 px-4 py-3 text-sm text-green-900">
          Збережено в базі.
        </p>
      ) : null}

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

function TodayTariffEditIconButton({
  disabled,
  onClick,
  ariaLabel,
  hoverBgClass,
}: {
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  hoverBgClass: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 ${hoverBgClass}`}
      aria-label={ariaLabel}
      title={ariaLabel}
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
  );
}

function TodayTariffRefreshIconButton({
  disabled,
  loading,
  onClick,
  ariaLabel,
  hoverBgClass,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  ariaLabel: string;
  hoverBgClass: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 ${loading ? 'disabled:!opacity-100' : ''} ${hoverBgClass}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`h-5 w-5 ${loading ? 'motion-safe:animate-spin' : ''}`}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7m0 0L19 7.5m-3.181-3.183a8.25 8.25 0 0 0-13.803 3.7m0 0L5 7.5"
        />
      </svg>
    </button>
  );
}

function TodayTariffEditor({
  dayPrice,
  nightPrice,
  onSave,
  onRefreshDay,
  onRefreshNight,
  saving,
  loading,
  refreshingPeriod,
}: {
  dayPrice: string;
  nightPrice: string;
  onSave: (dayUah: string, nightUah: string) => Promise<boolean>;
  onRefreshDay: () => void;
  onRefreshNight: () => void;
  saving: boolean;
  loading: boolean;
  /** Який період зараз оновлюється з API (null — ніхто). */
  refreshingPeriod: null | 'day' | 'night';
}) {
  const [editingDay, setEditingDay] = useState(false);
  const [editingNight, setEditingNight] = useState(false);
  const [draftDay, setDraftDay] = useState('');
  const [draftNight, setDraftNight] = useState('');
  const [dayFieldError, setDayFieldError] = useState<string | null>(null);
  const [nightFieldError, setNightFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingDay) setDraftDay(dayPrice);
  }, [dayPrice, editingDay]);

  useEffect(() => {
    if (!editingNight) setDraftNight(nightPrice);
  }, [nightPrice, editingNight]);

  const fieldClass = (invalid: boolean) =>
    `mt-1 ${appInputCompactClass} ${invalid ? 'border-red-400 ring-1 ring-red-200' : ''}`;

  const companionNightStr = editingNight ? draftNight : nightPrice;
  const companionDayStr = editingDay ? draftDay : dayPrice;

  const startEditDay = () => {
    setDraftDay(dayPrice);
    setDayFieldError(null);
    setEditingDay(true);
  };

  const startEditNight = () => {
    setDraftNight(nightPrice);
    setNightFieldError(null);
    setEditingNight(true);
  };

  const cancelEditDay = () => {
    setDraftDay(dayPrice);
    setDayFieldError(null);
    setEditingDay(false);
  };

  const cancelEditNight = () => {
    setDraftNight(nightPrice);
    setNightFieldError(null);
    setEditingNight(false);
  };

  const saveDay = async () => {
    setDayFieldError(null);
    setNightFieldError(null);
    const d = parseUahPerKwhInput(draftDay);
    if (!d.ok) {
      setDayFieldError(d.message);
      return;
    }
    const n = parseUahPerKwhInput(companionNightStr);
    if (!n.ok) {
      setNightFieldError(n.message);
      return;
    }
    const ok = await onSave(String(d.value), String(n.value));
    if (ok) setEditingDay(false);
  };

  const saveNight = async () => {
    setDayFieldError(null);
    setNightFieldError(null);
    const n = parseUahPerKwhInput(draftNight);
    if (!n.ok) {
      setNightFieldError(n.message);
      return;
    }
    const d = parseUahPerKwhInput(companionDayStr);
    if (!d.ok) {
      setDayFieldError(d.message);
      return;
    }
    const ok = await onSave(String(d.value), String(n.value));
    if (ok) setEditingNight(false);
  };

  const refreshing = refreshingPeriod != null;
  const canEdit = !loading && !refreshing;
  const dayDisplay = parseUahPerKwhInput(dayPrice);
  const nightDisplay = parseUahPerKwhInput(nightPrice);

  return (
    <div className="space-y-3">
      <h2 className="sr-only">Тариф на сьогодні</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
        <div
          className={`rounded-xl border p-4 shadow-sm transition-colors ${
            editingDay
              ? 'border-amber-300/80 bg-gradient-to-br from-amber-50 via-amber-50/95 to-amber-100/40 ring-1 ring-amber-200/40'
              : 'border-amber-200/90 bg-amber-50/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900/90">
              Денний період <span className="font-normal normal-case text-gray-500">· грн/кВт·год</span>
            </p>
            {!editingDay ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <TodayTariffRefreshIconButton
                  disabled={!canEdit || saving}
                  loading={refreshingPeriod === 'day'}
                  onClick={onRefreshDay}
                  ariaLabel="Оновити денний тариф з API"
                  hoverBgClass="hover:bg-amber-100/80"
                />
                <TodayTariffEditIconButton
                  disabled={!canEdit}
                  onClick={startEditDay}
                  ariaLabel="Редагувати денний тариф"
                  hoverBgClass="hover:bg-amber-100/80"
                />
              </div>
            ) : null}
          </div>
          {editingDay ? (
            <>
              <input
                value={draftDay}
                onChange={(e) => {
                  setDraftDay(e.target.value);
                  if (dayFieldError) setDayFieldError(null);
                }}
                className={fieldClass(!!dayFieldError)}
                inputMode="decimal"
                disabled={loading || saving || refreshing}
                aria-invalid={!!dayFieldError}
                aria-describedby={dayFieldError ? 'today-tariff-day-err' : undefined}
              />
              {dayFieldError ? (
                <p id="today-tariff-day-err" className="mt-1 text-xs text-red-600" role="alert">
                  {dayFieldError}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <PrimaryButton
                  type="button"
                  disabled={loading || saving || refreshing}
                  onClick={() => void saveDay()}
                  className="!bg-amber-700 hover:!bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-500/80"
                >
                  {saving ? 'Збереження…' : 'Зберегти'}
                </PrimaryButton>
                <OutlineButton
                  type="button"
                  disabled={loading || saving || refreshing}
                  onClick={cancelEditDay}
                  className="border-amber-300/80 bg-amber-50/90 text-amber-950 hover:border-amber-400 hover:bg-amber-100/90"
                >
                  Скасувати
                </OutlineButton>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
              {dayDisplay.ok ? formatUahPerKwh(dayDisplay.value) : '—'}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm transition-colors ${
            editingNight
              ? 'border-sky-300/80 bg-gradient-to-br from-sky-50 via-sky-50/95 to-sky-100/40 ring-1 ring-sky-200/40'
              : 'border-sky-200/90 bg-sky-50/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-sky-900">
              Нічний період <span className="font-normal normal-case text-gray-500">· грн/кВт·год</span>
            </p>
            {!editingNight ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <TodayTariffRefreshIconButton
                  disabled={!canEdit || saving}
                  loading={refreshingPeriod === 'night'}
                  onClick={onRefreshNight}
                  ariaLabel="Оновити нічний тариф з API"
                  hoverBgClass="hover:bg-sky-100/80"
                />
                <TodayTariffEditIconButton
                  disabled={!canEdit}
                  onClick={startEditNight}
                  ariaLabel="Редагувати нічний тариф"
                  hoverBgClass="hover:bg-sky-100/80"
                />
              </div>
            ) : null}
          </div>
          {editingNight ? (
            <>
              <input
                value={draftNight}
                onChange={(e) => {
                  setDraftNight(e.target.value);
                  if (nightFieldError) setNightFieldError(null);
                }}
                className={fieldClass(!!nightFieldError)}
                inputMode="decimal"
                disabled={loading || saving || refreshing}
                aria-invalid={!!nightFieldError}
                aria-describedby={nightFieldError ? 'today-tariff-night-err' : undefined}
              />
              {nightFieldError ? (
                <p id="today-tariff-night-err" className="mt-1 text-xs text-red-600" role="alert">
                  {nightFieldError}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <PrimaryButton
                  type="button"
                  disabled={loading || saving || refreshing}
                  onClick={() => void saveNight()}
                  className="!bg-sky-700 hover:!bg-sky-800 focus-visible:ring-2 focus-visible:ring-sky-500/80"
                >
                  {saving ? 'Збереження…' : 'Зберегти'}
                </PrimaryButton>
                <OutlineButton
                  type="button"
                  disabled={loading || saving || refreshing}
                  onClick={cancelEditNight}
                  className="border-sky-300/80 bg-sky-50/90 text-sky-950 hover:border-sky-400 hover:bg-sky-100/90"
                >
                  Скасувати
                </OutlineButton>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
              {nightDisplay.ok ? formatUahPerKwh(nightDisplay.value) : '—'}
            </p>
          )}
        </div>
      </div>
    </div>
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
  const [todayRefreshingPeriod, setTodayRefreshingPeriod] = useState<null | 'day' | 'night'>(null);
  const [todayRefreshToast, setTodayRefreshToast] = useState<null | 'day' | 'night'>(null);
  const [syncGapError, setSyncGapError] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [tariffSortKey, setTariffSortKey] = useState<TariffSortKey>('effectiveDate');
  const [tariffSortDir, setTariffSortDir] = useState<SortDir>('desc');

  const onTariffSort = useCallback(
    (key: string) => {
      const k = key as TariffSortKey;
      if (tariffSortKey === k) {
        setTariffSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setTariffSortKey(k);
        setTariffSortDir(defaultDirForSortColumn(k));
      }
    },
    [tariffSortKey]
  );

  const loadList = useCallback(() => {
    setListLoading(true);
    setListError(null);
    void fetchTariffsList()
      .then(setRows)
      .catch((e: unknown) => {
        setListError(userFacingApiErrorMessage(e, 'Не вдалося завантажити тарифи'));
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
        setTodayError(userFacingApiErrorMessage(e, 'Не вдалося завантажити тариф на сьогодні'));
      })
      .finally(() => setTodayLoading(false));
  }, []);

  const refreshTodayPeriodFromApi = useCallback((period: 'day' | 'night') => {
    setTodayRefreshingPeriod(period);
    setTodayError(null);
    void postTariffsTodayRefresh(period)
      .then((t) => {
        setTodayDate(t.date);
        setDayPrice(String(t.dayPrice));
        setNightPrice(String(t.nightPrice));
        setTodayRefreshToast(period);
        window.setTimeout(() => setTodayRefreshToast(null), 5000);
        loadList();
      })
      .catch((e: unknown) => {
        setTodayError(
          userFacingApiErrorMessage(e, 'Не вдалося оновити тариф з зовнішнього API', {
            serverError:
              'Не вдалося отримати ціну з зовнішнього джерела. Спробуйте пізніше або введіть тариф вручну.',
          })
        );
      })
      .finally(() => setTodayRefreshingPeriod(null));
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    setSyncGapError(null);
    void (async () => {
      try {
        await postTariffsSyncMissing();
      } catch (e: unknown) {
        if (!cancelled) {
          setSyncGapError(
            userFacingApiErrorMessage(e, 'Не вдалося доповнити пропущені дні тарифу', {
              serverError:
                'Не вдалося автоматично завантажити відсутні дні тарифу з зовнішнього джерела. Спробуйте пізніше або додайте ціни вручну.',
            })
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

  const groupedRows = useMemo(() => {
    const g = groupTariffsByDate(rows);
    return [...g].sort((a, b) => cmpTariffRows(a, b, tariffSortKey, tariffSortDir));
  }, [rows, tariffSortKey, tariffSortDir]);

  const pagedRows = useMemo(() => {
    const start = (listPage - 1) * TARIFF_LIST_PAGE_SIZE;
    return groupedRows.slice(start, start + TARIFF_LIST_PAGE_SIZE);
  }, [groupedRows, listPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(groupedRows.length / TARIFF_LIST_PAGE_SIZE));
    setListPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [groupedRows.length]);

  useEffect(() => {
    setListPage(1);
  }, [tariffSortKey, tariffSortDir]);

  const saveTodayWithValues = useCallback(
    async (dayUahStr: string, nightUahStr: string): Promise<boolean> => {
      const d = parseUahPerKwhInput(dayUahStr);
      const n = parseUahPerKwhInput(nightUahStr);
      if (!d.ok) {
        setTodayError(`Денний тариф: ${d.message}`);
        return false;
      }
      if (!n.ok) {
        setTodayError(`Нічний тариф: ${n.message}`);
        return false;
      }
      setTodaySaving(true);
      setTodayError(null);
      setTodayOk(false);
      try {
        const t = await putTariffsToday({ dayPrice: d.value, nightPrice: n.value });
        setTodayDate(t.date);
        setDayPrice(String(t.dayPrice));
        setNightPrice(String(t.nightPrice));
        setTodayOk(true);
        window.setTimeout(() => setTodayOk(false), 5000);
        loadList();
        return true;
      } catch (e: unknown) {
        setTodayError(userFacingApiErrorMessage(e, 'Збереження не вдалося'));
        return false;
      } finally {
        setTodaySaving(false);
      }
    },
    [loadList]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className={globalAdminPageTitle}>Тарифи</h1>
       
      </div>

      <nav
        className="-mx-1 flex min-w-0 gap-8 overflow-x-auto border-b border-gray-200 px-1"
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
        <div className="space-y-5">
          {todayError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {todayError}
            </p>
          ) : null}
          {syncGapError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{syncGapError}</p>
          ) : null}

          <TodayTariffEditor
            dayPrice={dayPrice}
            nightPrice={nightPrice}
            onSave={saveTodayWithValues}
            onRefreshDay={() => refreshTodayPeriodFromApi('day')}
            onRefreshNight={() => refreshTodayPeriodFromApi('night')}
            saving={todaySaving}
            loading={todayLoading}
            refreshingPeriod={todayRefreshingPeriod}
          />

          <AppCard padding={false} className="overflow-hidden shadow-sm">
           
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <SortableTableTh
                      label="Дата"
                      columnKey="effectiveDate"
                      activeKey={tariffSortKey}
                      dir={tariffSortDir}
                      onSort={onTariffSort}
                      thClassName="px-5 py-3"
                    />
                    <SortableTableTh
                      label="День (грн)"
                      columnKey="dayPrice"
                      activeKey={tariffSortKey}
                      dir={tariffSortDir}
                      onSort={onTariffSort}
                      align="right"
                      thClassName="px-5 py-3"
                    />
                    <SortableTableTh
                      label="Ніч (грн)"
                      columnKey="nightPrice"
                      activeKey={tariffSortKey}
                      dir={tariffSortDir}
                      onSort={onTariffSort}
                      align="right"
                      thClassName="px-5 py-3"
                    />
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
                          isToday ? 'bg-green-50/80 hover:bg-green-50' : 'bg-white hover:bg-gray-50/80'
                        }
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-gray-800">
                          {formatTariffCalendarDate(r.effectiveDate)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-900">
                          {formatUahPerKwh(r.dayPrice)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-900">
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
              <p className="px-5 py-8 text-center text-sm text-gray-500">Тарифи відсутні</p>
            ) : null}
          </AppCard>
        </div>
      ) : (
        <ForecastBiasCard />
      )}

      <FloatingToastRegion>
        <FloatingToast show={todayOk} tone="success">
          Тариф на сьогодні збережено
        </FloatingToast>
        <FloatingToast show={todayRefreshToast != null} tone="success">
          {todayRefreshToast === 'day'
            ? 'Денну ціну на тарифи оновлено та збережено'
            : todayRefreshToast === 'night'
              ? 'Нічну ціну на тарифи оновлено та збережено'
              : ''}
        </FloatingToast>
      </FloatingToastRegion>
    </div>
  );
}
