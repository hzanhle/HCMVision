import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { clearToken, getToken, setToken } from '../utils/storage';
import { getMe, loginRequest, UserProfile } from '../services/auth';

type AuthContextValue = {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<PropsWithChildren>) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadProfile = React.useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setProfile(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      setLoading(true);
      const me = await getMe(token);
      setProfile(me);
      setIsAuthenticated(true);
    } catch {
      setProfile(null);
      setIsAuthenticated(false);
      await clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      profile,
      loading,
      login: async (username: string, password: string) => {
        if (!username || !password) {
          throw new Error('Username and password are required');
        }

        try {
          setLoading(true);
          const result = await loginRequest({ username, password });
          await setToken(result.token);
          setProfile(result.profile);
          setIsAuthenticated(true);
        } finally {
          setLoading(false);
        }
      },
      logout: async () => {
        await clearToken();
        setProfile(null);
        setIsAuthenticated(false);
      },
      reloadProfile,
    }),
    [isAuthenticated, loading, profile, reloadProfile],
  );

  React.useEffect(() => {
    reloadProfile().catch(() => {
      setIsAuthenticated(false);
      setProfile(null);
    });
  }, [reloadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
