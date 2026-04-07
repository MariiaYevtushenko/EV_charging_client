import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { loginWithEmailPassword } from '../../api/authApi';
import { appInputClass } from '../../components/station-admin/formStyles';

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await loginWithEmailPassword(email, password);
      login(user);

      if (user.role === 'GLOBAL_ADMIN') {
        navigate('/admin-dashboard');
      } else if (user.role === 'STATION_ADMIN') {
        navigate('/station-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося увійти');
    } finally {
      setSubmitting(false);
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

        <form onSubmit={(e) => void handleLogin(e)}>
          {error ? (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50/90 px-3 py-2.5 text-sm text-red-700 shadow-sm">
              {error}
            </p>
          ) : null}
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="mb-4 flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
              Пароль
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`${appInputClass} pr-11`}
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 transition hover:bg-emerald-100/60 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
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

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Вхід…' : 'Увійти'}
          </Button>
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
