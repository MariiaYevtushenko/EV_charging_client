import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';

const SESSIONS_PAGE_SIZE = 10;

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function UserSessionsPage() {
  const { sessions } = useUserPortal();
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return sorted.filter((s) => isOnOrAfterNetworkPeriodCutoff(s.startedAt, period));
  }, [sessions, period]);

  const totals = useMemo(() => {
    const kwh = rows.reduce((a, s) => a + s.kwh, 0);
    const cost = rows.reduce((a, s) => a + s.cost, 0);
    return { kwh, cost };
  }, [rows]);

  const totalPages = rows.length === 0 ? 1 : Math.max(1, Math.ceil(rows.length / SESSIONS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * SESSIONS_PAGE_SIZE;
    return rows.slice(start, start + SESSIONS_PAGE_SIZE);
  }, [rows, safePage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Історія сесій</h1>
        </div>

      <div className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-4 lg:gap-6">
        
        <div className="flex min-w-0 shrink-0 justify-end sm:ml-auto">
          <NetworkListPeriodControl
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setPage(1);
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <AppCard className="py-12 text-center text-sm text-gray-500">
          Історія порожня — після зарядок сесії з’являться тут.
        </AppCard>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {pageSlice.map((s) => (
            <li key={s.id}>
              <Link
                to={`/dashboard/sessions/${s.id}`}
                className="flex h-full min-h-[140px] flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-emerald-200/90 hover:bg-slate-50/80 hover:shadow-md hover:ring-emerald-950/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:p-5"
              >
                <span className="text-lg font-semibold leading-snug text-slate-900">{s.stationName}</span>
                <p className="mt-1 text-sm text-slate-600">{s.portLabel}</p>
                <p className="mt-1 text-xs text-slate-500">{fmt(s.startedAt)}</p>
                <div className="mt-4 grid flex-1 grid-cols-2 gap-3 border-t border-emerald-100/90 pt-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Тривалість</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{s.durationMin} хв</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/55">Енергія</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                      {s.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 ? (
        <AdminListPagination
          page={safePage}
          pageSize={SESSIONS_PAGE_SIZE}
          total={rows.length}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
