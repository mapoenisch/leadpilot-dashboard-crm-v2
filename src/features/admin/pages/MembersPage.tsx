// G59 (Auftrag 067M, Step 3): Mitgliederverwaltung für Administratoren.
// Enthält Mitgliederliste, Einladungsliste, Rollenmatrix und Bestätigungsdialoge.
// Schützt vor der Herabstufung/Deaktivierung des letzten Administrators (LAST_ACTIVE_ADMIN).
import { useEffect, useState, useCallback } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import {
  memberService,
  MemberServiceError,
  type OrganizationMember,
  type OrganizationInvitation,
  type OrganizationRole,
} from '@/services/admin/memberService';
import { InvitationForm } from '../components/InvitationForm';
import { MemberTables } from '../components/MemberTables';
import { RoleMatrix } from '../components/RoleMatrix';
import { MemberModals } from '../components/MemberModals';

export function MembersPage() {
  const { session, isLoading: isOrgLoading } = useOrganization();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog-Zustände für kritische Aktionen
  const [deactivateTarget, setDeactivateTarget] = useState<OrganizationMember | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    member: OrganizationMember;
    newRole: OrganizationRole;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<OrganizationInvitation | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const loadData = useCallback(async () => {
    if (!session || session.role !== 'admin') return;
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const data = await memberService.listMembersAndInvitations();
      setMembers(data.members);
      setInvitations(data.invitations);
    } catch (err: unknown) {
      if (err instanceof MemberServiceError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Fehler beim Laden der Mitgliederdaten.');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.role === 'admin') {
      void loadData();
    }
  }, [session, loadData]);

  // 1. Ladezustand des Organisationskontexts
  if (isOrgLoading) {
    return (
      <main tabIndex={-1} id="main-content" aria-label="Hauptinhalt" className="p-[var(--space-6)]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Lade Organisationsdaten...
        </div>
      </main>
    );
  }

  // 2. Nicht-Admin: Fail-Closed 403 Zustand
  if (!session || session.role !== 'admin') {
    return (
      <main
        tabIndex={-1}
        id="main-content"
        aria-label="Hauptinhalt"
        className="p-[var(--space-6)] max-w-[800px] mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="bg-surface border border-solid border-border rounded-xl p-[var(--space-6)] w-full flex flex-col items-center gap-[var(--space-4)]">
          <div className="w-12 h-12 rounded-full bg-[rgba(255,85,85,0.1)] text-error flex items-center justify-center text-xl font-bold">
            !
          </div>
          <h1 className="text-2xl font-bold text-text m-0">Zugriff verweigert (403)</h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-[480px] m-0">
            Dieser Bereich ist ausschließlich für Administratoren zugänglich. Als{' '}
            <strong className="text-text">
              {session?.role ?? 'nicht authentifizierter Nutzer'}
            </strong>{' '}
            besitzen Sie keine Berechtigung zur Einsicht oder Verwaltung von Mitgliedern und
            Einladungen.
          </p>
        </div>
      </main>
    );
  }

  // Aktionen ausführen
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsActionPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await memberService.deactivateMember(deactivateTarget.userId);
      setSuccessMessage(`Mitglied ${deactivateTarget.email} wurde erfolgreich deaktiviert.`);
      setDeactivateTarget(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof MemberServiceError) {
        setErrorMessage(
          err.code === 'LAST_ACTIVE_ADMIN'
            ? 'Der letzte aktive Administrator kann nicht deaktiviert werden.'
            : err.message,
        );
      } else {
        setErrorMessage('Fehler beim Deaktivieren des Mitglieds.');
      }
    } finally {
      setIsActionPending(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    setIsActionPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await memberService.changeMemberRole(
        roleChangeTarget.member.userId,
        roleChangeTarget.newRole,
      );
      setSuccessMessage(
        `Rolle von ${roleChangeTarget.member.email} erfolgreich auf ${roleChangeTarget.newRole} geändert.`,
      );
      setRoleChangeTarget(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof MemberServiceError) {
        setErrorMessage(
          err.code === 'LAST_ACTIVE_ADMIN'
            ? 'Der letzte aktive Administrator kann nicht herabgestuft werden.'
            : err.message,
        );
      } else {
        setErrorMessage('Fehler beim Ändern der Rolle.');
      }
    } finally {
      setIsActionPending(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setIsActionPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await memberService.revokeInvitation(revokeTarget.id);
      setSuccessMessage(`Einladung an ${revokeTarget.email} wurde widerrufen.`);
      setRevokeTarget(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof MemberServiceError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Fehler beim Widerrufen der Einladung.');
      }
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <main
      tabIndex={-1}
      id="main-content"
      aria-label="Hauptinhalt"
      className="p-[var(--space-6)] flex flex-col gap-[var(--space-6)] max-w-[1200px] mx-auto"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text m-0">Mitgliederverwaltung</h1>
        <p className="text-sm text-[var(--color-text-muted)] m-0">
          Verwalten Sie aktive Benutzer, Rollen und ausstehende Einladungen Ihrer Organisation.
        </p>
      </header>

      {/* Globale Status- und Fehlermeldungen */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-[rgba(255,85,85,0.1)] border border-solid border-error text-error text-sm rounded-lg p-[var(--space-3)] flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-error underline border-0 bg-transparent cursor-pointer"
          >
            Schließen
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="bg-[rgba(80,250,123,0.1)] border border-solid border-success text-success text-sm rounded-lg p-[var(--space-3)] flex items-center justify-between"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-success underline border-0 bg-transparent cursor-pointer"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Formular zum Einladen */}
      <section aria-labelledby="section-invite-title">
        <InvitationForm onInvitationCreated={loadData} />
      </section>

      {/* Mitglieder- und Einladungstabellen */}
      <MemberTables
        members={members}
        invitations={invitations}
        isLoadingData={isLoadingData}
        onRefresh={loadData}
        onSelectRoleChange={(member, newRole) => setRoleChangeTarget({ member, newRole })}
        onSelectDeactivate={(member) => setDeactivateTarget(member)}
        onSelectRevoke={(invitation) => setRevokeTarget(invitation)}
      />

      {/* Rollenmatrix */}
      <RoleMatrix />

      {/* Bestätigungsdialoge */}
      <MemberModals
        deactivateTarget={deactivateTarget}
        onCloseDeactivate={() => setDeactivateTarget(null)}
        onConfirmDeactivate={handleConfirmDeactivate}
        roleChangeTarget={roleChangeTarget}
        onCloseRoleChange={() => setRoleChangeTarget(null)}
        onConfirmRoleChange={handleConfirmRoleChange}
        revokeTarget={revokeTarget}
        onCloseRevoke={() => setRevokeTarget(null)}
        onConfirmRevoke={handleConfirmRevoke}
        isActionPending={isActionPending}
      />
    </main>
  );
}
