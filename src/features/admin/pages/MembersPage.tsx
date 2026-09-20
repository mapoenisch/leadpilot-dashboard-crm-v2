// G59 (Auftrag 067M, Step 3): Mitgliederverwaltung für Administratoren.
// Enthält Mitgliederliste, Einladungsliste, Bestätigungsdialoge und Rollenmatrix.
// Schützt vor der Herabstufung/Deaktivierung des letzten Administrators (LAST_ACTIVE_ADMIN).
import { useEffect, useState, useCallback } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  memberService,
  MemberServiceError,
  type OrganizationMember,
  type OrganizationInvitation,
  type OrganizationRole,
} from '@/services/admin/memberService';
import {
  InvitationForm,
  RoleMatrix,
  ConfirmActionModal,
  ForbiddenView,
} from '../components/InvitationForm';

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

  if (isOrgLoading) {
    return (
      <main tabIndex={-1} id="main-content" aria-label="Hauptinhalt" className="p-[var(--space-6)]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Lade Organisationsdaten...
        </div>
      </main>
    );
  }

  if (!session || session.role !== 'admin') {
    return <ForbiddenView currentRole={session?.role} />;
  }

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
      setErrorMessage(
        err instanceof MemberServiceError && err.code === 'LAST_ACTIVE_ADMIN'
          ? 'Der letzte aktive Administrator kann nicht deaktiviert werden.'
          : err instanceof Error
            ? err.message
            : 'Fehler beim Deaktivieren.',
      );
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
      setErrorMessage(
        err instanceof MemberServiceError && err.code === 'LAST_ACTIVE_ADMIN'
          ? 'Der letzte aktive Administrator kann nicht herabgestuft werden.'
          : err instanceof Error
            ? err.message
            : 'Fehler beim Ändern der Rolle.',
      );
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
      setErrorMessage(err instanceof Error ? err.message : 'Fehler beim Widerrufen der Einladung.');
    } finally {
      setIsActionPending(false);
    }
  };

  const memberColumns: Column<OrganizationMember>[] = [
    {
      key: 'email',
      label: 'Benutzer / E-Mail',
      render: (m) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{m.email}</span>
          <span className="text-[11px] text-[var(--color-text-muted)]">ID: {m.userId}</span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rolle',
      render: (m) => (
        <Badge variant={m.role === 'admin' ? 'orange' : m.role === 'manager' ? 'cyan' : 'neutral'}>
          {m.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (m) => (
        <Badge variant={m.status === 'active' ? 'mint' : 'red'}>
          {m.status === 'active' ? 'Aktiv' : 'Suspendiert'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Aktionen',
      render: (m) => (
        <div className="flex items-center gap-2">
          <select
            aria-label={`Rolle von ${m.email} ändern`}
            value={m.role}
            disabled={m.status === 'suspended'}
            onChange={(e) =>
              setRoleChangeTarget({ member: m, newRole: e.target.value as OrganizationRole })
            }
            className="bg-background-deep border border-solid border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-primary"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
          {m.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeactivateTarget(m)}
              aria-label={`Mitglied ${m.email} deaktivieren`}
            >
              Deaktivieren
            </Button>
          )}
        </div>
      ),
    },
  ];

  const invitationColumns: Column<OrganizationInvitation>[] = [
    {
      key: 'email',
      label: 'E-Mail',
      render: (i) => <span className="font-medium text-text">{i.email}</span>,
    },
    {
      key: 'role',
      label: 'Zielrolle',
      render: (i) => (
        <Badge variant={i.role === 'admin' ? 'orange' : i.role === 'manager' ? 'cyan' : 'neutral'}>
          {i.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (i) => {
        const v = i.status === 'pending' ? 'cyan' : i.status === 'accepted' ? 'mint' : 'neutral';
        return <Badge variant={v}>{i.status}</Badge>;
      },
    },
    {
      key: 'expiresAt',
      label: 'Gültig bis',
      render: (i) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {new Date(i.expiresAt).toLocaleDateString('de-DE')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Aktionen',
      render: (i) => (
        <div>
          {i.status === 'pending' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setRevokeTarget(i)}
              aria-label={`Einladung für ${i.email} widerrufen`}
            >
              Widerrufen
            </Button>
          )}
        </div>
      ),
    },
  ];

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

      <section aria-labelledby="section-invite-title">
        <InvitationForm onInvitationCreated={loadData} />
      </section>

      <section
        aria-label="Mitgliederliste"
        className="bg-surface border border-solid border-border rounded-lg p-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="section-members-title" className="text-base font-semibold text-text m-0">
              Mitglieder der Organisation
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] m-0">
              {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'} registriert.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={isLoadingData}
            aria-label="Mitgliederliste aktualisieren"
          >
            {isLoadingData ? 'Lade...' : 'Aktualisieren'}
          </Button>
        </div>
        <Table
          rows={members}
          columns={memberColumns}
          emptyText="Keine Mitglieder in dieser Organisation gefunden."
          ariaLabel="Mitgliedertabelle"
        />
      </section>

      <section
        aria-label="Ausstehende Einladungen"
        className="bg-surface border border-solid border-border rounded-lg p-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
      >
        <div>
          <h2 id="section-invitations-title" className="text-base font-semibold text-text m-0">
            Ausstehende Einladungen
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] m-0">
            Übersicht aller offenen Einladungs-Tokens für diese Organisation.
          </p>
        </div>
        <Table
          rows={invitations.filter((i) => i.status === 'pending')}
          columns={invitationColumns}
          emptyText="Keine Einladungen vorhanden."
          ariaLabel="Einladungstabelle"
        />
      </section>

      <RoleMatrix />

      {/* Dialoge */}
      <ConfirmActionModal
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        title="Mitglied deaktivieren"
        confirmLabel="Ja, deaktivieren"
        variant="danger"
        loading={isActionPending}
        onConfirm={handleConfirmDeactivate}
      >
        <p className="text-sm text-text m-0">
          Möchten Sie das Mitglied{' '}
          <strong className="text-primary">{deactivateTarget?.email}</strong> wirklich deaktivieren?
        </p>
      </ConfirmActionModal>

      <ConfirmActionModal
        open={roleChangeTarget !== null}
        onClose={() => setRoleChangeTarget(null)}
        title="Rolle ändern"
        confirmLabel="Rolle ändern"
        variant="primary"
        loading={isActionPending}
        onConfirm={handleConfirmRoleChange}
      >
        <p className="text-sm text-text m-0">
          Möchten Sie die Rolle von{' '}
          <strong className="text-primary">{roleChangeTarget?.member.email}</strong> auf{' '}
          <strong className="text-primary">{roleChangeTarget?.newRole}</strong> ändern?
        </p>
      </ConfirmActionModal>

      <ConfirmActionModal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Einladung widerrufen"
        confirmLabel="Ja, widerrufen"
        variant="danger"
        loading={isActionPending}
        onConfirm={handleConfirmRevoke}
      >
        <p className="text-sm text-text m-0">
          Möchten Sie die Einladung an{' '}
          <strong className="text-primary">{revokeTarget?.email}</strong> widerrufen?
        </p>
      </ConfirmActionModal>
    </main>
  );
}

export default MembersPage;
