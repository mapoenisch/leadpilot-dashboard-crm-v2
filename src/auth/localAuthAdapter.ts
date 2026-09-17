import type { AuthAdapter, User } from './authAdapter';

/**
 * G45 (Auftrag 067B): LocalAuthAdapter ist aus dem produktiven Pfad entfernt
 * (Design §5.2). Dieser Stub existiert nur, damit historische Verweise einen
 * harten, ehrlichen Fehler statt einer stillen Demo-Sitzung erzeugen.
 * Kein localStorage, keine Demo-Zugangsdaten, keine Sitzung.
 */
function removed(): never {
  throw new Error('LocalAuth wurde in G45 entfernt. Anmeldung erfolgt über Supabase Auth.');
}

class RemovedLocalAuthAdapter implements AuthAdapter {
  async login(_email: string, _password: string): Promise<User> {
    removed();
  }

  async logout(): Promise<void> {
    removed();
  }

  getSession(): User | null {
    removed();
  }
}

export const defaultAuthAdapter: AuthAdapter = new RemovedLocalAuthAdapter();
