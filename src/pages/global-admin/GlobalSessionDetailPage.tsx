import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAdminNetworkSessionDetail, type AdminSessionDetailDto } from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';

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

function sessionLabel(s: AdminSessionDetailDto['status']) {
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

function bookingStatusLabel(s: string) {
  switch (s) {
    case 'confirmed':
      return 'Підтверджено';
    case 'pending':
      return 'Очікує';
    case 'cancelled':
      return 'Скасовано';
    case 'completed':
      return 'Завершено';
    default:
      return s;
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

export default function GlobalSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<AdminSessionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    void fetchAdminNetworkSessionDetail(sessionId)
      .then(setData)
      .catch((e: unknown) => {
        setData(null);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити сесію');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const booking = data?.booking;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin-dashboard/sessions"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
        >
          <BackArrowIcon className="h-5 w-5" />
          Назад до списку сесій
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Сесія #{sessionId}</h1>
      </div>

      {loading ? <p className="text-sm text-gray-500">Завантаження…</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {!loading && data ? (
        <div className="space-y-4">
          <AppCard className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Статус сесії</p>
                <div className="mt-1">
                  <StatusPill tone={sessionTone(data.status)}>{sessionLabel(data.status)}</StatusPill>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Початок</p>
                <p className="mt-1 font-medium text-gray-900">{fmtLong(data.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Кінець</p>
                <p className="mt-1 font-medium text-gray-900">
                  {data.endedAt ? fmtLong(data.endedAt) : '— (активна)'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія</p>
                <p className="mt-1 tabular-nums text-gray-900">
                  {data.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Порт</p>
                <p className="mt-1 text-gray-900">{data.portLabel}</p>
                <Link
                  to={`/admin-dashboard/stations/${data.stationId}`}
                  className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  Картка станції
                </Link>
              </div>
            </div>

            <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Користувач</p>
                <p className="mt-1 font-medium text-gray-900">{data.userName}</p>
                {data.userEmail ? <p className="mt-1 text-sm text-gray-600">{data.userEmail}</p> : null}
                {data.userId ? (
                  <Link
                    to={`/admin-dashboard/users/${data.userId}`}
                    className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
                  >
                    Профіль користувача
                  </Link>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Авто</p>
                {data.vehicle ? (
                  <p className="mt-1 text-gray-900">
                    {data.vehicle.model} · {data.vehicle.plate}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">Не вказано</p>
                )}
              </div>
            </div>
          </AppCard>

          {booking ? (
            <AppCard className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900">Пов’язане бронювання</h2>
              <p className="text-sm text-gray-600">
                Статус:{' '}
                <span className="font-medium text-gray-900">{bookingStatusLabel(booking.status)}</span>
              </p>
              <p className="text-sm text-gray-600">
                Вікно бронювання: {fmtLong(booking.start)} — {fmtLong(booking.end)}
              </p>
              <Link
                to={`/admin-dashboard/bookings/${booking.id}`}
                className="inline-block text-sm font-semibold text-green-700 hover:text-green-800"
              >
                Відкрити бронювання #{booking.id}
              </Link>
            </AppCard>
          ) : (
            <AppCard>
              <p className="text-sm text-gray-500">Сесія без прив’язки до бронювання (walk-in / інше).</p>
            </AppCard>
          )}

          <AppCard className="space-y-4 border border-sky-100 bg-sky-50/40">
            <h2 className="text-base font-semibold text-gray-900">Рахунок (bill)</h2>
            {data.bill ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Сума</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
                    {data.bill.calculatedAmount.toLocaleString('uk-UA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    грн
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ціна кВт·год (на момент)</p>
                  <p className="mt-1 tabular-nums text-gray-900">
                    {data.bill.pricePerKwhAtTime != null
                      ? `${data.bill.pricePerKwhAtTime.toLocaleString('uk-UA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })} грн`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Спосіб оплати</p>
                  <p className="mt-1 text-gray-900">{data.bill.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Статус оплати</p>
                  <p className="mt-1 text-gray-900">{payStatusLabelUi(data.bill.paymentStatus)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Оплачено</p>
                  <p className="mt-1 text-gray-900">
                    {data.bill.paidAt ? fmtLong(data.bill.paidAt) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Рахунок створено</p>
                  <p className="mt-1 text-gray-900">{fmtLong(data.bill.createdAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-900">
                Рахунок ще не сформовано (bill відсутній). Для завершених сесій зазвичай очікується запис у{' '}
                <code className="rounded bg-white px-1">bill</code>.
              </p>
            )}
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
