import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppCard, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';
import EditableAccountProfile from '../../components/account/EditableAccountProfile';
import { changeUserPassword } from '../../api/authApi';
import { ApiError } from '../../api/http';

export default function UserProfilePage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

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

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 pb-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Профіль</h1>
      </div>

      <EditableAccountProfile
        roleLabel="Користувач"
        fallbackDisplayName="Користувач"
        formIdPrefix="user"
        className="w-full space-y-6"
      />

    
    </div>
  );
}
