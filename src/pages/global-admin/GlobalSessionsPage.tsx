import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAdminNetworkSessions, type AdminNetworkSessionRow } from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appInputClass } from '../../components/station-admin/formStyles';

const SESSION_PAGE_SIZE = 50;

type StatusTab = 'all' | AdminNetworkSessionRow['status'];

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

function sessionTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'completed':
      return 'success';
    case 'active':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

function sessionLabel(s: string) {
  switch (s) {
    case 'active':
      return 'Активна';
    case 'completed':
      return 'Завершено';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'active', label: 'Активна' },
  { id: 'completed', label: 'Завершено' },
  { id: 'failed', label: 'Помилка' },
];

export default function GlobalSessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AdminNetworkSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetchAdminNetworkSessions()
      .then(setSessions)
      .catch((e: unknown) => {
        setSessions([]);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити сесії');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedBase = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ),
    [sessions]
  );

  const filteredByStatus = useMemo(() => {
    if (statusTab === 'all') return sortedBase;
    return sortedBase.filter((s) => s.status === statusTab);
  }, [sortedBase, statusTab]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return filteredByStatus;
    return filteredByStatus.filter(
      (s) =>
        s.userName.toLowerCase().includes(needle) ||
        s.stationName.toLowerCase().includes(needle) ||
        s.id.toLowerCase().includes(needle) ||
        s.portLabel.toLowerCase().includes(needle)
    );
  }, [filteredByStatus, q]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SESSION_PAGE_SIZE) || 1);
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filtered.length, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * SESSION_PAGE_SIZE;
    return filtered.slice(start, start + SESSION_PAGE_SIZE);
  }, [filtered, page]);

  const openDetail = (id: string) => {
    navigate(`/admin-dashboard/sessions/${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Сесії зарядки</h1>
        <p className="mt-1 text-sm text-gray-500">Усі сесії з бази. Рядок — повна інформація.</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <nav
        className="-mx-1 flex gap-4 overflow-x-auto border-b border-gray-200 px-1 sm:gap-6"
        aria-label="Фільтр за статусом сесії"
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tabClass(statusTab === t.id)}
            onClick={() => setStatusTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="global-sessions-search">
          Пошук
        </label>
        <input
          id="global-sessions-search"
          type="search"
          placeholder="Користувач, станція, порт, ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={appInputClass}
          disabled={loading}
        />
      </div>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Початок</th>
              <th className="px-4 py-3">Користувач</th>
              <th className="px-4 py-3">Станція</th>
              <th className="px-4 py-3">Порт</th>
              <th className="px-4 py-3 text-right">кВт·год</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Сума</th>
              <th className="px-4 py-3 text-right">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {pagedRows.map((s) => (
              <tr
                key={s.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-white hover:bg-emerald-50/70"
                onClick={() => openDetail(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail(s.id);
                  }
                }}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(s.startedAt)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{s.userName}</td>
                <td className="px-4 py-3 text-gray-700">{s.stationName}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.portLabel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                  {s.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={sessionTone(s.status)}>{sessionLabel(s.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                  {s.cost != null
                    ? `${s.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap justify-end gap-2">
                    {s.userId ? (
                      <Link
                        to={`/admin-dashboard/users/${s.userId}`}
                        className="font-semibold text-green-700 hover:text-green-800"
                      >
                        Профіль
                      </Link>
                    ) : null}
                    <Link
                      to={`/admin-dashboard/stations/${s.stationId}`}
                      className="font-semibold text-green-700 hover:text-green-800"
                    >
                      Станція
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Нічого не знайдено.</p>
        ) : null}
        {filtered.length > 0 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <AdminListPagination
              page={page}
              pageSize={SESSION_PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </AppCard>
    </div>
  );
}
