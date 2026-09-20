import React from 'react';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  OrganizationMember,
  OrganizationInvitation,
  OrganizationRole,
} from '@/services/admin/memberService';

interface MemberTablesProps {
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  isLoadingData: boolean;
  onRefresh: () => void;
  onSelectRoleChange: (member: OrganizationMember, newRole: OrganizationRole) => void;
  onSelectDeactivate: (member: OrganizationMember) => void;
  onSelectRevoke: (invitation: OrganizationInvitation) => void;
}

export const MemberTables: React.FC<MemberTablesProps> = ({
  members,
  invitations,
  isLoadingData,
  onRefresh,
  onSelectRoleChange,
  onSelectDeactivate,
  onSelectRevoke,
}) => {
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
      render: (m) => {
        const variant = m.role === 'admin' ? 'orange' : m.role === 'manager' ? 'cyan' : 'neutral';
        return <Badge variant={variant}>{m.role}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (m) => {
        const variant = m.status === 'active' ? 'mint' : 'red';
        return <Badge variant={variant}>{m.status === 'active' ? 'Aktiv' : 'Suspendiert'}</Badge>;
      },
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
            onChange={(e) => onSelectRoleChange(m, e.target.value as OrganizationRole)}
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
              onClick={() => onSelectDeactivate(m)}
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
      render: (i) => {
        const variant = i.role === 'admin' ? 'orange' : i.role === 'manager' ? 'cyan' : 'neutral';
        return <Badge variant={variant}>{i.role}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (i) => {
        const variant =
          i.status === 'pending' ? 'orange' : i.status === 'accepted' ? 'mint' : 'red';
        return <Badge variant={variant}>{i.status}</Badge>;
      },
    },
    {
      key: 'expires_at',
      label: 'Gültig bis',
      render: (i) => {
        try {
          return new Date(i.expiresAt).toLocaleDateString('de-DE');
        } catch {
          return i.expiresAt;
        }
      },
    },
    {
      key: 'actions',
      label: 'Aktion',
      render: (i) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSelectRevoke(i)}
          aria-label={`Einladung an ${i.email} widerrufen`}
        >
          Widerrufen
        </Button>
      ),
    },
  ];

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  return (
    <>
      {/* Aktive Mitglieder */}
      <section
        aria-labelledby="section-members-title"
        className="bg-surface border border-solid border-border rounded-lg p-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
      >
        <div className="flex items-center justify-between">
          <h2 id="section-members-title" className="text-base font-semibold text-text m-0">
            Aktive Mitglieder ({members.length})
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            loading={isLoadingData}
            disabled={isLoadingData}
          >
            Aktualisieren
          </Button>
        </div>

        <Table<OrganizationMember>
          ariaLabel="Mitgliederliste"
          columns={memberColumns}
          rows={members}
          emptyText="Keine Mitglieder gefunden."
          minWidth="550px"
        />
      </section>

      {/* Ausstehende Einladungen */}
      <section
        aria-labelledby="section-invitations-title"
        className="bg-surface border border-solid border-border rounded-lg p-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
      >
        <h2 id="section-invitations-title" className="text-base font-semibold text-text m-0">
          Ausstehende Einladungen ({pendingInvitations.length})
        </h2>

        <Table<OrganizationInvitation>
          ariaLabel="Ausstehende Einladungen"
          columns={invitationColumns}
          rows={pendingInvitations}
          emptyText="Keine ausstehenden Einladungen vorhanden."
          minWidth="500px"
        />
      </section>
    </>
  );
};
