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
 * Ermöglicht den späteren Drop-in-Austausch gegen SupabaseAuthAdapter (Gate G28),
 * ohne AuthProvider, ProtectedRoute oder LoginPage anzufassen.
 */
export interface AuthAdapter {
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getSession(): User | null;
}
