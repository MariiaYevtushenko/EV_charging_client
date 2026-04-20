import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAdminNetworkPaymentStatusCounts,
  fetchAdminNetworkPayments,
  type AdminNetworkPaymentRow,
  type AdminNetworkPaymentStatusCounts,
  type NetworkListPeriod,
} from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import AdminListPagination from '../../components/admin/AdminListPagination';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { globalAdminPageTitle, globalAdminSearchInput } from '../../styles/globalAdminTheme';
import {
  ADMIN_LIST_SEARCH_DEBOUNCE_MS,
  GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE,
} from '../../constants/adminUi';

const PAYMENT_STATUS_TAB_ORDER: AdminNetworkPaymentRow['status'][] = ['success', 'pending', 'failed'];

type PaymentSortKey = 'createdAt' | 'userName' | 'sessionId' | 'method' | 'amount' | 'status';

function paymentTone(s: string): 'success' | 'warn' | 'danger' | 'muted' {
  switch (s) {
    case 'success':
      return 'success';
    case 'pending':
      return 'warn';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

function paymentLabel(s: string) {
  switch (s) {
    case 'success':
      return 'Успіх';
    case 'pending':
      return 'Очікується';
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

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

export default function GlobalPaymentsPage() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<PaymentSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminNetworkPaymentRow['status'] | null>(null);
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [rows, setRows] = useState<AdminNetworkPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<AdminNetworkPaymentStatusCounts | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchQuery(searchDraft.trim());
    }, ADMIN_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, period]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE) || 1),
    [total]
  );
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [total, totalPages]);

  useEffect(() => {
    void fetchAdminNetworkPaymentStatusCounts(searchQuery || undefined, period)
      .then(setStatusCounts)
      .catch(() => setStatusCounts(null));
  }, [searchQuery, period]);

  const toggleStatusFilter = useCallback((s: AdminNetworkPaymentRow['status']) => {
    setStatusFilter((prev) => (prev === s ? null : s));
  }, []);

  const openPaymentDetail = useCallback(
    (sessionId: string) => {
      navigate(`/admin-dashboard/payments/${encodeURIComponent(sessionId)}`);
    },
    [navigate]
  );

  const onSort = useCallback(
    (key: string) => {
      const k = key as PaymentSortKey;
      setPage(1);
      if (sortKey === k) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(k);
        setSortDir(defaultDirForSortColumn(k));
      }
    },
    [sortKey]
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetchAdminNetworkPayments({
      page,
      pageSize: GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE,
      q: searchQuery || undefined,
      status: statusFilter ?? undefined,
      sort: sortKey,
      order: sortDir,
      period,
    })
      .then((data) => {
        setRows(data.items);
        setTotal(data.total);
      })
      .catch((e: unknown) => {
        setRows([]);
        setTotal(0);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити платежі');
      })
      .finally(() => setLoading(false));
  }, [page, searchQuery, statusFilter, sortKey, sortDir, period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className={globalAdminPageTitle}>Платежі</h1>
        <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-6">
          <label htmlFor="global-payments-search" className="sr-only">
            Пошук платежів
          </label>
          <div className="relative min-w-0 w-full flex-1 sm:min-w-0">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
              aria-hidden
            >
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              id="global-payments-search"
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Пошук за сесією, користувачем..."
              className={globalAdminSearchInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex w-full min-w-0 justify-end sm:w-auto sm:shrink-0">
            <NetworkListPeriodControl value={period} onChange={setPeriod} />
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {statusCounts ? (
        <div>
          
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAYMENT_STATUS_TAB_ORDER.map((st) => {
              const selected = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatusFilter(st)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/45 ${
                    selected
                      ? 'border-green-600 bg-green-50/95 ring-2 ring-green-600/80 ring-offset-1 ring-offset-white'
                      : 'border-slate-200 bg-white/95 ring-1 ring-slate-950/[0.04] hover:border-slate-300 hover:bg-green-50/40'
                  }`}
                >
                  <StatusPill tone={paymentTone(st)}>{paymentLabel(st)}</StatusPill>
                  <p className="text-2xl font-bold tabular-nums text-gray-900">
                    {statusCounts[st].toLocaleString('uk-UA')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <SortableTableTh
                label="Дата"
                columnKey="createdAt"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Користувач"
                columnKey="userName"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Сесія · станція"
                columnKey="sessionId"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Метод"
                columnKey="method"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTableTh
                label="Сума"
                columnKey="amount"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="right"
              />
              <SortableTableTh
                label="Статус"
                columnKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {!loading && !error && total === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  {searchQuery || statusFilter
                    ? 'Нічого не знайдено за цим запитом'
                    : 'Платежів (bill) поки немає.'}
                </td>
              </tr>
            ) : null}
            {rows.map((p) => (
              <tr
                key={p.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-white hover:bg-green-50/70"
                onClick={() => openPaymentDetail(p.sessionId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPaymentDetail(p.sessionId);
                  }
                }}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(p.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.userName}</td>
                <td
                  className="max-w-[11rem] min-w-0 truncate px-4 py-3 text-gray-600 sm:max-w-[16rem] lg:max-w-[20rem]"
                  title={p.description}
                >
                  {p.description}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.method}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {p.amount.toLocaleString('uk-UA')} {p.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 0 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <AdminListPagination
              page={page}
              pageSize={GLOBAL_ADMIN_NETWORK_TABLE_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </AppCard>
    </div>
  );
}
