import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, AuthAdapter } from './authAdapter';
import { defaultAuthAdapter, AUTH_STORAGE_KEY } from './localAuthAdapter';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  adapter?: AuthAdapter;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, adapter = defaultAuthAdapter }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => adapter.getSession());

  // Synchronisation bei externen localStorage-Änderungen (z. B. Multi-Tab oder Logout)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        setUser(adapter.getSession());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [adapter]);

  const login = useCallback(
    async (email: string, pass: string) => {
      const loggedInUser = await adapter.login(email, pass);
      setUser(loggedInUser);
      return loggedInUser;
    },
    [adapter],
  );

  const logout = useCallback(async () => {
    await adapter.logout();
    setUser(null);
  }, [adapter]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden.');
  }
  return context;
}
