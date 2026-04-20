import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';
import { userPortalPageSubtitle, userPortalPageTitle } from '../../styles/userPortalTheme';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';

const PAYMENTS_PAGE_SIZE = 10;

/** Дата без часу — для списку; час і решта — на сторінці деталей. */
function fmtDateOnly(dt: string) {
  try {
    return new Date(dt).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dt;
  }
}

export default function UserPaymentsPage() {
  const { payments } = useUserPortal();
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const sorted = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.filter((p) => isOnOrAfterNetworkPeriodCutoff(p.createdAt, period));
  }, [payments, period]);

  const totalPages = rows.length === 0 ? 1 : Math.max(1, Math.ceil(rows.length / PAYMENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAYMENTS_PAGE_SIZE;
    return rows.slice(start, start + PAYMENTS_PAGE_SIZE);
  }, [rows, safePage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={userPortalPageTitle}>Платежі</h1>
        </div>

      <div className="flex flex-wrap justify-end gap-4">
        <NetworkListPeriodControl
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setPage(1);
          }}
        />
      </div>

      {rows.length === 0 ? (
        <AppCard className="py-12 text-center text-sm text-gray-500">
          Платежів ще немає — після зарядок з оплатою вони з’являться тут.
        </AppCard>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {pageSlice.map((p) => {
            const carTitle = p.vehicleLabel?.trim() || 'Авто не вказано';
            return (
              <li key={p.id}>
                <Link
                  to={`/dashboard/payments/${p.id}`}
                  className="flex h-full min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-emerald-200/90 hover:bg-slate-50/80 hover:shadow-md hover:ring-emerald-950/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:p-5"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Авто</p>
                    <p className="mt-1 text-base font-semibold leading-snug text-slate-900">{carTitle}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-emerald-100/90 pt-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Дата</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{fmtDateOnly(p.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Сума</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-900">
                        {p.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 ? (
        <AdminListPagination
          page={safePage}
          pageSize={PAYMENTS_PAGE_SIZE}
          total={rows.length}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
