import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { NetworkListPeriod } from '../../api/adminNetwork';
import NetworkListPeriodControl from '../../components/admin/NetworkListPeriodControl';
import AdminListPagination from '../../components/admin/AdminListPagination';
import { UserPortalEmptyState } from '../../components/user-portal/UserPortalEmptyState';
import UserPortalStatusFilterChips, {
  type UserPortalStatusChipAccent,
} from '../../components/user-portal/UserPortalStatusFilterChips';
import { UserPortalRowCard, type UserPortalRowAccent } from '../../components/user-portal/UserPortalRowCard';
import { useUserPortal } from '../../context/UserPortalContext';
import type { UserPaymentRow } from '../../types/userPortal';
import {
  userPortalListPageShell,
  userPortalPageHeaderRow,
  userPortalPageTitle,
  userPortalPrimaryCta,
} from '../../styles/userPortalTheme';
import { isOnOrAfterNetworkPeriodCutoff } from '../../utils/networkListPeriod';

const PAYMENTS_PAGE_SIZE = 10;

function shortPaymentDate(dt: string) {
  try {
    return new Date(dt).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dt;
  }
}

function BanknoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function paymentRowVisual(p: UserPaymentRow): {
  accent: UserPortalRowAccent;
  statusTextClassName: string;
  statusLabel: string;
  icon: ReactElement;
} {
  if (p.status === 'success') {
    return {
      accent: 'green',
      statusTextClassName: 'text-emerald-600',
      statusLabel: 'Успішно',
      icon: <BanknoteIcon className="h-5 w-5" />,
    };
  }
  if (p.status === 'pending') {
    return {
      accent: 'amber',
      statusTextClassName: 'text-amber-600',
      statusLabel: 'Очікує на оплату',
      icon: <BanknoteIcon className="h-5 w-5" />,
    };
  }
  return {
    accent: 'rose',
    statusTextClassName: 'text-rose-600',
    statusLabel: 'Відмовлено',
    icon: <BanknoteIcon className="h-5 w-5" />,
  };
}

type PaymentStatusFilter = UserPaymentRow['status'];

export default function UserPaymentsPage() {
  const { payments } = useUserPortal();
  const [period, setPeriod] = useState<NetworkListPeriod>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setStatusFilter(null);
  }, [period]);

  useEffect(() => {
    setPage(1);
  }, [period, statusFilter]);

  const pool = useMemo(() => {
    const sorted = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.filter((p) => isOnOrAfterNetworkPeriodCutoff(p.createdAt, period));
  }, [payments, period]);

  const rows = useMemo(() => {
    if (!statusFilter) return pool;
    return pool.filter((p) => p.status === statusFilter);
  }, [pool, statusFilter]);

  const paymentStatusChips = useMemo(() => {
    const defs: {
      id: PaymentStatusFilter;
      label: string;
      badgeClass: string;
      accent: UserPortalStatusChipAccent;
    }[] = [
      { id: 'success', label: 'Успішно', badgeClass: 'bg-emerald-100 text-emerald-900', accent: 'emerald' },
      { id: 'pending', label: 'Очікує', badgeClass: 'bg-amber-100 text-amber-900', accent: 'amber' },
      { id: 'failed', label: 'Відмовлено', badgeClass: 'bg-rose-100 text-rose-900', accent: 'rose' },
    ];
    return defs.map((d) => ({
      ...d,
      count: pool.filter((p) => p.status === d.id).length,
    }));
  }, [pool]);

  const totalPages = rows.length === 0 ? 1 : Math.max(1, Math.ceil(rows.length / PAYMENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAYMENTS_PAGE_SIZE;
    return rows.slice(start, start + PAYMENTS_PAGE_SIZE);
  }, [rows, safePage]);

  return (
    <div className={`space-y-6 ${userPortalListPageShell}`}>
      <div className={userPortalPageHeaderRow}>
        <h1 className={`${userPortalPageTitle} shrink-0`}>Платежі</h1>
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
        chips={paymentStatusChips}
        selectedId={statusFilter}
        onChange={(id) => setStatusFilter(id as PaymentStatusFilter | null)}
        ariaLabel="Фільтр за статусом платежу"
        gridClassName="grid-cols-2 sm:grid-cols-3"
      />

      {rows.length === 0 ? (
        pool.length === 0 ? (
          <UserPortalEmptyState
            icon={<BanknoteIcon className="h-8 w-8" />}
            title="Платежів ще немає"
            description="Після зарядок з оплатою вони з’являться тут"
            footer={
              <Link to="/dashboard" className={userPortalPrimaryCta}>
                Відкрити карту станцій
              </Link>
            }
          />
        ) : (
          <UserPortalEmptyState
            icon={<BanknoteIcon className="h-8 w-8" />}
            title="Немає записів з обраним статусом"
            description="Натисніть активну картку статусу ще раз, щоб зняти фільтр."
          />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {pageSlice.map((p) => {
            const carLine = [p.vehicleLabel?.trim(), p.vehiclePlate?.trim()].filter(Boolean).join(' · ');
            const title =
              p.stationName?.trim() ||
              (p.description?.trim() ? p.description.trim().slice(0, 88) : '') ||
              carLine ||
              'Платіж';
            const subtitle = carLine && title !== carLine ? carLine : undefined;
            const vis = paymentRowVisual(p);
            const sumLine = `${p.amount.toLocaleString('uk-UA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} грн`;
            return (
              <li key={p.id}>
                <UserPortalRowCard
                  to={`/dashboard/payments/${p.id}`}
                  accent={vis.accent}
                  icon={vis.icon}
                  title={title}
                  subtitle={subtitle}
                  dateLine={shortPaymentDate(p.createdAt)}
                  metaLine={sumLine}
                  statusLabel={vis.statusLabel}
                  statusTextClassName={vis.statusTextClassName}
                  statusPlacement="inline"
                  metaPlacement="bottom-right"
                />
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
