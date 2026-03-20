import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
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

function fmtFull(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function UserPaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { payments } = useUserPortal();

  const payment = useMemo(() => payments.find((p) => p.id === paymentId), [payments, paymentId]);

  if (!payment) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/payments" className="text-sm font-medium text-green-700 hover:underline">
          ← До платежів
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Платіж не знайдено.</AppCard>
      </div>
    );
  }

  const isCharging = /заряд|сесі/i.test(payment.description);

  return (
    <div className="space-y-6">
      <Link to="/dashboard/payments" className="text-sm font-medium text-green-700 hover:underline">
        ← До платежів
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Деталі платежу</h1>
        <p className="mt-1 font-mono text-xs text-gray-400">ID: {payment.id}</p>
      </div>

      <AppCard className="!p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{payment.description}</p>
            <p className="mt-1 text-sm text-gray-500">{fmtFull(payment.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-gray-900">
              {payment.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
            </p>
            <div className="mt-2 flex justify-end">
              <StatusPill tone={paymentTone(payment.status)}>{paymentLabel(payment.status)}</StatusPill>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Спосіб оплати</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{payment.method}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Тип операції (демо)</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {isCharging ? 'Зарядка / сесія' : 'Поповнення або інше'}
            </dd>
          </div>
          {payment.stationName ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Станція</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{payment.stationName}</dd>
            </div>
          ) : null}
          {payment.energyKwh != null ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія (демо)</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {payment.energyKwh.toLocaleString('uk-UA')} кВт·год
              </dd>
            </div>
          ) : null}
          {payment.energyKwh != null && payment.amount > 0 ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Середня ціна (демо)</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {(payment.amount / payment.energyKwh).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн / кВт·год
              </dd>
            </div>
          ) : null}
        </dl>
      </AppCard>
    </div>
  );
}
