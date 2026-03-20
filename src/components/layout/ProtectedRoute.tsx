import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user!.role)) {
    // Якщо роль не підходить, відправляємо на головну
    return <Navigate to="/" replace />;
  }

  return <Outlet />; // Рендерить вкладені маршрути
};