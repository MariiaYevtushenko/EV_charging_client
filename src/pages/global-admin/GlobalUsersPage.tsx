import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import {
  appInputClass,
  appPrimaryCtaSmClass,
  appSecondaryCtaSmClass,
} from '../../components/station-admin/formStyles';

export default function GlobalUsersPage() {
  const { endUsers } = useGlobalAdmin();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...endUsers].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    if (!needle) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        u.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, ''))
    );
  }, [endUsers, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Користувачі</h1>
        <p className="mt-1 text-sm text-gray-500">
          Демо-дані в пам&apos;яті браузера. Картка користувача — бронювання, авто, платежі та зарядки.
        </p>
      </div>

      <AppCard className="!p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Імʼя, email або телефон…"
          className={`${appInputClass} bg-white/90`}
        />
      </AppCard>

      <div className="space-y-3">
        {rows.map((u) => (
          <AppCard key={u.id} className="!p-4 transition hover:border-green-200/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-600 text-lg font-bold text-white shadow-md">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden>
                      {u.name
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
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    {u.blocked ? (
                      <StatusPill tone="danger">Заблоковано</StatusPill>
                    ) : (
                      <StatusPill tone="success">Активний</StatusPill>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400">{u.phone}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Баланс</p>
                  <p className="text-sm font-bold tabular-nums text-gray-900">
                    {u.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin-dashboard/users/${u.id}`} className={appSecondaryCtaSmClass}>
                    Картка
                  </Link>
                  <Link to={`/admin-dashboard/users/${u.id}/edit`} className={appPrimaryCtaSmClass}>
                    Редагувати
                  </Link>
                </div>
              </div>
            </div>
          </AppCard>
        ))}
        {rows.length === 0 ? (
          <AppCard className="py-10 text-center text-sm text-gray-500">Нікого не знайдено.</AppCard>
        ) : null}
      </div>
    </div>
  );
}
