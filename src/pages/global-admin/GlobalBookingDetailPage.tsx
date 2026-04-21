import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  fetchAdminNetworkBookingDetail,
  postAdminNetworkBookingCancel,
  type AdminBookingDetailDto,
} from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import { FloatingToast, FloatingToastRegion } from '../../components/admin/FloatingToast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { useAuth } from '../../context/AuthContext';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';

function bookingTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed':
    case 'paid':
      return 'success';
    case 'pending':
      return 'warn';
    case 'missed':
      return 'info';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

function bookingLabel(s: string) {
  switch (s) {
    case 'confirmed':
      return 'Підтверджено';
    case 'pending':
      return 'Очікує';
    case 'missed':
      return 'Пропущено';
    case 'cancelled':
      return 'Скасовано';
    case 'paid':
      return 'Завершено';
    default:
      return s;
  }
}

/** Відображення типу бронювання в картці деталей. */
function bookingTypeDisplay(t: AdminBookingDetailDto['bookingType']) {
  return t === 'DEPOSIT' ? 'Передплата' : 'Динамічна ціна';
}

/** Підпис до суми (узгоджено з типом). */
function prepaymentAmountLabel(t: AdminBookingDetailDto['bookingType']) {
  return t === 'DEPOSIT' ? 'Передоплата' : 'Динамічна ціна';
}

function formatPrepaymentValue(amount: number, bookingType: AdminBookingDetailDto['bookingType']) {
  if (bookingType === 'CALC') {
    return `${amount.toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })} кВт·год`;
  }
  return `${amount.toLocaleString('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} грн`;
}

function sessionTone(s: AdminBookingDetailDto['sessions'][number]['status']): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
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

