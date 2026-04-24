import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppCard, OutlineButton, PrimaryButton } from '../station-admin/Primitives';
import { appFormInputClass, appFormInputErrorModifier } from '../station-admin/formStyles';
import { fetchUserProfile, updateUserProfile } from '../../api/authApi';
import {
  hasProfileErrors,
  validateSplitProfile,
  type ProfileFieldErrors,
} from '../../lib/profileValidation';
import { ApiError } from '../../api/http';

type ProfileBaseline = {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
};

function phoneFromDto(phoneNumber: string): string {
  return phoneNumber === '-' ? '' : phoneNumber;
}

export type EditableAccountProfileProps = {
  roleLabel: string;
  fallbackDisplayName: string;
  formIdPrefix: string;
  className?: string;
};

export default function EditableAccountProfile({
  roleLabel,
  fallbackDisplayName,
  formIdPrefix,
  className = 'mx-auto max-w-xl space-y-6',
}: EditableAccountProfileProps) {
  const { user, replaceUser, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [baseline, setBaseline] = useState<ProfileBaseline | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const id = user?.id;
    if (!id) {
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    const loadProfile = async () => {
      try {
        const [, dto] = await Promise.all([refreshUser(), fetchUserProfile(Number(id))]);
        if (cancelled || !dto) return;
        const p = phoneFromDto(dto.phoneNumber);
        const row: ProfileBaseline = {
          firstName: dto.name,
          surname: dto.surname,
          email: dto.email,
          phone: p,
        };
        setFirstName(row.firstName);
        setSurname(row.surname);
        setEmail(row.email);
        setPhone(row.phone);
        setBaseline(row);
      } catch {
        if (!cancelled) setProfileError('Не вдалося завантажити профіль з сервера');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshUser]);

  const applyBaseline = () => {
    if (!baseline) return;
    setFirstName(baseline.firstName);
    setSurname(baseline.surname);
    setEmail(baseline.email);
    setPhone(baseline.phone);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) 
      return;

    setSaveError(null);

    const validate = validateSplitProfile(firstName, surname, email, phone);
    setFieldErrors(validate);

    if (hasProfileErrors(validate)) 
      return;

    setSavingProfile(true);
    
    try {
      const updated = await updateUserProfile(Number(user.id), {
        name: firstName.trim() || 'Користувач',
        surname: surname.trim() || '-',
        email: email.trim(),
        phoneNumber: phone.trim() || '-',
      });
      replaceUser(updated);
      const p = phone.trim();
      const nextBaseline: ProfileBaseline = {
        firstName: firstName.trim() || 'Користувач',
        surname: surname.trim() || '-',
        email: email.trim(),
        phone: p,
      };
      setBaseline(nextBaseline);
      setFirstName(nextBaseline.firstName);
      setSurname(nextBaseline.surname);
      setEmail(nextBaseline.email);
      setPhone(nextBaseline.phone);
      setEditing(false);
      setFieldErrors({});
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

  const handleCancel = () => {
    applyBaseline();
    setSaveError(null);
    setFieldErrors({});
    setEditing(false);
  };

  const displayFullName = `${firstName} ${surname}`.trim() || user?.name || fallbackDisplayName;

  const initials =
    [firstName, surname]
      .map((w) => w.trim()[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    (user?.name ?? '')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    '?';

  const readOnlyClass = 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900';
  const fid = (suffix: string) => `${formIdPrefix}-${suffix}`;

  return (
    <div className={className}>
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
            <p className="font-semibold text-gray-900">{displayFullName}</p>
            <p className="mt-1 text-xs font-medium text-green-800">
              Роль: {roleLabel}
            </p>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Ім&apos;я</p>
              <p className={readOnlyClass}>{firstName || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Прізвище</p>
              <p className={readOnlyClass}>{surname || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className={readOnlyClass}>{email || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Телефон</p>
              <p className={readOnlyClass}>{phone || '—'}</p>
            </div>
            <div className="border-t border-gray-100 pt-6">
              <PrimaryButton
                type="button"
                disabled={!user || profileLoading}
                onClick={() => {
                  setFieldErrors({});
                  setSaveError(null);
                  setEditing(true);
                }}
              >
                Редагувати
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div>
              <label htmlFor={fid('firstname')} className="text-sm font-medium text-gray-700">
                Ім&apos;я
              </label>
              <input
                id={fid('firstname')}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setFieldErrors((p) => {
                    if (!p.firstName) return p;
                    const { firstName: _a, ...rest } = p;
                    return rest;
                  });
                }}
                className={`${appFormInputClass} ${fieldErrors.firstName ? appFormInputErrorModifier : ''}`}
                autoComplete="given-name"
                aria-invalid={fieldErrors.firstName ? true : undefined}
              />
              {fieldErrors.firstName ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor={fid('surname')} className="text-sm font-medium text-gray-700">
                Прізвище
              </label>
              <input
                id={fid('surname')}
                value={surname}
                onChange={(e) => {
                  setSurname(e.target.value);
                  setFieldErrors((p) => {
                    if (!p.surname) return p;
                    const { surname: _a, ...rest } = p;
                    return rest;
                  });
                }}
                className={`${appFormInputClass} ${fieldErrors.surname ? appFormInputErrorModifier : ''}`}
                autoComplete="family-name"
                aria-invalid={fieldErrors.surname ? true : undefined}
              />
              {fieldErrors.surname ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.surname}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor={fid('email')} className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id={fid('email')}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((p) => {
                    if (!p.email) return p;
                    const { email: _a, ...rest } = p;
                    return rest;
                  });
                }}
                className={`${appFormInputClass} ${fieldErrors.email ? appFormInputErrorModifier : ''}`}
                autoComplete="email"
                aria-invalid={fieldErrors.email ? true : undefined}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor={fid('phone')} className="text-sm font-medium text-gray-700">
                Телефон
              </label>
              <input
                id={fid('phone')}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFieldErrors((p) => {
                    if (!p.phone) return p;
                    const { phone: _a, ...rest } = p;
                    return rest;
                  });
                }}
                className={`${appFormInputClass} ${fieldErrors.phone ? appFormInputErrorModifier : ''}`}
                autoComplete="tel"
                aria-invalid={fieldErrors.phone ? true : undefined}
              />
              {fieldErrors.phone ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              ) : null}
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
              <OutlineButton type="button" disabled={savingProfile} onClick={handleCancel}>
                Скасувати
              </OutlineButton>
            </div>
          </form>
        )}
      </AppCard>
    </div>
  );
}
