import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { DEMO_PASSWORD, findDemoAccount } from '../../data/demoAccounts';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const key = email.trim().toLowerCase();
    const demo = findDemoAccount(key);

    if (!demo || password !== DEMO_PASSWORD) {
      setError('Невірний email або пароль. Для демо використовуйте акаунти нижче та пароль: password');
      return;
    }

    login({
      id: demo.id,
      name: demo.name,
      email: key,
      role: demo.role,
      ...(demo.balance !== undefined ? { balance: demo.balance } : {}),
    });

    if (demo.role === 'GLOBAL_ADMIN') {
      navigate('/admin-dashboard');
    } else if (demo.role === 'STATION_ADMIN') {
      navigate('/station-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-green-300/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-200/15 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_64px_-12px_rgba(5,80,60,0.22)] ring-1 ring-emerald-100/60 backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md shadow-green-600/30">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Вітаємо знову!</h1>
          <p className="mt-1 text-sm text-gray-500">Керуйте зарядкою в один дотик</p>
        </div>

        <form onSubmit={handleLogin}>
          {error ? (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50/90 px-3 py-2.5 text-sm text-red-700 shadow-sm">
              {error}
            </p>
          ) : null}
          <Input
            label="Email"
            type="email"
            placeholder="user@test.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="mb-6 space-y-1.5 rounded-xl border border-emerald-100/80 bg-emerald-50/60 px-3 py-3 text-xs text-gray-600 shadow-sm">
            <p className="font-semibold text-gray-800">Демо-акаунти (пароль для всіх: password)</p>
            <p>admin@test.com — глобальний адмін</p>
            <p>station_admin@test.com — адмін станції</p>
            <p>user@test.com — користувач</p>
          </div>

          <div className="mb-6 flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center text-gray-600">
              <input
                type="checkbox"
                className="mr-2 rounded border-emerald-200 text-green-600 focus:ring-green-500/30"
              />
              Запам&apos;ятати мене
            </label>
            <a href="#" className="font-medium text-green-600 transition hover:text-green-700">
              Забули пароль?
            </a>
          </div>

          <Button type="submit">Увійти</Button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Немає акаунту?{' '}
          <Link to="/signup" className="font-bold text-green-600 transition hover:text-emerald-700 hover:underline">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}
