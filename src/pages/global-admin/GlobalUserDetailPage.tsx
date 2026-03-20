import { Link, Navigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, OutlineButton, StatusPill } from '../../components/station-admin/Primitives';

type UserTab = 'overview' | 'cars' | 'bookings' | 'payments' | 'charges';

const tabClass = (active: boolean) =>
  `relative shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
    active
      ? 'border-green-600 text-green-800'
      : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800'
  }`;

function bookingTone(s: string): 'success' | 'warn' | 'muted' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed':
    case 'completed':
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
    case 'completed':
      return 'Завершено';
    default:
      return s;
  }
}

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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function GlobalUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { getEndUser } = useGlobalAdmin();
  const user = userId ? getEndUser(userId) : undefined;
  const [tab, setTab] = useState<UserTab>('overview');

  if (!user) {
    return <Navigate to="/admin-dashboard/users" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin-dashboard/users"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку користувачів
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-600 text-xl font-bold text-white shadow-md">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>
                  {user.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{user.name}</h1>
                {user.blocked ? (
                  <StatusPill tone="danger">Заблоковано</StatusPill>
                ) : (
                  <StatusPill tone="success">Активний</StatusPill>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
              <p className="text-sm text-gray-500">{user.phone}</p>
              <p className="mt-2 text-xs text-gray-400">Реєстрація: {user.registeredAt}</p>
            </div>
          </div>
          <Link to={`/admin-dashboard/users/${user.id}/edit`}>
            <OutlineButton type="button">Редагувати дані</OutlineButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Баланс</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
            {user.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
          </p>
        </AppCard>
        <AppCard className="!p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Авто</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{user.cars.length}</p>
        </AppCard>
        <AppCard className="!p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Зарядки (записів)</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{user.charges.length}</p>
        </AppCard>
      </div>

      <nav
        className="-mx-1 flex gap-5 overflow-x-auto border-b border-gray-200 px-1"
        aria-label="Розділи користувача"
      >
        <button type="button" className={tabClass(tab === 'overview')} onClick={() => setTab('overview')}>
          Загалом
        </button>
        <button type="button" className={tabClass(tab === 'cars')} onClick={() => setTab('cars')}>
          Авто ({user.cars.length})
        </button>
        <button type="button" className={tabClass(tab === 'bookings')} onClick={() => setTab('bookings')}>
          Бронювання ({user.bookings.length})
        </button>
        <button type="button" className={tabClass(tab === 'payments')} onClick={() => setTab('payments')}>
          Платежі ({user.payments.length})
        </button>
        <button type="button" className={tabClass(tab === 'charges')} onClick={() => setTab('charges')}>
          Зарядки ({user.charges.length})
        </button>
      </nav>

      {tab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AppCard className="space-y-2 text-sm text-gray-600">
            <h2 className="text-sm font-semibold text-gray-900">Контакти</h2>
            <p>
              Email: <span className="font-medium text-gray-900">{user.email}</span>
            </p>
            <p>
              Телефон: <span className="font-medium text-gray-900">{user.phone}</span>
            </p>
            <p className="text-xs text-gray-500">
              Повна історія — у вкладках «Бронювання», «Платежі» та «Зарядки».
            </p>
          </AppCard>
          <AppCard className="space-y-2 text-sm text-gray-600">
            <h2 className="text-sm font-semibold text-gray-900">Короткий огляд</h2>
            <p>Останній платіж: {user.payments[0] ? fmt(user.payments[0].createdAt) : '—'}</p>
            <p>Остання зарядка: {user.charges[0] ? user.charges[0].stationName : '—'}</p>
            <p>Активні бронювання: {user.bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length}</p>
          </AppCard>
        </div>
      ) : null}

      {tab === 'cars' ? (
        <AppCard className="space-y-3">
          {user.cars.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3">
              <p className="font-semibold text-gray-900">{c.model}</p>
              <p className="text-sm text-gray-600">
                {c.plate} · {c.connector}
              </p>
            </div>
          ))}
          {user.cars.length === 0 ? <p className="text-sm text-gray-500">Немає збережених авто.</p> : null}
        </AppCard>
      ) : null}

      {tab === 'bookings' ? (
        <AppCard className="space-y-3">
          {user.bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{b.stationName}</p>
                <p className="text-xs text-gray-500">{b.slotLabel}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {fmt(b.start)} — {fmt(b.end)}
                </p>
              </div>
              <StatusPill tone={bookingTone(b.status)}>{bookingLabel(b.status)}</StatusPill>
            </div>
          ))}
          {user.bookings.length === 0 ? <p className="text-sm text-gray-500">Бронювань немає.</p> : null}
        </AppCard>
      ) : null}

      {tab === 'payments' ? (
        <AppCard className="space-y-3">
          {user.payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{p.description}</p>
                <p className="text-xs text-gray-500">
                  {fmt(p.createdAt)} · {p.method}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold tabular-nums text-gray-900">
                  {p.amount.toLocaleString('uk-UA')} {p.currency}
                </p>
                <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
              </div>
            </div>
          ))}
          {user.payments.length === 0 ? <p className="text-sm text-gray-500">Платежів немає.</p> : null}
        </AppCard>
      ) : null}

      {tab === 'charges' ? (
        <AppCard className="space-y-3">
          {user.charges.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-gray-100 bg-gray-50/90 px-4 py-3 sm:flex sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{c.stationName}</p>
                <p className="text-xs text-gray-500">
                  {c.portLabel} · {fmt(c.startedAt)} · {c.durationMin} хв
                </p>
              </div>
              <div className="mt-2 text-right sm:mt-0">
                <p className="text-sm font-bold text-gray-900">{c.kwh} кВт·год</p>
                <p className="text-xs font-semibold text-green-700">{c.cost.toLocaleString('uk-UA')} грн</p>
              </div>
            </div>
          ))}
          {user.charges.length === 0 ? <p className="text-sm text-gray-500">Історії зарядок немає.</p> : null}
        </AppCard>
      ) : null}
    </div>
  );
}
