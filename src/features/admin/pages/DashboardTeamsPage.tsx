// Executive Dashboard V2 (Auftrag 163 / P11b):
// Admin-Seite zur Verwaltung von Dashboard-Teams und deren Mitgliedern (§2.5).

import { useEffect, useState, useCallback } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { isSupabaseConfigured, supabase } from '@/services/db/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ForbiddenView } from '../components/InvitationForm';
import { TeamFormDialog, type TeamFormData } from '../components/TeamFormDialog';
import { TeamMembersPanel } from '../components/TeamMembersPanel';
import type { DashboardTeamV2 } from '@/features/dashboard/services/dashboardStorageV2Types';
import {
  listDashboardTeamsV2,
  createDashboardTeamV2,
  updateDashboardTeamV2,
  deleteDashboardTeamV2,
} from '@/features/dashboard/services/dashboardTeamsV2';
import { getDashboardTeamErrorMessage } from '@/features/dashboard/model/dashboardTeamMessages';

export function DashboardTeamsPage() {
  const { session, isLoading: isOrgLoading } = useOrganization();
  const [teams, setTeams] = useState<DashboardTeamV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<TeamFormData | null | false>(false);
  const [selectedTeam, setSelectedTeam] = useState<DashboardTeamV2 | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardTeamV2 | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await listDashboardTeamsV2();
      if (res.ok) {
        setTeams(res.value);
        if (selectedTeam) {
          const updated = res.value.find((t) => t.id === selectedTeam.id);
          setSelectedTeam(updated ?? null);
        }
      } else {
        setError(getDashboardTeamErrorMessage(res.error, 'team'));
      }
    } catch {
      setError('Teams konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (session?.role === 'admin') {
      void loadTeams();
    }
  }, [session, loadTeams]);

  if (isOrgLoading) {
    return (
      <section aria-label="Dashboard-Teams" className="p-[var(--space-6)]">
        <p className="text-sm text-muted-foreground animate-pulse">Lade Organisationsdaten...</p>
      </section>
    );
  }

  // 1. Nicht-Admins erhalten ForbiddenView (§2.5 Nr. 24)
  if (!session || session.role !== 'admin') {
    return <ForbiddenView currentRole={session?.role} />;
  }

  // 2. Ohne Supabase Demo-Hinweis anzeigen (§2.5 Nr. 28)
  if (!isSupabaseConfigured || !supabase) {
    return (
      <section aria-label="Dashboard-Teams" className="p-[var(--space-6)] max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard-Teams</h1>
        <div
          role="note"
          data-testid="teams-demo-note"
          className="rounded-xl border border-primary/30 bg-primary/10 p-6 text-sm text-[var(--color-text-soft,#e6f3f1)]"
        >
          <p className="font-semibold text-white">
            Team-Freigaben brauchen eine Server-Verbindung.
          </p>
          <p className="mt-1 text-muted-foreground">
            Im lokalen Demo-Modus ohne Supabase-Verbindung stehen Team-Verwaltung und Team-Freigaben
            nicht zur Verfügung.
          </p>
        </div>
      </section>
    );
  }

  const handleFormSubmit = async (name: string, description: string | null) => {
    if (activeForm && activeForm.id) {
      const res = await updateDashboardTeamV2(activeForm.id, name, description);
      if (res.ok) {
        await loadTeams();
        return { ok: true };
      }
      return { ok: false, error: res.error };
    } else {
      const res = await createDashboardTeamV2(name, description);
      if (res.ok) {
        await loadTeams();
        return { ok: true };
      }
      return { ok: false, error: res.error };
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteDashboardTeamV2(deleteTarget.id);
      if (res.ok) {
        if (selectedTeam?.id === deleteTarget.id) {
          setSelectedTeam(null);
        }
        setDeleteTarget(null);
        await loadTeams();
      } else {
        setError(getDashboardTeamErrorMessage(res.error, 'team'));
        setDeleteTarget(null);
      }
    } catch {
      setError('Team konnte nicht gelöscht werden.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section aria-label="Dashboard-Teams" className="p-[var(--space-6)] max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border,#1b3d39)] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Administration
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Dashboard-Teams</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Verwalte Teams und weise Mitglieder zu, um Dashboards gemeinsam zu nutzen.
          </p>
        </div>
        <Button
          data-testid="create-team-button"
          variant="primary"
          onClick={() => setActiveForm({ name: '', description: null })}
        >
          Neues Team anlegen
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          data-testid="teams-error"
          className="mt-6 rounded border border-error/40 bg-error/10 p-3 text-xs text-error"
        >
          {error}
        </div>
      )}

      {/* Team-Tabelle */}
      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse py-8">Lade Teams...</p>
        ) : teams.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] p-8 text-center">
            <p className="text-white font-semibold">Keine Teams vorhanden</p>
            <p className="text-xs text-muted-foreground mt-1">
              Erstelle das erste Team, um Dashboards mit mehreren Nutzern zu teilen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border,#1b3d39)]">
            <table className="w-full text-left text-sm" data-testid="teams-table">
              <thead className="bg-black/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Team-Name</th>
                  <th className="px-4 py-3">Beschreibung</th>
                  <th className="px-4 py-3">Mitglieder</th>
                  <th className="px-4 py-3">Dashboards</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border,#1b3d39)]">
                {teams.map((t) => {
                  const hasDashboards = t.dashboardCount > 0;
                  const deleteDisabledTooltip = hasDashboards
                    ? `Team hat noch ${t.dashboardCount} ${t.dashboardCount === 1 ? 'Dashboard' : 'Dashboards'}. Erst löschen oder als persönliche Kopie sichern.`
                    : undefined;

                  return (
                    <tr
                      key={t.id}
                      data-testid={`team-row-${t.id}`}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-semibold text-white">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.description || '–'}</td>
                      <td className="px-4 py-3">{t.memberCount}</td>
                      <td className="px-4 py-3">{t.dashboardCount}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`manage-members-button-${t.id}`}
                            onClick={() => setSelectedTeam(selectedTeam?.id === t.id ? null : t)}
                            className="text-xs"
                          >
                            {selectedTeam?.id === t.id ? 'Mitglieder schließen' : 'Mitglieder'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`edit-team-button-${t.id}`}
                            onClick={() =>
                              setActiveForm({
                                id: t.id,
                                name: t.name,
                                description: t.description,
                              })
                            }
                            className="text-xs"
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`delete-team-button-${t.id}`}
                            disabled={hasDashboards}
                            title={deleteDisabledTooltip}
                            onClick={() => {
                              if (!hasDashboards) setDeleteTarget(t);
                            }}
                            className="border-error/40 text-error hover:bg-error/10 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Löschen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mitglieder-Detailbereich (§2.5 Nr. 26) */}
      {selectedTeam && (
        <TeamMembersPanel
          key={selectedTeam.id}
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onTeamUpdated={loadTeams}
        />
      )}

      {/* Dialog: Team erstellen/bearbeiten */}
      {activeForm !== false && (
        <TeamFormDialog
          open={true}
          onClose={() => setActiveForm(false)}
          initialData={activeForm}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Dialog: Team löschen */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Team löschen?"
        maxWidth="500px"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto"
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              data-testid="confirm-delete-team-button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Team löschen'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]">
          <p>
            Möchtest du das Team <strong className="text-white">„{deleteTarget?.name}“</strong>{' '}
            wirklich löschen?
          </p>
          <p className="text-xs text-muted-foreground">
            Alle Mitgliedszuordnungen zu diesem Team werden gelöscht. Diese Aktion kann nicht
            rückgängig gemacht werden.
          </p>
        </div>
      </Modal>
    </section>
  );
}
