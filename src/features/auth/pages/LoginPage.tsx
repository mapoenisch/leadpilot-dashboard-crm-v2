import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Zielroute nach Login (oder Fallback auf /dashboard)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Falls bereits authentifiziert: sofort weiterleiten
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-bg,#061613)_0%,var(--color-bg-deep,#020B09)_100%)] font-body text-text box-border">
      <main className="w-full max-w-[420px] bg-surface/90 border border-border rounded-xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/assets/logo/leadpilot-logo-full.png"
              alt="LeadPilot Logo"
              className="h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="font-display font-bold text-2xl tracking-tight text-white">
              LeadPilot{' '}
              <span className="text-xs text-primary uppercase tracking-wider font-semibold">
                Enterprise
              </span>
            </div>
          </div>
          <h1 className="text-lg font-semibold text-text m-0">Anmeldung zur Plattform</h1>
          <p className="text-xs text-[var(--color-text-muted,#94a3b8)] mt-1 mb-0">
            Bitte melden Sie sich an, um auf das CRM- und Simulations-Dashboard zuzugreifen.
          </p>
        </div>

        {/* Supabase-Authentifizierung (G45): keine Demo-Zugangsdaten mehr. */}
        <div
          role="note"
          aria-label="Hinweis zur Anmeldung"
          className="mb-5 p-3 rounded-lg border border-border bg-black/30 text-[12px] text-[var(--color-text-muted,#94a3b8)] leading-relaxed"
        >
          Anmeldung mit deinem Organisationskonto (Supabase Auth, mandantengebunden).
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg border border-[var(--color-coral-red,#FF5A5F)]/50 bg-[var(--color-coral-red-a14,rgba(255,90,95,0.14))] text-xs text-white flex items-start gap-2"
          >
            <AlertCircle
              size={16}
              className="shrink-0 text-[var(--color-coral-red,#FF5A5F)] mt-0.5"
            />
            <span>{error}</span>
          </div>
        )}

        {/* Login Formular */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-text mb-1">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--color-text-muted,#94a3b8)]">
                <Mail size={16} />
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@leadpilot.io"
                className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-border rounded-lg text-white placeholder:text-[var(--color-text-muted,#64748b)] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-text mb-1">
              Passwort
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--color-text-muted,#94a3b8)]">
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-border rounded-lg text-white placeholder:text-[var(--color-text-muted,#64748b)] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary text-black font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <span>{isSubmitting ? 'Wird angemeldet …' : 'Anmelden'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/50 text-center">
          <span className="text-[11px] text-[var(--color-text-muted,#64748b)]">
            LeadPilot Dashboard-CRM · V2.2.0-Härtung
          </span>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
