import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  apiWithToken,
  clearStoredToken,
  getStoredToken,
  publicApi,
  setStoredToken,
} from '@/lib/api';

export type UserMe = { id: number; email: string; role: string };

type AuthContextValue = {
  tokenReady: boolean;
  user: UserMe | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenReady, setTokenReady] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api<UserMe>('/api/v1/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const t = await getStoredToken();
        if (!cancelled) setTokenReady(!!t);
        if (t) await refreshUser();
        else if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await publicApi<{ access_token: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      30_000,
    );
    // Run SecureStore + /me in parallel — sequential was slow on some devices.
    const [me] = await Promise.all([
      apiWithToken<UserMe>(r.access_token, '/api/v1/auth/me'),
      setStoredToken(r.access_token),
    ]);
    setTokenReady(true);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setTokenReady(false);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      tokenReady,
      user,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [tokenReady, user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
