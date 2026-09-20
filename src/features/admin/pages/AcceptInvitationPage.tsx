// G59 (Auftrag 067M, Step 3/Nacharbeit): Seite zur Annahme von Organisationseinladungen.
// Ermöglicht eingeladenen Benutzern, ihre ausstehende Einladung sicher anzunehmen.
// Übernimmt Organisation und Rolle ausschließlich serverseitig aus der Datenbank.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { memberService, MemberServiceError } from '@/services/admin/memberService';
import { CheckCircle2, AlertCircle, ArrowRight, UserCheck, LogIn } from 'lucide-react';

export function AcceptInvitationPage() {
  const { isAuthenticated, user, isHydrated } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [acceptedRole, setAcceptedRole] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await memberService.acceptInvitation();
      setSuccess(true);
      setAcceptedRole(result.role);
    } catch (err) {
      if (err instanceof MemberServiceError) {
        if (err.code === 'NOT_FOUND') {
          setError('Keine ausstehende Einladung für Ihre E-Mail-Adresse gefunden.');
        } else if (err.code === 'INVITATION_NOT_PENDING') {
          setError('Diese Einladung ist nicht mehr gültig oder wurde bereits angenommen.');
        } else {
          setError(err.message);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Ein unerwarteter Fehler ist beim Annehmen der Einladung aufgetreten.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    // Vollständiger Reload stellt sicher, dass organizationContext die neue Mitgliedschaft lädt
    window.location.href = '/dashboard';
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-bg,#061613)_0%,var(--color-bg-deep,#020B09)_100%)]">
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-[var(--color-text-muted,#94a3b8)]"
        >
          Authentifizierung wird überprüft …
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-bg,#061613)_0%,var(--color-bg-deep,#020B09)_100%)] font-body text-text box-border">
      <main className="w-full max-w-[480px] bg-surface/90 border border-border rounded-xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Header */}
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
          <h1 className="text-xl font-semibold text-text m-0 flex items-center gap-2 justify-center">
            <UserCheck size={22} className="text-primary" />
            <span>Einladung annehmen</span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted,#94a3b8)] mt-1 mb-0">
            Aktivierung Ihrer Organisationsmitgliedschaft auf der Plattform.
          </p>
        </div>

        {/* Zustand 1: Erfolgreich angenommen */}
        {success && (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-4 rounded-lg border border-[var(--color-emerald-green,#00D696)]/40 bg-[var(--color-emerald-green-a14,rgba(0,214,150,0.14))] text-white text-sm"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="shrink-0 text-[var(--color-emerald-green,#00D696)] mt-0.5"
                />
                <div>
                  <p className="font-semibold m-0 text-[14px]">Einladung erfolgreich angenommen!</p>
                  <p className="text-xs text-white/80 mt-1 mb-0">
                    Sie wurden der Organisation zugewiesen
                    {acceptedRole ? ` (Rolle: ${acceptedRole})` : ''}.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary text-black font-semibold text-sm transition-colors cursor-pointer shadow-md"
            >
              <span>Weiter zum Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Zustand 2: Noch nicht angenommen, aber angemeldet */}
        {!success && isAuthenticated && (
          <div className="space-y-5">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg border border-[var(--color-coral-red,#FF5A5F)]/50 bg-[var(--color-coral-red-a14,rgba(255,90,95,0.14))] text-xs text-white flex items-start gap-2"
              >
                <AlertCircle
                  size={16}
                  className="shrink-0 text-[var(--color-coral-red,#FF5A5F)] mt-0.5"
                />
                <span>{error}</span>
              </div>
            )}

            <div
              role="note"
              aria-label="Einladungs-Informationen"
              className="p-4 rounded-lg border border-border bg-black/30 text-xs text-[var(--color-text-muted,#94a3b8)] space-y-2"
            >
              <div className="flex justify-between">
                <span>Angemeldet als:</span>
                <span className="font-mono text-white">{user?.email ?? 'Unbekannt'}</span>
              </div>
              <p className="m-0 pt-2 border-t border-border/40 text-[11px] leading-relaxed">
                Mit dem Klick auf &bdquo;Einladung annehmen&ldquo; wird Ihre Mitgliedschaft in der
                einladenden Organisation freigeschaltet. Organisation und Rolle werden
                ausschließlich serverseitig verifiziert.
              </p>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAccept}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary text-black font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <span>{isSubmitting ? 'Einladung wird angenommen …' : 'Einladung annehmen'}</span>
              <UserCheck size={16} />
            </button>
          </div>
        )}

        {/* Zustand 3: Nicht angemeldet */}
        {!success && !isAuthenticated && (
          <div className="space-y-4 text-center">
            <div
              role="note"
              aria-label="Anmeldung erforderlich"
              className="p-4 rounded-lg border border-border bg-black/30 text-xs text-[var(--color-text-muted,#94a3b8)] leading-relaxed"
            >
              Um eine Einladung anzunehmen, müssen Sie angemeldet sein. Bitte verwenden Sie den Link
              aus Ihrer Einladungs-E-Mail oder melden Sie sich an.
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/login', { state: { from: { pathname: '/accept-invitation' } } })
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary text-black font-semibold text-sm transition-colors cursor-pointer shadow-md"
            >
              <LogIn size={16} />
              <span>Zur Anmeldung</span>
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border/50 text-center">
          <span className="text-[11px] text-[var(--color-text-muted,#64748b)]">
            LeadPilot Dashboard-CRM · Mandantenisolierung
          </span>
        </div>
      </main>
    </div>
  );
}

export default AcceptInvitationPage;
