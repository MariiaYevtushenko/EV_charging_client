import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchAdminNetworkBookingDetail, type AdminBookingDetailDto } from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';

function bookingTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed':
    case 'paid':
      return 'success';
    case 'pending':
      return 'warn';
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
    case 'cancelled':
      return 'Скасовано';
    case 'paid':
      return 'Завершено';
    default:
      return s;
  }
}

function bookingTypeLabel(t: AdminBookingDetailDto['bookingType']) {
  return t === 'DEPOSIT' ? 'Депозит' : 'Розрахунок (calc)';
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

export default function GlobalBookingDetailPage() {
  const { pathname } = useLocation();
  const dashBase = pathname.startsWith('/station-dashboard') ? '/station-dashboard' : '/admin-dashboard';
  const showGlobalUserLinks = dashBase === '/admin-dashboard';
  const showSessionDetailLinks = dashBase === '/admin-dashboard';

  const { bookingId } = useParams<{ bookingId: string }>();
  const [data, setData] = useState<AdminBookingDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <AppCard className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Статус</p>
                <div className="mt-1">
                  <StatusPill tone={bookingTone(data.status)}>{bookingLabel(data.status)}</StatusPill>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Створено: {fmtLong(data.createdAt)}</p>
              </div>
            </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Станція</p>
                <p className="mt-1 font-medium text-slate-900">{data.stationName}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Порт №{data.portNumber} · {data.slotLabel}
                </p>
                <Link
                  to={`${dashBase}/stations/${encodeURIComponent(data.stationId)}`}
                  className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  Детальна інформація про станцію
                </Link>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Користувач</p>
                <p className="mt-1 font-medium text-slate-900">{data.userName}</p>
                {data.userEmail ? <p className="mt-1 text-sm text-gray-600">{data.userEmail}</p> : null}
                {data.userId && showGlobalUserLinks ? (
                  <Link
                    to={`/admin-dashboard/users/${data.userId}`}
                    className="mt-2 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
                  >
                    Профіль користувача
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Тип бронювання</p>
                <p className="mt-1 text-slate-900">{bookingTypeLabel(data.bookingType)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Передоплата</p>
                <p className="mt-1 tabular-nums text-slate-900">
                  {data.prepaymentAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  грн
                </p>
              </div>
            </div>

            {data.vehicle ? (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Авто</p>
                <p className="mt-1 text-slate-900">
                  {data.vehicle.model} · {data.vehicle.plate}
                </p>
              </div>
            ) : (
              <p className="border-t border-gray-100 pt-4 text-sm text-gray-500">Авто не прив’язано.</p>
            )}
          </AppCard>

          {(data.sessions ?? []).length > 0 ? (
            <AppCard className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900">Сесії зарядки за бронюванням</h2>
              <ul className="space-y-4">
                {(data.sessions ?? []).map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-mono text-xs text-gray-500">Сесія #{s.id}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={sessionTone(s.status)}>{sessionLabel(s.status)}</StatusPill>
                        {showSessionDetailLinks ? (
                          <Link
                            to={`${dashBase}/sessions/${s.id}`}
                            className="text-sm font-semibold text-green-700 hover:text-green-800"
                          >
                            Деталі сесії
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Початок</p>
                        <p className="mt-0.5 text-slate-900">{fmtLong(s.startedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Кінець</p>
                        <p className="mt-0.5 text-slate-900">
                          {s.endedAt ? fmtLong(s.endedAt) : '— (активна)'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія</p>
                        <p className="mt-0.5 tabular-nums text-slate-900">
                          {s.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сума (bill)</p>
                        <p className="mt-0.5 tabular-nums text-slate-900">
                          {s.cost != null
                            ? `${s.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Оплата</p>
                        <p className="mt-0.5 text-slate-900">
                          {s.paymentStatus ? (
                            <span className="inline-flex items-center gap-2">
                              <span>{payStatusLabel(s.paymentStatus)}</span>
                              {s.paymentMethod ? (
                                <span className="text-gray-600">· {s.paymentMethod}</span>
                              ) : null}
                            </span>
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Порт</p>
                        <p className="mt-0.5 text-gray-800">{s.portLabel}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </AppCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
