import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalAdmin, type PaymentRow } from '../../context/GlobalAdminContext';
import { fetchAdminNetworkSessionDetail, type AdminSessionDetailDto } from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import PaymentDetailModal from '../../components/admin/PaymentDetailModal';
import AdminListPagination from '../../components/admin/AdminListPagination';
import SortableTableTh, {
  defaultDirForSortColumn,
  type SortDir,
} from '../../components/admin/SortableTableTh';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';

const PAYMENT_PAGE_SIZE = 50;

type PaymentSortKey = 'createdAt' | 'userName' | 'description' | 'method' | 'amount' | 'status';

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

function cmpPayments(a: PaymentRow, b: PaymentRow, sortKey: PaymentSortKey, sortDir: SortDir): number {
  let c = 0;
  switch (sortKey) {
    case 'createdAt':
      c = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      break;
    case 'userName':
      c = a.userName.localeCompare(b.userName, 'uk');
      break;
    case 'description':
      c = a.description.localeCompare(b.description, 'uk');
      break;
    case 'method':
      c = a.method.localeCompare(b.method, 'uk');
      break;
    case 'amount':
      c = a.amount - b.amount;
      break;
    case 'status':
      c = a.status.localeCompare(b.status, 'uk');
      break;
    default:
      c = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  return sortDir === 'desc' ? -c : c;
}

export default function GlobalPaymentsPage() {
  const { allPayments, paymentsLoading, paymentsError, reloadPayments } = useGlobalAdmin();
  const [sortKey, setSortKey] = useState<PaymentSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const [paymentModalSessionId, setPaymentModalSessionId] = useState<string | null>(null);
  const [paymentModalDetail, setPaymentModalDetail] = useState<AdminSessionDetailDto | null>(null);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);

  const onSort = useCallback(
    (key: string) => {
      const k = key as PaymentSortKey;
      if (sortKey === k) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(k);
        setSortDir(defaultDirForSortColumn(k));
      }
    },
    [sortKey]
  );

  const rows = useMemo(
    () => [...allPayments].sort((a, b) => cmpPayments(a, b, sortKey, sortDir)),
    [allPayments, sortKey, sortDir]
  );

  useEffect(() => {
    setPage(1);
  }, [allPayments, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAYMENT_PAGE_SIZE) || 1);
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [rows.length, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAYMENT_PAGE_SIZE;
    return rows.slice(start, start + PAYMENT_PAGE_SIZE);
  }, [rows, page]);

  const totalSuccess = useMemo(
    () => allPayments.filter((p) => p.status === 'success').reduce((a, p) => a + p.amount, 0),
    [allPayments]
  );

  const openPaymentModal = useCallback((sessionId: string) => {
    setPaymentModalSessionId(sessionId);
    setPaymentModalDetail(null);
    setPaymentModalError(null);
    setPaymentModalLoading(true);
    void fetchAdminNetworkSessionDetail(sessionId)
      .then(setPaymentModalDetail)
      .catch((e: unknown) => {
        setPaymentModalDetail(null);
        setPaymentModalError(e instanceof ApiError ? e.message : 'Не вдалося завантажити дані');
      })
      .finally(() => setPaymentModalLoading(false));
  }, []);

  const closePaymentModal = useCallback(() => {
    setPaymentModalSessionId(null);
    setPaymentModalDetail(null);
    setPaymentModalError(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Платежі</h1>
        <button
          type="button"
          onClick={() => reloadPayments()}
          disabled={paymentsLoading}
          className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-50"
        >
          {paymentsLoading ? 'Оновлення…' : 'Оновити'}
        </button>
      </div>

      {paymentsError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{paymentsError}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
            {totalSuccess.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
          </p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Записів</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{allPayments.length}</p>
        </AppCard>
      </div>

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
                label="Опис"
                columnKey="description"
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
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Дія
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paymentsLoading && allPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  Завантаження…
                </td>
              </tr>
            ) : null}
            {!paymentsLoading && !paymentsError && allPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  Платежів (bill) поки немає.
                </td>
              </tr>
            ) : null}
            {pagedRows.map((p) => (
              <tr
                key={p.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-white hover:bg-emerald-50/70"
                onClick={() => openPaymentModal(p.sessionId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPaymentModal(p.sessionId);
                  }
                }}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(p.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.userName}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">{p.description}</td>
                <td className="px-4 py-3 text-gray-600">{p.method}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                  {p.amount.toLocaleString('uk-UA')} {p.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                    <Link
                      to={`/admin-dashboard/sessions/${p.sessionId}`}
                      state={{ focusBill: true }}
                      className="font-semibold text-green-700 hover:text-green-800"
                    >
                      Повна сесія
                    </Link>
                    {p.userId ? (
                      <Link
                        to={`/admin-dashboard/users/${p.userId}`}
                        className="font-semibold text-green-700 hover:text-green-800"
                      >
                        Користувач
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Без користувача</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 0 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <AdminListPagination
              page={page}
              pageSize={PAYMENT_PAGE_SIZE}
              total={rows.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </AppCard>

      <PaymentDetailModal
        open={paymentModalSessionId != null}
        sessionId={paymentModalSessionId}
        loading={paymentModalLoading}
        error={paymentModalError}
        data={paymentModalDetail}
        onClose={closePaymentModal}
      />
    </div>
  );
}
