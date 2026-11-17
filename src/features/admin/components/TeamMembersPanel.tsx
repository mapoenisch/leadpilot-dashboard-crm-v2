// Executive Dashboard V2 (Auftrag 163 / P11b):
// Detailbereich zur Verwaltung der Mitglieder eines Teams (§2.5 Nr. 26).

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type {
  DashboardTeamMemberV2,
  DashboardTeamV2,
} from '@/features/dashboard/services/dashboardStorageV2Types';
import {
  listDashboardTeamMembersV2,
  addDashboardTeamMemberV2,
  removeDashboardTeamMemberV2,
} from '@/features/dashboard/services/dashboardTeamsV2';
import { memberService, type OrganizationMember } from '@/services/admin/memberService';
import { getDashboardTeamErrorMessage } from '@/features/dashboard/model/dashboardTeamMessages';

export interface TeamMembersPanelProps {
  team: DashboardTeamV2;
  onClose: () => void;
  onTeamUpdated?: () => void;
}

export function TeamMembersPanel({ team, onClose, onTeamUpdated }: TeamMembersPanelProps) {
  const [members, setMembers] = useState<DashboardTeamMemberV2[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<DashboardTeamMemberV2 | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [membersRes, orgData] = await Promise.all([
        listDashboardTeamMembersV2(team.id),
        memberService.listMembersAndInvitations(),
      ]);

      if (membersRes.ok) {
        setMembers(membersRes.value);
      } else {
        setError(getDashboardTeamErrorMessage(membersRes.error, 'member'));
      }

      setOrgMembers(orgData.members);
    } catch {
      setError('Mitgliederdaten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [team.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Nur aktive Org-Mitglieder, die noch nicht im Team sind (§2.5 Nr. 26)
  const currentMemberIds = new Set(members.map((m) => m.userId));
  const availableOrgMembers = orgMembers.filter(
    (m) => m.status === 'active' && !currentMemberIds.has(m.userId),
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await addDashboardTeamMemberV2(team.id, selectedUserId);
      if (res.ok) {
        setSelectedUserId('');
        await loadData();
        onTeamUpdated?.();
      } else {
        setError(getDashboardTeamErrorMessage(res.error, 'member'));
      }
    } catch {
      setError('Mitglied konnte nicht hinzugefügt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await removeDashboardTeamMemberV2(team.id, removeTarget.userId);
      if (res.ok) {
        setRemoveTarget(null);
        await loadData();
        onTeamUpdated?.();
      } else {
        setError(getDashboardTeamErrorMessage(res.error, 'member'));
      }
    } catch {
      setError('Mitglied konnte nicht entfernt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="team-members-panel"
      className="mt-6 rounded-xl border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] p-6"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border,#1b3d39)] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Mitglieder von „{team.name}“</h2>
          <p className="text-xs text-muted-foreground">
            Mitglieder dieses Teams können Team-Dashboards einsehen und (mit Manager/Admin-Rechten)
            bearbeiten.
          </p>
        </div>
        <Button variant="secondary" onClick={onClose}>
          Schließen
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          data-testid="team-members-error"
          className="mt-4 rounded border border-error/40 bg-error/10 p-3 text-xs text-error"
        >
          {error}
        </div>
      )}

      {/* Mitglied hinzufügen */}
      <form onSubmit={handleAddMember} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
          <label
            htmlFor="add-team-member-select"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Neues Mitglied hinzufügen
          </label>
          <select
            id="add-team-member-select"
            data-testid="add-team-member-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={isSubmitting || isLoading || availableOrgMembers.length === 0}
            className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] px-3 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {availableOrgMembers.length === 0
                ? 'Alle aktiven Mitglieder sind bereits im Team'
                : '– Mitglied auswählen –'}
            </option>
            {availableOrgMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email} ({m.role})
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          variant="primary"
          data-testid="add-member-button"
          disabled={!selectedUserId || isSubmitting || isLoading}
        >
          {isSubmitting ? 'Wird hinzugefügt...' : 'Hinzufügen'}
        </Button>
      </form>

      {/* Mitgliederliste */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Aktuelle Mitglieder ({members.length})
        </h3>

        {isLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse py-4">Lade Mitglieder...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Dieses Team hat noch keine Mitglieder.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border,#1b3d39)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">E-Mail</th>
                  <th className="px-4 py-3">Organisations-Rolle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border,#1b3d39)]">
                {members.map((m) => {
                  const isSuspended = m.orgStatus === 'suspended';
                  const isViewer = m.orgRole === 'viewer';

                  return (
                    <tr
                      key={m.userId}
                      data-testid={`team-member-row-${m.userId}`}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-white">{m.email}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize">{m.orgRole}</span>
                        {isViewer && (
                          <span className="ml-2 text-xs text-muted-foreground">(liest nur)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSuspended ? (
                          <Badge variant="red" className="text-[10px]">
                            gesperrt – ohne Zugriff
                          </Badge>
                        ) : (
                          <Badge variant="mint" className="text-[10px]">
                            aktiv
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          data-testid={`remove-member-button-${m.userId}`}
                          onClick={() => setRemoveTarget(m)}
                          disabled={isSubmitting}
                          className="border-error/40 text-error hover:bg-error/10 text-xs"
                        >
                          Entfernen
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bestätigungsdialog: Mitglied entfernen (§2.5 Nr. 26) */}
      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Mitglied aus Team entfernen?"
        maxWidth="500px"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => setRemoveTarget(null)}
              className="w-full sm:w-auto"
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              data-testid="confirm-remove-member-button"
              disabled={isSubmitting}
              onClick={handleConfirmRemove}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Wird entfernt...' : 'Aus Team entfernen'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]">
          <p>
            Möchtest du <strong className="text-white">{removeTarget?.email}</strong> wirklich aus
            dem Team <strong className="text-white">„{team.name}“</strong> entfernen?
          </p>
          <div
            role="alert"
            className="rounded border border-error/40 bg-error/10 p-3 text-xs text-error"
          >
            <p className="font-semibold">Achtung: Sofortiger Zugriffsentzug</p>
            <p className="mt-1">
              <strong>{removeTarget?.email}</strong> verliert sofort den Zugriff auf alle Dashboards
              dieses Teams.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
