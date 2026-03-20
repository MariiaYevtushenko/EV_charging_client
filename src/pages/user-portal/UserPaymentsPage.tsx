import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';

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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function UserPaymentsPage() {
  const { payments } = useUserPortal();

  const rows = useMemo(
    () => [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments]
  );

  const total = useMemo(
    () => payments.filter((p) => p.status === 'success').reduce((a, p) => a + p.amount, 0),
    [payments]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Платежі</h1>
        <p className="mt-1 text-sm text-gray-500">Історія оплат і поповнень (демо).</p>
      </div>

      <AppCard className="!p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні операції (сума)</p>
        <p className="mt-1 text-2xl font-bold text-green-700">
          {total.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
        </p>
      </AppCard>

      <div className="space-y-3">
        {rows.map((p) => (
          <AppCard key={p.id} className="!p-4 transition hover:ring-2 hover:ring-green-500/20">
            <Link
              to={`/dashboard/payments/${p.id}`}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{p.description}</p>
                <p className="text-xs text-gray-500">
                  {fmt(p.createdAt)} · {p.method}
                </p>
                <p className="mt-2 text-xs font-medium text-green-700">Усі деталі →</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-lg font-bold tabular-nums text-gray-900">
                  {p.amount.toLocaleString('uk-UA')} грн
                </p>
                <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
              </div>
            </Link>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
