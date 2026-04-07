import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';
import {
  changeUserPassword,
  splitFullName,
  updateUserProfile,
} from '../../api/authApi';
import { ApiError } from '../../api/http';

export default function UserProfilePage() {
  const { user, replaceUser, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
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
        /** Порожній телефон у БД недопустимий — ставимо плейсхолдер. */
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

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setPwdError(null);
    if (newPassword.length < 6) {
      setPwdError('Новий пароль має містити щонайменше 6 символів.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Нові паролі не збігаються.');
      return;
    }
    setPwdSubmitting(true);
    try {
      await changeUserPassword(Number(user.id), {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdSaved(true);
      window.setTimeout(() => setPwdSaved(false), 2800);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не вдалося змінити пароль';
      setPwdError(msg);
    } finally {
      setPwdSubmitting(false);
    }
  };

  const initials =
    (user?.name ?? name)
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const balanceText =
    user?.balance !== undefined
      ? `${user.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`
      : '—';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Профіль</h1>
      </div>

      {profileLoading ? (
        <p className="text-sm text-gray-500">Завантаження профілю…</p>
      ) : null}
      {profileError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {profileError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="space-y-6">
          <AppCard>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-600 text-2xl font-bold text-white shadow-md">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{user?.name ?? 'Користувач'}</p>
               
                <p className="mt-1 text-xs font-medium text-green-700">Роль: Користувач</p>
              </div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label htmlFor="up-name" className="text-sm font-medium text-gray-700">
                  Повне ім&apos;я
                </label>
                <input
                  id="up-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={appFormInputClass}
                  autoComplete="name"
                />
               
              </div>
              <div>
                <label htmlFor="up-email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="up-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={appFormInputClass}
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="up-phone" className="text-sm font-medium text-gray-700">
                  Телефон
                </label>
                <input
                  id="up-phone"
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

          <AppCard>
            <h2 className="text-sm font-semibold text-gray-900">Зміна пароля</h2>
            <p className="mt-1 text-xs text-gray-500">
              Введіть поточний пароль і новий (мінімум 6 символів).
            </p>
            <form onSubmit={(e) => void handlePasswordSubmit(e)} className="mt-4 space-y-4">
              <div>
                <label htmlFor="up-cur-pwd" className="text-sm font-medium text-gray-700">
                  Поточний пароль
                </label>
                <input
                  id="up-cur-pwd"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={appFormInputClass}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="up-new-pwd" className="text-sm font-medium text-gray-700">
                  Новий пароль
                </label>
                <input
                  id="up-new-pwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={appFormInputClass}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="up-confirm-pwd" className="text-sm font-medium text-gray-700">
                  Підтвердження нового пароля
                </label>
                <input
                  id="up-confirm-pwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={appFormInputClass}
                  autoComplete="new-password"
                />
              </div>
              {pwdError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {pwdError}
                </p>
              ) : null}
              {pwdSaved ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
                  Пароль оновлено. Наступного разу входьте вже з новим паролем.
                </p>
              ) : null}
              <PrimaryButton type="submit" disabled={pwdSubmitting || !user}>
                {pwdSubmitting ? 'Зміна…' : 'Змінити пароль'}
              </PrimaryButton>
            </form>
          </AppCard>
        </div>

        
      </div>
    </div>
  );
}
