import React, { createContext, useContext, useState, type ReactNode } from 'react';

import type { User } from '../types/auth';

type ProfilePatch = Partial<Pick<User, 'name' | 'email' | 'avatarUrl'>>;

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (userData: User) => {
    setUser(userData);
    // В реальному проекті тут записуємо токен в localStorage
    localStorage.setItem('user_role', userData.role);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_role');
  };

  const updateProfile = (patch: ProfilePatch) => {
    setUser((u) => (u ? { ...u, ...patch } : null));
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, updateProfile, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};