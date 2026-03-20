import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  DEMO_PASSWORD,
  findDemoAccount,
} from '../../data/demoAccounts';

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
      setError(
        'Невірний email або пароль. Для демо використовуйте акаунти нижче та пароль: password'
      );
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-full mb-4 text-green-600">
            {/* Іконка блискавки */}
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Вітаємо знову!</h1>
          <p className="text-gray-500">Керуйте вашою зарядкою легко</p>
        </div>

        <form onSubmit={handleLogin}>
          {error ? (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
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

          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700">Демо-акаунти (пароль для всіх: password)</p>
            <p>admin@test.com — глобальний адмін</p>
            <p>station_admin@test.com — адмін станції</p>
            <p>user@test.com — користувач</p>
          </div>
          
          <div className="flex items-center justify-between mb-6 text-sm">
            <label className="flex items-center text-gray-600 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded border-gray-300 text-green-600 focus:ring-green-500" />
              Запам'ятати мене
            </label>
            <a href="#" className="text-green-600 hover:text-green-700 font-medium">Забули пароль?</a>
          </div>

          <Button type="submit">Увійти</Button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Немає акаунту?{' '}
          <Link to="/signup" className="text-green-600 font-bold hover:underline">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}