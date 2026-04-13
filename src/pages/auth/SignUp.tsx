import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { UserRole } from '../../types/auth';
import { appSelectClass } from '../../components/station-admin/formStyles';

export default function Signup() {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }>({
    name: '',
    email: '',
    password: '',
    role: 'USER',
  });
  const navigate = useNavigate();

  const handleSignup = (e: FormEvent) => {
    e.preventDefault();
    console.log('Registering:', formData);
    navigate('/login');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 font-sans">
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-8 left-10 h-80 w-80 rounded-full bg-green-300/25 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_64px_-12px_rgba(5,80,60,0.22)] ring-1 ring-emerald-100/60 backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white shadow-md shadow-green-600/25">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Створити акаунт</h2>
          <p className="mt-1 text-sm text-gray-500">Створіть акаунт у системі</p>
        </div>

        <form onSubmit={handleSignup}>
          <Input
            label="Повне ім'я"
            placeholder="Іван Іванов"
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="example@mail.com"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Пароль"
            type="password"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Я хочу бути:</label>
            <select
              className={appSelectClass}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            >
              <option value="USER">Користувач (водій)</option>
              <option value="STATION_ADMIN">Адміністратор станції</option>
              <option value="GLOBAL_ADMIN">Адміністратор</option>
            </select>
          </div>

          <Button type="submit">Зареєструватися</Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Вже є акаунт?{' '}
          <Link to="/login" className="font-bold text-green-600 transition hover:text-emerald-700 hover:underline">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
