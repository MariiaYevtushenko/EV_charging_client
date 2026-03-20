import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appInputCompactClass } from '../../components/station-admin/formStyles';

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

export default function GlobalPaymentsPage() {
  const { allPayments } = useGlobalAdmin();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...allPayments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!needle) return list;
    return list.filter(
      (p) =>
        p.userName.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.id.toLowerCase().includes(needle)
    );
  }, [allPayments, q]);

  const totalSuccess = useMemo(
    () => allPayments.filter((p) => p.status === 'success').reduce((a, p) => a + p.amount, 0),
    [allPayments]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Платежі</h1>
        <p className="mt-1 text-sm text-gray-500">
          Усі платежі з демо-профілів користувачів, відсортовані за датою.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні (сума)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
            {totalSuccess.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн
          </p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Записів</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{allPayments.length}</p>
        </AppCard>
        <AppCard className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Фільтр</p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Користувач, опис…"
            className={`mt-2 ${appInputCompactClass}`}
          />
        </AppCard>
      </div>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Користувач</th>
              <th className="px-4 py-3">Опис</th>
              <th className="px-4 py-3">Метод</th>
              <th className="px-4 py-3 text-right">Сума</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Дія</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p) => (
              <tr key={`${p.userId}-${p.id}`} className="bg-white hover:bg-gray-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(p.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.userName}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">{p.description}</td>
                <td className="px-4 py-3 text-gray-600">{p.method}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                  {p.amount.toLocaleString('uk-UA')} {p.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusPill>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin-dashboard/users/${p.userId}`}
                    className="font-semibold text-green-700 hover:text-green-800"
                  >
                    Користувач
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AppCard>
    </div>
  );
}
