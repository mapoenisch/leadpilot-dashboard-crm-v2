// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareWithTeamDialogV2 } from '../components/editor/selection/ShareWithTeamDialogV2';
import type { DashboardTeamV2, StoredDashboardV2Row } from '../services/dashboardStorageV2Types';
import { getDashboardTeamErrorMessage } from '../model/dashboardTeamMessages';

vi.mock('../services/dashboardTeamsV2', () => ({
  listDashboardTeamsV2: vi.fn(),
}));

import { listDashboardTeamsV2 } from '../services/dashboardTeamsV2';

describe('Auftrag 163 - ShareWithTeamDialogV2 & dashboardTeamMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDashboard: StoredDashboardV2Row = {
    id: 'dash-pers-1',
    title: 'Mein Vertrieb',
    scope: 'personal',
    revision: 2,
    config: {
      version: 2,
      id: 'dash-pers-1',
      title: 'Mein Vertrieb',
      scope: 'personal',
      ownerUserId: 'user-1',
      organizationId: 'org-1',
      globalTimeframe: 'monat',
      tiles: [],
    },
    updatedAt: '2026-11-22T10:00:00Z',
  };

  const mockTeams: DashboardTeamV2[] = [
    {
      id: 'team-write',
      name: 'Vertrieb Nord',
      description: 'Norddeutschland',
      memberCount: 5,
      dashboardCount: 2,
      canWrite: true,
      isMember: true,
    },
    {
      id: 'team-read',
      name: 'Management',
      description: 'Führungskräfte',
      memberCount: 3,
      dashboardCount: 1,
      canWrite: false,
      isMember: true,
    },
  ];

  it('zeigt den Hinweistext zur unabhängigen Team-Kopie und nur Teams mit Schreibrecht', () => {
    const onShare = vi.fn();
    const onClose = vi.fn();

    render(
      <ShareWithTeamDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={mockDashboard}
        onShare={onShare}
        teams={mockTeams}
      />,
    );

    // Hinweistext (§2.1 Nr. 3)
    expect(
      screen.getByText(
        /Das Team erhält eine eigene Kopie\. Dein persönliches Dashboard bleibt bestehen; spätere Änderungen werden nicht abgeglichen\./i,
      ),
    ).toBeInTheDocument();

    // Teamauswahl: nur "Vertrieb Nord" (canWrite === true), "Management" fehlt
    expect(screen.getByRole('option', { name: 'Vertrieb Nord' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Management' })).not.toBeInTheDocument();
  });

  it('deaktiviert den Teilen-Knopf wenn kein Team mit Schreibrecht vorhanden ist', () => {
    const onShare = vi.fn();
    const onClose = vi.fn();

    render(
      <ShareWithTeamDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={mockDashboard}
        onShare={onShare}
        teams={[mockTeams[1]!]} // Nur team-read
      />,
    );

    expect(
      screen.getByText(/Du hast in keinem Team die Berechtigung, Dashboards zu erstellen\./i),
    ).toBeInTheDocument();

    const submitBtn = screen.getByTestId('share-with-team-confirm-button');
    expect(submitBtn).toBeDisabled();
  });

  it('lädt Teams automatisch wenn keine teams-Prop übergeben wurde', async () => {
    vi.mocked(listDashboardTeamsV2).mockResolvedValue({
      ok: true,
      value: mockTeams,
    });

    render(
      <ShareWithTeamDialogV2
        open={true}
        onClose={vi.fn()}
        currentDashboard={mockDashboard}
        onShare={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Vertrieb Nord' })).toBeInTheDocument();
    });
  });

  it('übermittelt Zielteam und Titel beim Teilen', async () => {
    const onShare = vi.fn().mockResolvedValue({ ok: true });
    const onClose = vi.fn();

    render(
      <ShareWithTeamDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={mockDashboard}
        onShare={onShare}
        teams={mockTeams}
      />,
    );

    const titleInput = screen.getByTestId('share-title-input');
    fireEvent.change(titleInput, { target: { value: 'Vertrieb Q4 Team' } });

    const submitBtn = screen.getByTestId('share-with-team-confirm-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onShare).toHaveBeenCalledWith('team-write', 'Vertrieb Q4 Team');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('behandelt Fehlerantworten und boolesche Fehlschläge', async () => {
    const onShare = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();

    render(
      <ShareWithTeamDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={mockDashboard}
        onShare={onShare}
        teams={mockTeams}
      />,
    );

    fireEvent.click(screen.getByTestId('share-with-team-confirm-button'));

    await waitFor(() => {
      expect(screen.getByTestId('share-with-team-error')).toBeInTheDocument();
    });
  });

  it('zeigt deutsche Fehlermeldungen bei Team-Fehlern via dashboardTeamMessages', () => {
    expect(getDashboardTeamErrorMessage({ kind: 'team_zugriff_entzogen' })).toContain(
      'Bearbeitungsrechte für dieses Team-Dashboard wurden entzogen',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_grenze' }, 'dashboard')).toBe(
      'Ein Team kann höchstens 50 Dashboards haben.',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_grenze' }, 'team')).toBe(
      'Eine Organisation kann höchstens 50 Teams haben.',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_grenze' }, 'member')).toBe(
      'Ein Team kann höchstens 200 Mitglieder haben.',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_hat_dashboards' })).toContain(
      'Das Team kann nicht gelöscht werden, da es noch Dashboards enthält',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_name_vergeben' })).toContain(
      'Ein Team mit diesem Namen existiert bereits',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'mitglied_nicht_in_org' })).toContain(
      'gehört nicht zu dieser Organisation',
    );
  });
});
