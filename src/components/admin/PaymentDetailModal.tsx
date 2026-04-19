import { useCallback, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { AdminSessionDetailDto } from '../../api/adminNetwork';
import { StatusPill } from '../station-admin/Primitives';

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

type Props = {
  open: boolean;
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  data: AdminSessionDetailDto | null;
  onClose: () => void;
};

export default function PaymentDetailModal({
  open,
  sessionId,
  loading,
  error,
  data,
  onClose,
}: Props) {
  const titleId = useId();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  if (!open || !sessionId) return null;

  const bill = data?.bill;
  const sessionPath = `/admin-dashboard/sessions/${sessionId}`;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/45 backdrop-blur-[1px]"
        aria-label="Закрити"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl shadow-gray-900/15"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Платіж (рахунок)
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Сесія #{sessionId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Закрити"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Завантаження…</p>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          ) : bill ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800/80">До сплати</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">
                  {bill.calculatedAmount.toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-lg font-semibold text-gray-500">грн</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">ID рахунку</span>
                  <span className="font-mono text-sm font-medium text-gray-800">#{bill.id}</span>
                  <StatusPill tone={payTone(bill.paymentStatus)}>{payStatusLabelUi(bill.paymentStatus)}</StatusPill>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Ціна кВт·год (на момент)
                  </dt>
                  <dd className="mt-1 tabular-nums text-gray-900">
                    {bill.pricePerKwhAtTime != null
                      ? `${bill.pricePerKwhAtTime.toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })} грн`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Спосіб оплати</dt>
                  <dd className="mt-1 text-gray-900">{bill.paymentMethod}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Оплачено</dt>
                  <dd className="mt-1 text-sm text-gray-900">{bill.paidAt ? fmtLong(bill.paidAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Рахунок створено
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{fmtLong(bill.createdAt)}</dd>
                </div>
              </dl>
            </div>
          ) : !data ? (
            <p className="text-sm text-gray-500">Дані сесії недоступні.</p>
          ) : data.status === 'failed' ? (
            <p className="text-sm text-slate-600">
              Для сесії зі статусом «Помилка» рахунок (bill) не створюється.
            </p>
          ) : data.status === 'active' ? (
            <p className="text-sm text-slate-600">Рахунок з’явиться після завершення сесії.</p>
          ) : (
            <p className="text-sm text-amber-900">
              Для цієї сесії рахунок (bill) ще не знайдено. Для завершених сесій очікується запис у БД.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={sessionPath}
              state={{ focusBill: true }}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Повна сесія
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
