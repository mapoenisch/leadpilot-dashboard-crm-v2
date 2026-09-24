// G45 (Auftrag 067B): Supabase-Auth-Adapter (Design §5.2).
// Ersetzt den Browser-/Demo-Login durch serverseitig prüfbare Supabase-
// Sitzungen. Kein localStorage, keine Demo-Zugangsdaten, kein stiller
// Fallback: Ohne Konfiguration wirft login ehrlich, getSession ist null.
import { supabase, isSupabaseConfigured } from '../services/db/supabaseClient';
import type { AuthAdapter, User } from './authAdapter';

function toUser(id: string, email: string | undefined): User {
  return { id, email: email ?? '' };
}

class SupabaseAuthAdapter implements AuthAdapter {
  private cachedUser: User | null = null;

  async login(email: string, password: string): Promise<User> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase ist nicht konfiguriert. Anmeldung nicht möglich.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error || !data.user) {
      throw new Error('Ungültige Anmeldedaten. Bitte prüfe E-Mail und Passwort.');
    }
    const user = toUser(data.user.id, data.user.email);
    this.cachedUser = user;
    return user;
  }

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    this.cachedUser = null;
  }

  getSession(): User | null {
    return this.cachedUser;
  }

  initialize(onChange: (user: User | null) => void): () => void {
    if (!isSupabaseConfigured || !supabase) {
      onChange(null);
      return () => undefined;
    }
    const client = supabase;
    void client.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      const next = sessionUser ? toUser(sessionUser.id, sessionUser.email) : null;
      this.cachedUser = next;
      onChange(next);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      const next = sessionUser ? toUser(sessionUser.id, sessionUser.email) : null;
      this.cachedUser = next;
      onChange(next);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }
}

export const supabaseAuthAdapter: AuthAdapter = new SupabaseAuthAdapter();
export const defaultAuthAdapter: AuthAdapter = supabaseAuthAdapter;
