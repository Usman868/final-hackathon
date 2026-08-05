import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '../api/auth.api';
import toast from 'react-hot-toast';
import { disconnectSocket, updateSocketAuth } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.getMe();
      const u = data?.data?.user ?? null;
      if (!u) {
        localStorage.removeItem('accessToken');
        setUser(null);
      } else {
        setUser(u);
      }
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    const u = data?.data?.user;
    const accessToken = data?.data?.accessToken;
    if (!u) {
      throw new Error(data?.message || 'Login response missing user');
    }
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    setUser(u);
    updateSocketAuth(accessToken);
    toast.success(`Welcome back, ${u.name}`);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken');
    disconnectSocket();
    setUser(null);
    toast.success('Logged out');
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      setUser,
      isAdmin: user?.role === 'ADMIN',
      isTechnician: user?.role === 'TECHNICIAN',
      isSupervisor: user?.role === 'SUPERVISOR',
      isStaff: ['ADMIN', 'TECHNICIAN', 'SUPERVISOR'].includes(user?.role),
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
