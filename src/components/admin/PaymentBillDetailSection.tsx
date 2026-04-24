import { Link } from 'react-router-dom';
import type { AdminSessionDetailDto } from '../../api/adminNetwork';
import { AppCard, StatusPill } from '../station-admin/Primitives';

function fmtLong(dt: string) {
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

function payStatusLabelUi(s: string) {
  switch (s) {
    case 'success':
      return 'Успіх';
    case 'pending':
      return 'Очікує';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function payTone(s: string): 'success' | 'warn' | 'danger' | 'muted' {
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

function sessionTone(s: AdminSessionDetailDto['status']): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'completed':
      return 'success';
    case 'active':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

function sessionLabelUi(s: AdminSessionDetailDto['status']) {
  switch (s) {
    case 'active':
      return 'Активна';
    case 'completed':
      return 'Завершено';
    case 'failed':
      return 'Помилка';
    default:
      return s;
  }
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

type Props = {
  data: AdminSessionDetailDto;
  sessionId: string;
};

/** Картка деталей платежу (bill) у стилі сторінки бронювання. */
export default function PaymentBillDetailSection({ data, sessionId }: Props) {
  const bill = data.bill;
  const sessionPath = `/admin-dashboard/sessions/${sessionId}`;

  return (
    <AppCard className="space-y-4">
      {bill ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Статус оплати:</span>
              <StatusPill tone={payTone(bill.paymentStatus)}>{payStatusLabelUi(bill.paymentStatus)}</StatusPill>
            </p>
            <p className="text-sm text-gray-500">Рахунок створено: {fmtLong(bill.createdAt)}</p>
          </div>

          <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сума до сплати</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {bill.calculatedAmount.toLocaleString('uk-UA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-lg font-medium text-gray-500">грн</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія (сесія)</p>
              <p className="mt-1 tabular-nums text-slate-900">
                {data.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ціна кВт·год (на момент)</p>
              <p className="mt-1 tabular-nums text-slate-900">
                {bill.pricePerKwhAtTime != null
                  ? `${bill.pricePerKwhAtTime.toLocaleString('uk-UA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })} грн`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Спосіб оплати</p>
              <p className="mt-1 text-slate-900">{bill.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Оплачено</p>
              <p className="mt-1 text-sm text-slate-900">{bill.paidAt ? fmtLong(bill.paidAt) : '—'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Користувач</p>
            <p className="mt-1 font-medium text-slate-900">{data.userName}</p>
            {data.userEmail ? <p className="mt-1 text-sm text-gray-600">{data.userEmail}</p> : null}
            {data.userId ? (
              <Link
                to={`/admin-dashboard/users/${data.userId}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                Профіль користувача
                <ChevronRightIcon className="h-4 w-4 shrink-0" />
              </Link>
            ) : null}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Link
              to={sessionPath}
              state={{ focusBill: true }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Повна сесія
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Статус сесії:</span>
              <StatusPill tone={sessionTone(data.status)}>{sessionLabelUi(data.status)}</StatusPill>
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-slate-600">
              {data.status === 'failed'
                ? 'Для сесії зі статусом «Помилка» рахунок (bill) не створюється'
                : data.status === 'active'
                  ? 'Рахунок з’явиться після завершення сесії'
                  : 'Для цієї сесії рахунок (bill) ще не знайдено. Для завершених сесій очікується запис у БД'}
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Користувач</p>
            <p className="mt-1 font-medium text-slate-900">{data.userName}</p>
            {data.userEmail ? <p className="mt-1 text-sm text-gray-600">{data.userEmail}</p> : null}
            {data.userId ? (
              <Link
                to={`/admin-dashboard/users/${data.userId}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                Профіль користувача
                <ChevronRightIcon className="h-4 w-4 shrink-0" />
              </Link>
            ) : null}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Link
              to={sessionPath}
              state={{ focusBill: true }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Повна сесія
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </>
      )}
    </AppCard>
  );
}
