import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { User, AuthAdapter } from './authAdapter';
import { defaultAuthAdapter } from './supabaseAuthAdapter';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  adapter?: AuthAdapter;
  /**
   * Auftrag 084: wird bei Abmeldung oder Wechsel auf einen anderen Benutzer aufgerufen, bevor der
   * neue Zustand gerendert wird (z. B. zum Zurücksetzen benutzerbezogener Query-Daten).
   */
  onUserChange?: (previous: User, next: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  adapter = defaultAuthAdapter,
  onUserChange,
}: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(() => adapter.getSession());
  const currentUser = useRef(user);
  const onUserChangeRef = useRef(onUserChange);
  onUserChangeRef.current = onUserChange;

  // Benutzerwechsel vor dem Setzen melden, damit kein Render des neuen Benutzers alte Daten zeigt.
  const setUser = useCallback((next: User | null) => {
    const previous = currentUser.current;
    if (previous !== null && previous.id !== next?.id) {
      onUserChangeRef.current?.(previous, next);
    }
    currentUser.current = next;
    setUserState(next);
  }, []);
  // G45-Nacharbeit: Hydration-Flag — der Route-Guard wartet die asynchrone
  // Sitzungsherstellung ab, statt vor getSession() umzuleiten.
  const [isHydrated, setIsHydrated] = useState(() => adapter.initialize === undefined);

  // G45: Sitzungsnachführung über den Adapter (Supabase onAuthStateChange).
  // Kein localStorage, keine manipulierbare Browser-Sitzung mehr.
  useEffect(() => {
    if (!adapter.initialize) {
      setUser(adapter.getSession());
      setIsHydrated(true);
      return;
    }
    return adapter.initialize((next) => {
      setUser(next);
      setIsHydrated(true);
    });
  }, [adapter, setUser]);

  const login = useCallback(
    async (email: string, pass: string) => {
      const loggedInUser = await adapter.login(email, pass);
      setUser(loggedInUser);
      return loggedInUser;
    },
    [adapter, setUser],
  );

  const logout = useCallback(async () => {
    await adapter.logout();
    setUser(null);
  }, [adapter, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isHydrated,
      login,
      logout,
    }),
    [user, isHydrated, login, logout],
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
