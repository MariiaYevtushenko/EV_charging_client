import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';
import { splitFullName, updateUserProfile } from '../../api/authApi';
import { ApiError } from '../../api/http';

export default function GlobalAdminProfilePage() {
  const { user, replaceUser, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    void refreshUser()
      .catch(() => {
        if (!cancelled) setProfileError('Не вдалося завантажити профіль з сервера.');
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? '');
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaveError(null);
    setSavingProfile(true);
    try {
      const { name: n, surname: s } = splitFullName(name);
      const updated = await updateUserProfile(Number(user.id), {
        name: n,
        surname: s,
        email: email.trim(),
        phoneNumber: phone.trim() || '-',
      });
      replaceUser(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2800);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не вдалося зберегти';
      setSaveError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const initials =
    (user?.name ?? name)
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Профіль</h1>
        <p className="mt-1 text-sm text-gray-500">
          Дані зберігаються в базі (таблиця ev_user).
        </p>
      </div>

      {profileLoading ? (
        <p className="text-sm text-gray-500">Завантаження профілю…</p>
      ) : null}
      {profileError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {profileError}
        </p>
      ) : null}

      <AppCard>
       
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-700 text-2xl font-bold text-white shadow-md">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{user?.name ?? 'Адміністратор'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.phone ? <p className="text-sm text-gray-500">{user.phone}</p> : null}
            <p className="mt-1 text-xs font-medium text-green-800">Роль: Адміністратор</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="ga-name" className="text-sm font-medium text-gray-700">
              Повне ім&apos;я
            </label>
            <input
              id="ga-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={appFormInputClass}
              autoComplete="name"
            />
           
          </div>
          <div>
            <label htmlFor="ga-email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="ga-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={appFormInputClass}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="ga-phone" className="text-sm font-medium text-gray-700">
              Телефон
            </label>
            <input
              id="ga-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={appFormInputClass}
              autoComplete="tel"
            />
          </div>

          {saveError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {saveError}
            </p>
          ) : null}
          {saved ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
              Зміни збережено
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <PrimaryButton type="submit" disabled={savingProfile || !user}>
              {savingProfile ? 'Збереження…' : 'Зберегти'}
            </PrimaryButton>
            <OutlineButton
              type="button"
              disabled={!user}
              onClick={() => {
                setName(user?.name ?? '');
                setEmail(user?.email ?? '');
                setPhone(user?.phone ?? '');
                setSaveError(null);
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
