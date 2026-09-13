import type { AuthAdapter, User } from './authAdapter';

export const AUTH_STORAGE_KEY = 'leadpilot_auth_session';

const DEFAULT_DEMO_EMAIL = 'demo@leadpilot.io';
const DEFAULT_DEMO_PASSWORD = 'demo';

/**
 * LocalAuthAdapter: Reiner Browser-/Demo-Login (Entscheidung 3).
 * Explizit KEINE echte Sicherheit. Speichert Session in localStorage.
 */
export class LocalAuthAdapter implements AuthAdapter {
  private getDemoCredentials(): { email: string; pass: string } {
    const email = (import.meta.env.VITE_DEMO_AUTH_EMAIL || DEFAULT_DEMO_EMAIL).trim().toLowerCase();
    const pass = import.meta.env.VITE_DEMO_AUTH_PASSWORD || DEFAULT_DEMO_PASSWORD;
    return { email, pass };
  }

  async login(email: string, password: string): Promise<User> {
    const { email: demoEmail, pass: demoPass } = this.getDemoCredentials();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail !== demoEmail || password !== demoPass) {
      throw new Error('Ungültige Anmeldedaten. Bitte prüfe E-Mail und Passwort.');
    }

    const user: User = {
      id: 'demo-user-id',
      email: cleanEmail,
    };

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // localStorage im aktuellen Kontext nicht beschreibbar
    }

    return user;
  }

  async logout(): Promise<void> {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // localStorage nicht verfügbar
    }
  }

  getSession(): User | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
        return { id: parsed.id, email: parsed.email };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const defaultAuthAdapter: AuthAdapter = new LocalAuthAdapter();
