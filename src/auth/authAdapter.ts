/**
 * Minimaler User-Typ gemäss Entscheidung 1 in Auftrag 060.
 * Keine Rollen-/Rechte-Differenzierung (nur eingeloggt vs. nicht eingeloggt).
 */
export interface User {
  id: string;
  email: string;
}

/**
 * AuthAdapter-Interface analog zur DataSource-Abstraktion (Entscheidung 2).
 * G45: Standard-Implementierung ist der SupabaseAuthAdapter mit serverseitig
 * prüfbarer Sitzung. Adapter mit asynchroner Sitzungsherstellung melden
 * Änderungen über initialize(); getSession() liefert den gecachten Stand.
 */
export interface AuthAdapter {
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getSession(): User | null;
  initialize?(onChange: (user: User | null) => void): () => void;
}
