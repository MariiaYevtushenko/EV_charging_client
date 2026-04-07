import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { User } from '../types/auth';
import { fetchUserProfile, mapPublicDtoToUser } from '../api/authApi';
import { readStoredUser, writeStoredUser } from '../lib/authStorage';

type ProfilePatch = Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'phone'>>;

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  /** Повна заміна користувача (наприклад після відповіді API). */
  replaceUser: (next: User) => void;
  /** Підтягнути профіль з БД за поточним `user.id`. */
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const userRef = useRef<User | null>(user);
  userRef.current = user;

  const login = (userData: User) => {
    setUser(userData);
    writeStoredUser(userData);
    localStorage.setItem('user_role', userData.role);
  };

  const logout = () => {
    setUser(null);
    writeStoredUser(null);
    localStorage.removeItem('user_role');
  };

  const updateProfile = (patch: ProfilePatch) => {
    setUser((u) => {
      if (!u) return null;
      const next = { ...u, ...patch };
      writeStoredUser(next);
      return next;
    });
  };

  const replaceUser = (next: User) => {
    setUser(next);
    writeStoredUser(next);
  };

  const refreshUser = useCallback(async () => {
    const id = userRef.current?.id;
    if (!id) return;
    try {
      const dto = await fetchUserProfile(Number(id));
      const next = mapPublicDtoToUser(dto);
      setUser(next);
      writeStoredUser(next);
    } catch {
      /* залишаємо попередній стан */
    }
  }, []);

  /** Після перезавантаження сторінки підтягуємо актуальний профіль з БД. */
  useEffect(() => {
    const id = userRef.current?.id;
    if (!id) return;
    let cancelled = false;
    void fetchUserProfile(Number(id))
      .then((dto) => {
        if (cancelled) return;
        const next = mapPublicDtoToUser(dto);
        setUser(next);
        writeStoredUser(next);
      })
      .catch(() => {
        /* мережа / сервер недоступні — лишаємо дані з localStorage */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateProfile,
        replaceUser,
        refreshUser,
        isAuthenticated: !!user,
      }}
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