function sessionLabel(s: AdminBookingDetailDto['sessions'][number]['status']) {
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

function payStatusLabel(s: NonNullable<AdminBookingDetailDto['sessions'][number]['paymentStatus']>) {
  switch (s) {
    case 'success':
      return 'Оплачено';
    case 'pending':
      return 'Очікує оплати';
    case 'failed':
      return 'Помилка оплати';
    default:
      return s;
  }
}

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

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Іконка скасування бронювання (адмін станції), правий верхній кут картки. */
function CancelBookingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default function GlobalBookingDetailPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const dashBase = pathname.startsWith('/station-dashboard') ? '/station-dashboard' : '/admin-dashboard';
  const showGlobalUserLinks = dashBase === '/admin-dashboard';
  const showSessionDetailLinks = dashBase === '/admin-dashboard';
  const isStationAdminContext = user?.role === 'STATION_ADMIN' && pathname.startsWith('/station-dashboard');

  const { bookingId } = useParams<{ bookingId: string }>();
  const [data, setData] = useState<AdminBookingDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelToast, setCancelToast] = useState<string | null>(null);
  const cancelToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    void fetchAdminNetworkBookingDetail(bookingId)
      .then(setData)
      .catch((e: unknown) => {
        setData(null);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити бронювання');
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!cancelToast) return;
    if (cancelToastTimerRef.current) clearTimeout(cancelToastTimerRef.current);
    cancelToastTimerRef.current = window.setTimeout(() => {
      setCancelToast(null);
      cancelToastTimerRef.current = null;
    }, 5000);
    return () => {
      if (cancelToastTimerRef.current) clearTimeout(cancelToastTimerRef.current);
    };
  }, [cancelToast]);

  const hasActiveSession = Boolean(data?.sessions?.some((s) => s.status === 'active'));
  const canShowCancelControl =
    isStationAdminContext &&
    data != null &&
    data.status === 'pending' &&
    !hasActiveSession;

  const handleConfirmCancel = useCallback(async () => {
    if (!bookingId) return;
    setCancelBusy(true);
    try {
      setError(null);
      const updated = await postAdminNetworkBookingCancel(bookingId);
      setData(updated);
      setCancelDialogOpen(false);
      setCancelToast('Бронювання скасовано');
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Не вдалося скасувати бронювання');
      setCancelDialogOpen(false);
    } finally {
      setCancelBusy(false);
    }
  }, [bookingId]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`${dashBase}/bookings`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
        >
          <BackArrowIcon className="h-5 w-5" />
          Назад до списку бронювань
        </Link>
        <h1 className={`mt-4 ${globalAdminPageTitle}`}>Бронювання #{bookingId}</h1>
      </div>

      {loading ? <p className="text-sm text-gray-500">Завантаження…</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {!loading && data ? (
        <div className="space-y-4">
          <AppCard className="relative space-y-4">
            {canShowCancelControl ? (
              <button
                type="button"
                onClick={() => setCancelDialogOpen(true)}
                className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 sm:right-4 sm:top-4"
                title="Скасувати бронювання"
                aria-label="Скасувати бронювання"
              >
                <CancelBookingIcon className="h-5 w-5" />
              </button>
            ) : null}

            <div
              className={`flex flex-wrap items-start justify-between gap-3 ${
                canShowCancelControl ? 'pr-12 sm:pr-14' : ''
              }`}
            >
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Статус:</span>
                <StatusPill tone={bookingTone(data.status)}>{bookingLabel(data.status)}</StatusPill>
              </p>
              <p className="text-sm text-gray-500">Створено: {fmtLong(data.createdAt)}</p>
            </div>

            {isStationAdminContext && data.status === 'pending' && hasActiveSession ? (
              <p
                className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900"
                title="Спочатку завершіть активну сесію"
              >
                Щоб скасувати бронювання, спочатку завершіть активну сесію зарядки.
              </p>
            ) : null}

            <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Початок</p>
                <p className="mt-1 font-medium text-slate-900">{fmtLong(data.start)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Кінець</p>
                <p className="mt-1 font-medium text-slate-900">{fmtLong(data.end)}</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станція</p>
                <p className="mt-1 font-medium text-slate-900">{data.stationName}</p>
                <p className="mt-1 text-sm text-gray-600">Порт №{data.portNumber}</p>
                <Link
                  to={`${dashBase}/stations/${encodeURIComponent(data.stationId)}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  Детальна інформація про станцію
                  <ChevronRightIcon className="h-4 w-4 shrink-0" />
                </Link>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Користувач</p>
                  <p className="mt-1 font-medium text-slate-900">{data.userName}</p>
                  {data.userEmail ? <p className="mt-1 text-sm text-gray-600">{data.userEmail}</p> : null}
                  {data.userId && showGlobalUserLinks ? (
                    <Link
                      to={`/admin-dashboard/users/${data.userId}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
                    >
                      Профіль користувача
                      <ChevronRightIcon className="h-4 w-4 shrink-0" />
                    </Link>
                  ) : null}
                </div>
                {data.vehicle ? (
                  <div className="border-t border-gray-100 pt-4 sm:border-t-0 sm:pt-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Авто</p>
                    <p className="mt-1 font-medium text-slate-900">{data.vehicle.model}</p>
                    <p className="mt-1 text-sm tabular-nums text-gray-700">{data.vehicle.plate}</p>
                  </div>
                ) : (
                  <p className="border-t border-gray-100 pt-4 text-sm text-gray-500 sm:border-t-0 sm:pt-0">
                    Авто не прив’язано.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Тип бронювання</p>
                <p className="mt-1 text-slate-900">{bookingTypeDisplay(data.bookingType)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {prepaymentAmountLabel(data.bookingType)}
                </p>
                <p className="mt-1 tabular-nums text-slate-900">
                  {formatPrepaymentValue(data.prepaymentAmount, data.bookingType)}
                </p>
              </div>
            </div>
          </AppCard>

       
        </div>
      ) : null}

      <ConfirmDialog
        open={cancelDialogOpen}
        title="Скасувати бронювання?"
        description="Ви дійсно хочете скасувати це бронювання? Дію не можна буде скасувати."
        confirmLabel="Так, скасувати"
        cancelLabel="Ні"
        variant="danger"
        busy={cancelBusy}
        onClose={() => !cancelBusy && setCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
      />

      <FloatingToastRegion live="assertive">
        <FloatingToast show={Boolean(cancelToast)} tone="success" onDismiss={() => setCancelToast(null)}>
          {cancelToast}
        </FloatingToast>
      </FloatingToastRegion>
    </div>
  );
}
