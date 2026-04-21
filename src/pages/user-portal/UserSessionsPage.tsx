import { useMemo, useState } from 'react';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { Link } from 'react-router-dom';
import { UserPortalEmptyState } from '../../components/user-portal/UserPortalEmptyState';
import { UserPortalRowCard } from '../../components/user-portal/UserPortalRowCard';
import { useUserPortal } from '../../context/UserPortalContext';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';
import {
  userPortalListPageShell,
  userPortalPageHeaderRow,
  userPortalPageTitle,
  userPortalPrimaryCta,
} from '../../styles/userPortalTheme';

const SESSIONS_PAGE_SIZE = 10;

function shortSessionDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function SessionBoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

export default function UserSessionsPage() {
  const { sessions } = useUserPortal();
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return sorted.filter((s) => isOnOrAfterNetworkPeriodCutoff(s.startedAt, period));
  }, [sessions, period]);

  const totalPages = rows.length === 0 ? 1 : Math.max(1, Math.ceil(rows.length / SESSIONS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * SESSIONS_PAGE_SIZE;
    return rows.slice(start, start + SESSIONS_PAGE_SIZE);
  }, [rows, safePage]);

  return (
    <div className={`space-y-6 ${userPortalListPageShell}`}>
      <div className={userPortalPageHeaderRow}>
        <h1 className={`${userPortalPageTitle} shrink-0`}>Історія сесій</h1>
        <div className="min-w-0 sm:flex sm:shrink-0 sm:justify-end">
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
        <UserPortalEmptyState
          icon={<SessionBoltIcon className="h-8 w-8" />}
          title="Історія порожня"
          description="Після зарядок сесії з’являться тут"
          footer={
            <Link to="/dashboard/bookings/new" className={userPortalPrimaryCta}>
              Оформити бронювання
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {pageSlice.map((s) => (
            <li key={s.id}>
              <UserPortalRowCard
                to={`/dashboard/sessions/${s.id}`}
                accent="green"
                icon={<SessionBoltIcon className="h-5 w-5" />}
                title={s.stationName}
                subtitle={s.portLabel}
                dateLine={shortSessionDate(s.startedAt)}
                metaLine={`${s.durationMin} хв · ${s.kwh.toLocaleString('uk-UA', {
                  maximumFractionDigits: 3,
                })} кВт·год`}
                statusLabel="Завершено"
                statusTextClassName="text-green-700"
                statusPlacement="inline"
              />
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
