import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';

export default function GlobalUserEditPage() {
  const { userId } = useParams<{ userId: string }>();
  const { getEndUser, replaceEndUser } = useGlobalAdmin();
  const base = userId ? getEndUser(userId) : undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (base) {
      setName(base.name);
      setEmail(base.email);
      setPhone(base.phone);
      setBalance(String(base.balance));
      setBlocked(!!base.blocked);
    }
  }, [base]);

  if (!base) {
    return <Navigate to="/admin-dashboard/users" replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(balance.replace(',', '.'));
    replaceEndUser({
      ...base,
      name: name.trim() || base.name,
      email: email.trim() || base.email,
      phone: phone.trim() || base.phone,
      balance: Number.isFinite(bal) ? bal : base.balance,
      blocked,
    });
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
          <div>
            <label htmlFor="gu-name" className="text-sm font-medium text-gray-700">
              Повне імʼя
            </label>
            <input
              id="gu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={appFormInputClass}
            />
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
          <div>
            <label htmlFor="gu-balance" className="text-sm font-medium text-gray-700">
              Баланс (грн)
            </label>
            <input
              id="gu-balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
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
              Збережено в пам&apos;яті застосунку  .
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <PrimaryButton type="submit">Зберегти</PrimaryButton>
            <OutlineButton
              type="button"
              onClick={() => {
                setName(base.name);
                setEmail(base.email);
                setPhone(base.phone);
                setBalance(String(base.balance));
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
