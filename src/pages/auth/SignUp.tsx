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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">Створити акаунт</h2>

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
            <label className="text-sm font-medium text-gray-700 block mb-1">Я хочу бути:</label>
            <select
              className={`w-full ${appSelectClass}`}
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as UserRole })
              }
            >
              <option value="USER">Користувач (водій)</option>
              <option value="STATION_ADMIN">Адміністратор станції</option>
              <option value="GLOBAL_ADMIN">Глобальний адміністратор</option>
            </select>
          </div>

          <Button type="submit">Зареєструватися</Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Вже є акаунт?{' '}
          <Link to="/login" className="text-green-600 font-semibold hover:underline">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
