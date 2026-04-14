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
        <p className="mt-1 text-sm text-gray-500">Історія оплат за ваші сесії зарядки</p>
      </div>

      <AppCard className="!p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні операції (сума)</p>
        <p className="mt-1 text-2xl font-bold text-green-700">
          {total.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
        </p>
      </AppCard>

      {rows.length === 0 ? (
        <AppCard className="py-12 text-center text-sm text-gray-500">
          Платежів ще немає — після зарядок з оплатою вони з’являться тут.
        </AppCard>
      ) : (
        <div className="relative pl-2">
          <div className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-100 to-transparent" aria-hidden />
          <ul className="space-y-0">
            {rows.map((p) => (
              <li key={p.id} className="relative pb-8 last:pb-0">
                <div className="absolute left-0 top-2 z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-600 shadow-sm shadow-green-600/20" />
                <div className="ml-10">
                  <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          to={`/dashboard/payments/${p.id}`}
                          className="font-semibold text-gray-900 underline-offset-2 hover:text-green-800 hover:underline"
                        >
                          {p.description}
                        </Link>
                        {p.stationName ? (
                          <p className="mt-0.5 text-sm text-gray-600">{p.stationName}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-gray-500">
                          {fmt(p.createdAt)} · {p.method}
                          {p.energyKwh != null ? ` · ${p.energyKwh.toLocaleString('uk-UA')} кВт·год` : ''}
                        </p>
                        {p.sessionId ? (
                          <p className="mt-2 text-xs">
                            <Link
                              to={`/dashboard/sessions/${p.sessionId}`}
                              className="font-medium text-green-700 hover:text-green-800 hover:underline"
                            >
                              Відкрити сесію #{p.sessionId}
                            </Link>
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                        <p className="text-xl font-bold tabular-nums text-gray-900">
                          {p.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                          грн
                        </p>
                        <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
