// G59 (Auftrag 067M, Step 3): Einladungsformular für neue Organisationsmitglieder.
// Barrierefrei nach WCAG 2.2 AA mit validiertem E-Mail-Feld und Rollenhinweisen.
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { memberService, type OrganizationRole } from '@/services/admin/memberService';

interface InvitationFormProps {
  onInvitationCreated: () => void;
}

export function InvitationForm({ onInvitationCreated }: InvitationFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    setIsSubmitting(true);
    try {
      await memberService.inviteMember(trimmed, role);
      setSuccessMessage(`Einladung an ${trimmed} erfolgreich ausgestellt.`);
      setEmail('');
      setRole('viewer');
      onInvitationCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Ausstellen der Einladung.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-solid border-border rounded-lg p-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
      aria-label="Neues Mitglied einladen"
    >
      <h3 className="text-base font-semibold text-text m-0">Neues Mitglied einladen</h3>
      <p className="text-xs text-[var(--color-text-muted)] m-0">
        Laden Sie Kolleginnen oder Kollegen per E-Mail in Ihre Organisation ein. Die Mitgliedschaft
        wird nach Annahme aktiv.
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="bg-[rgba(255,85,85,0.1)] border border-solid border-error text-error text-xs rounded p-[var(--space-2)]"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="bg-[rgba(80,250,123,0.1)] border border-solid border-success text-success text-xs rounded p-[var(--space-2)]"
        >
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-3)]">
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-email" className="text-xs font-semibold text-text">
            E-Mail-Adresse
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kollege@unternehmen.de"
            className="w-full bg-background-deep border border-solid border-border rounded px-3 py-2 text-sm text-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-primary"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="invite-role" className="text-xs font-semibold text-text">
            Rolle
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrganizationRole)}
            className="w-full bg-background-deep border border-solid border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            disabled={isSubmitting}
          >
            <option value="viewer">Viewer (Nur Lesezugriff)</option>
            <option value="manager">Manager (Operativer Zugriff)</option>
            <option value="admin">Administrator (Voller Zugriff inkl. Verwaltung)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Einladung senden
        </Button>
      </div>
    </form>
  );
}
