import { useEffect, useMemo, useState } from 'react';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { Link } from 'react-router-dom';
import { UserPortalEmptyState } from '../../components/user-portal/UserPortalEmptyState';
import UserPortalStatusFilterChips, {
  type UserPortalStatusChipAccent,
} from '../../components/user-portal/UserPortalStatusFilterChips';
import { UserPortalRowCard, type UserPortalRowAccent } from '../../components/user-portal/UserPortalRowCard';
import { useUserPortal } from '../../context/UserPortalContext';
import type { UserSessionUiStatus } from '../../types/userPortal';
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

function sessionRowAccent(status: UserSessionUiStatus): UserPortalRowAccent {
  if (status === 'active') return 'amber';
  if (status === 'failed') return 'rose';
  return 'green';
}

function sessionStatusPresentation(status: UserSessionUiStatus): { label: string; statusTextClassName: string } {
  if (status === 'active') return { label: 'Активна', statusTextClassName: 'text-amber-700' };
  if (status === 'failed') return { label: 'Невдала', statusTextClassName: 'text-rose-700' };
  return { label: 'Завершено', statusTextClassName: 'text-green-700' };
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
  const [statusFilter, setStatusFilter] = useState<UserSessionUiStatus | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setStatusFilter(null);
  }, [period]);

  useEffect(() => {
    setPage(1);
  }, [period, statusFilter]);

  const pool = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return sorted.filter((s) => isOnOrAfterNetworkPeriodCutoff(s.startedAt, period));
  }, [sessions, period]);

  const rows = useMemo(() => {
    if (!statusFilter) return pool;
    return pool.filter((s) => s.status === statusFilter);
  }, [pool, statusFilter]);

  const sessionStatusChips = useMemo(() => {
    const defs: {
      id: UserSessionUiStatus;
      label: string;
      badgeClass: string;
      accent: UserPortalStatusChipAccent;
    }[] = [
      { id: 'active', label: 'Активна', badgeClass: 'bg-amber-100 text-amber-900', accent: 'amber' },
      { id: 'completed', label: 'Завершено', badgeClass: 'bg-emerald-100 text-emerald-900', accent: 'emerald' },
      { id: 'failed', label: 'Невдала', badgeClass: 'bg-rose-100 text-rose-900', accent: 'rose' },
    ];
    return defs.map((d) => ({
      ...d,
      count: pool.filter((s) => s.status === d.id).length,
    }));
  }, [pool]);

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

      <UserPortalStatusFilterChips
        chips={sessionStatusChips}
        selectedId={statusFilter}
        onChange={(id) => setStatusFilter(id as UserSessionUiStatus | null)}
        ariaLabel="Фільтр за статусом сесії"
        gridClassName="grid-cols-2 sm:grid-cols-3"
      />

      {rows.length === 0 ? (
        pool.length === 0 ? (
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
          <UserPortalEmptyState
            icon={<SessionBoltIcon className="h-8 w-8" />}
            title="Немає записів з обраним статусом"
            description="Натисніть активну картку статусу ще раз, щоб зняти фільтр."
          />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {pageSlice.map((s) => {
            const st = sessionStatusPresentation(s.status);
            return (
              <li key={s.id}>
                <UserPortalRowCard
                  to={`/dashboard/sessions/${s.id}`}
                  accent={sessionRowAccent(s.status)}
                  icon={<SessionBoltIcon className="h-5 w-5" />}
                  title={s.stationName}
                  subtitle={s.portLabel}
                  dateLine={shortSessionDate(s.startedAt)}
                  metaLine={`${s.durationMin} хв · ${s.kwh.toLocaleString('uk-UA', {
                    maximumFractionDigits: 3,
                  })} кВт·год`}
                  statusLabel={st.label}
                  statusTextClassName={st.statusTextClassName}
                  statusPlacement="inline"
                />
              </li>
            );
          })}
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
