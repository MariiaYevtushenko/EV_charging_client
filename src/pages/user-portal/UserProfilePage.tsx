import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function UserProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('+380 67 000 00 00');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateProfile({ name: name.trim() || user?.name, email: email.trim() || user?.email, avatarUrl });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const initials =
    (user?.name ?? name)
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      setAvatarError('Оберіть файл зображення.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Файл завеликий (макс. 2 МБ для демо).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (!url) {
        setAvatarError('Не вдалося прочитати файл.');
        return;
      }
      setAvatarUrl(url);
      updateProfile({ avatarUrl: url });
    };
    reader.onerror = () => setAvatarError('Помилка читання файлу.');
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setAvatarError(null);
    setAvatarUrl(undefined);
    updateProfile({ avatarUrl: undefined });
  };

  const balanceText =
    user?.balance !== undefined
      ? `${user.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`
      : '—';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Профіль</h1>
        <p className="mt-1 text-sm text-gray-500">
          Особисті дані та фото. Зміни зберігаються в сесії браузера (демо).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        <AppCard>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-2xl font-bold text-white shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{user?.name ?? 'Користувач'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="mt-1 text-xs font-medium text-green-700">Роль: користувач</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPickPhoto}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <OutlineButton type="button" className="!text-xs" onClick={() => fileInputRef.current?.click()}>
                  Завантажити фото
                </OutlineButton>
                {avatarUrl ? (
                  <OutlineButton type="button" className="!text-xs" onClick={removePhoto}>
                    Прибрати фото
                  </OutlineButton>
                ) : null}
              </div>
              {avatarError ? <p className="mt-2 text-xs text-amber-800">{avatarError}</p> : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="up-name" className="text-sm font-medium text-gray-700">
                Повне ім&apos;я
              </label>
              <input
                id="up-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20"
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
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20"
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
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20"
              />
            </div>

            {saved ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
                Зміни збережено локально (демо).
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <PrimaryButton type="submit">Зберегти</PrimaryButton>
              <OutlineButton
                type="button"
                onClick={() => {
                  setName(user?.name ?? '');
                  setEmail(user?.email ?? '');
                  setAvatarUrl(user?.avatarUrl);
                  setAvatarError(null);
                }}
              >
                Скинути
              </OutlineButton>
            </div>
          </form>
        </AppCard>

        <aside className="lg:sticky lg:top-24">
          <AppCard className="!p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Поточний баланс</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-green-700">{balanceText}</p>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Демо-рахунок у застосунку. Поповнення відображається в розділі «Платежі».
            </p>
          </AppCard>
        </aside>
      </div>
    </div>
  );
}
