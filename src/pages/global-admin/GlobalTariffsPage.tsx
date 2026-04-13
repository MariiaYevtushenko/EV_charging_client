import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appInputCompactClass } from '../../components/station-admin/formStyles';
import { ApiError } from '../../api/http';
import { fetchForecastBias, saveForecastBias } from '../../api/forecastBias';
import {
  fetchTariffsList,
  fetchTariffsToday,
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

function formatKwhPrice(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [updatedDay, setUpdatedDay] = useState<string | null>(null);
  const [updatedNight, setUpdatedNight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    void fetchForecastBias()
      .then((data) => {
        setDayBias(String(data.day));
        setNightBias(String(data.night));
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

  const handleSave = () => {
    const d = parseFloat(dayBias.replace(',', '.'));
    const n = parseFloat(nightBias.replace(',', '.'));
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
        setUpdatedDay(data.updatedAtDay);
        setUpdatedNight(data.updatedAtNight);
        setSavedOk(true);
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
      <div>
        <h2 className="text-lg font-bold text-gray-900">Корекція прогнозу (forecast bias)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Додається до прогнозованої ціни з <code className="rounded bg-violet-100 px-1">tariff_prediction</code> для
          майбутніх бронювань (день / ніч окремо). Одиниці — грн/кВт·год. Автоматичне оновлення також через{' '}
          <code className="rounded bg-violet-100 px-1">POST /forecast/update-bias</code>.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Завантаження…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Bias DAY (день)</label>
            <input
              value={dayBias}
              onChange={(e) => setDayBias(e.target.value)}
              className={fieldClass}
              inputMode="decimal"
            />
            {updatedDay ? (
              <p className="mt-1 text-xs text-gray-500">Оновлено: {new Date(updatedDay).toLocaleString('uk-UA')}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Bias NIGHT (ніч)</label>
            <input
              value={nightBias}
              onChange={(e) => setNightBias(e.target.value)}
              className={fieldClass}
              inputMode="decimal"
            />
            {updatedNight ? (
              <p className="mt-1 text-xs text-gray-500">Оновлено: {new Date(updatedNight).toLocaleString('uk-UA')}</p>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {savedOk ? <p className="text-sm text-emerald-700">Збережено в базі.</p> : null}

      <div className="flex flex-wrap gap-2 border-t border-violet-100 pt-4">
        <PrimaryButton type="button" disabled={loading || saving} onClick={handleSave}>
          {saving ? 'Збереження…' : 'Зберегти bias'}
        </PrimaryButton>
        <OutlineButton type="button" disabled={loading || saving} onClick={load}>
          Оновити з сервера
        </OutlineButton>
      </div>
    </AppCard>
  );
}

function TodayTariffEditor({
  todayDate,
  dayPrice,
  nightPrice,
  onDayChange,
  onNightChange,
  onSave,
  saving,
  loading,
}: {
  todayDate: string;
  dayPrice: string;
  nightPrice: string;
  onDayChange: (v: string) => void;
  onNightChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  loading: boolean;
}) {
  const fieldClass = `mt-1 ${appInputCompactClass}`;

  return (
    <AppCard className="space-y-4 border border-amber-100 bg-amber-50/50">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Редагувати тариф на сьогодні</h2>
        <p className="mt-1 text-sm text-gray-600">
          Дата: <span className="font-semibold text-gray-900">{todayDate}</span>. Зміна застосовується лише до поточної
          календарної дати. Історичні записи в таблиці нижче недоступні для редагування через цю форму.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Денний період</p>
          <p className="mt-1 text-xs text-gray-500">грн/кВт·год</p>
          <input
            value={dayPrice}
            onChange={(e) => onDayChange(e.target.value)}
            className={fieldClass}
            inputMode="decimal"
            disabled={loading}
          />
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-600 p-4 text-white shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">Нічний період</p>
          <p className="mt-1 text-xs text-sky-100">грн/кВт·год</p>
          <input
            value={nightPrice}
            onChange={(e) => onNightChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-sky-400/50 bg-sky-500/40 px-3 py-2 text-sm text-white outline-none placeholder:text-sky-200 focus:ring-2 focus:ring-white/30"
            inputMode="decimal"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-amber-100/80 pt-4">
        <PrimaryButton type="button" disabled={loading || saving} onClick={onSave}>
          {saving ? 'Збереження…' : 'Зберегти тариф на сьогодні'}
        </PrimaryButton>
      </div>
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
    loadList();
    loadToday();
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

  const handleSaveToday = () => {
    const d = parseFloat(dayPrice.replace(',', '.'));
    const n = parseFloat(nightPrice.replace(',', '.'));
    if (!Number.isFinite(d) || !Number.isFinite(n)) {
      setTodayError('Введіть коректні числа для денного та нічного тарифу');
      return;
    }
    if (d < 0 || n < 0) {
      setTodayError('Ціни не можуть бути від’ємними');
      return;
    }
    setTodaySaving(true);
    setTodayError(null);
    setTodayOk(false);
    void putTariffsToday({ dayPrice: d, nightPrice: n })
      .then((t) => {
        setTodayDate(t.date);
        setDayPrice(String(t.dayPrice));
        setNightPrice(String(t.nightPrice));
        setTodayOk(true);
        window.setTimeout(() => setTodayOk(false), 2500);
        loadList();
      })
      .catch((e: unknown) => {
        setTodayError(e instanceof ApiError ? e.message : 'Збереження не вдалося');
      })
      .finally(() => setTodaySaving(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Тарифи та прогноз</h1>
        <p className="mt-1 text-sm text-gray-500">
          Таблиця тарифів з бази, ручне оновлення на сьогодні та корекція bias для моделі.
        </p>
      </div>

      <nav
        className="-mx-1 flex gap-6 overflow-x-auto border-b border-gray-200 px-1"
        aria-label="Розділи тарифів"
      >
        <button type="button" className={tabClass(tab === 'tariffs')} onClick={() => setTab('tariffs')}>
          Тарифи (БД)
        </button>
        <button type="button" className={tabClass(tab === 'bias')} onClick={() => setTab('bias')}>
          Прогноз (bias)
        </button>
      </nav>

      {tab === 'tariffs' ? (
        <div className="space-y-6">
          {todayError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {todayError}
            </p>
          ) : null}
          {todayOk ? <p className="text-sm text-emerald-700">Тариф на сьогодні збережено в базі.</p> : null}

          <TodayTariffEditor
            todayDate={todayDate || '—'}
            dayPrice={dayPrice}
            nightPrice={nightPrice}
            onDayChange={setDayPrice}
            onNightChange={setNightPrice}
            onSave={handleSaveToday}
            saving={todaySaving}
            loading={todayLoading}
          />

          <AppCard padding={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Усі записи тарифу</h2>
                <p className="text-xs text-gray-500">
                  Один рядок на дату (день і ніч), від новіших до старіших. На сторінці до {TARIFF_LIST_PAGE_SIZE}{' '}
                  дат. Ціни — грн/кВт·год. Редагування — лише «на сьогодні» вище.
                </p>
              </div>
              <OutlineButton type="button" disabled={listLoading} onClick={loadList}>
                Оновити список
              </OutlineButton>
            </div>

            {listError ? (
              <p className="px-5 py-4 text-sm text-red-600">{listError}</p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Дата</th>
                    <th className="px-5 py-3 text-right">День</th>
                    <th className="px-5 py-3 text-right">Ніч</th>
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
                          {formatKwhPrice(r.dayPrice)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-900">
                          {formatKwhPrice(r.nightPrice)}
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
