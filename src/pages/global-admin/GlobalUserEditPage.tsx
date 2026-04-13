import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { fetchAdminUserDetail } from '../../api/adminUsers';
import type { EndUser } from '../../types/globalAdmin';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';

function splitDisplayName(full: string): { firstName: string; surname: string } {
  const t = full.trim();
  if (!t) return { firstName: '', surname: '' };
  const i = t.indexOf(' ');
  if (i === -1) return { firstName: t, surname: '' };
  return { firstName: t.slice(0, i).trim(), surname: t.slice(i + 1).trim() };
}

function joinDisplayName(firstName: string, surname: string): string {
  return [firstName.trim(), surname.trim()].filter(Boolean).join(' ');
}

export default function GlobalUserEditPage() {
  const { userId } = useParams<{ userId: string }>();
  const { replaceEndUser } = useGlobalAdmin();

  const [base, setBase] = useState<EndUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [saved, setSaved] = useState(false);

  const idNum = userId ? Number(userId) : NaN;
  const invalidId = !Number.isFinite(idNum) || idNum < 1;

  useEffect(() => {
    if (invalidId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchAdminUserDetail(idNum)
      .then((u) => {
        if (cancelled) return;
        setBase(u);
        replaceEndUser(u);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Не вдалося завантажити користувача';
        setLoadError(msg);
        setBase(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idNum, invalidId, replaceEndUser]);

  useEffect(() => {
    if (!base) return;
    const { firstName: fn, surname: sn } = splitDisplayName(base.name);
    setFirstName(fn);
    setSurname(sn);
    setEmail(base.email);
    setPhone(base.phone);
    setBlocked(!!base.blocked);
  }, [base]);

  if (invalidId) {
    return <Navigate to="/admin-dashboard/users" replace />;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <p className="text-sm text-gray-500">Завантаження даних…</p>
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (loadError || !base) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link
          to="/admin-dashboard/users"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До списку користувачів
        </Link>
        <AppCard className="border-red-100 bg-red-50/80 !p-5">
          <p className="font-medium text-red-900">Не вдалося відкрити редагування</p>
          <p className="mt-1 text-sm text-red-800/90">{loadError ?? 'Користувача не знайдено.'}</p>
        </AppCard>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fullName = joinDisplayName(firstName, surname) || base.name;
    const next: EndUser = {
      ...base,
      name: fullName,
      email: email.trim() || base.email,
      phone: phone.trim() || base.phone,
      blocked,
    };
    replaceEndUser(next);
    setBase(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          to={`/admin-dashboard/users/${base.id}`}
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          ← До картки користувача
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Редагування</h1>
        <p className="mt-1 text-sm text-gray-500">{base.name}</p>
      </div>

      <AppCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gu-first-name" className="text-sm font-medium text-gray-700">
                Імʼя
              </label>
              <input
                id="gu-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={appFormInputClass}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="gu-surname" className="text-sm font-medium text-gray-700">
                Прізвище
              </label>
              <input
                id="gu-surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className={appFormInputClass}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label htmlFor="gu-email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="gu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={appFormInputClass}
            />
          </div>
          <div>
            <label htmlFor="gu-phone" className="text-sm font-medium text-gray-700">
              Телефон
            </label>
            <input
              id="gu-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={appFormInputClass}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Заблокувати користувача
          </label>

          {saved ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
              Збережено в пам&apos;яті застосунку.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <PrimaryButton type="submit">Зберегти</PrimaryButton>
            <OutlineButton
              type="button"
              onClick={() => {
                const { firstName: fn, surname: sn } = splitDisplayName(base.name);
                setFirstName(fn);
                setSurname(sn);
                setEmail(base.email);
                setPhone(base.phone);
                setBlocked(!!base.blocked);
              }}
            >
              Скинути
            </OutlineButton>
          </div>
        </form>
      </AppCard>
    </div>
  );
}
