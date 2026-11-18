import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewDashboardDialogV2 } from '../components/editor/selection/NewDashboardDialogV2';
import { DuplicateDashboardDialogV2 } from '../components/editor/selection/DuplicateDashboardDialogV2';
import type { StoredDashboardV2Row } from '../services/dashboardStorageV2Types';

const baseDashboard: StoredDashboardV2Row = {
  id: 'dash-1',
  title: 'Vertriebs-Cockpit',
  scope: 'personal',
  revision: 3,
  config: {
    version: 2,
    id: 'dash-1',
    title: 'Vertriebs-Cockpit',
    scope: 'personal',
    ownerUserId: 'u1',
    organizationId: 'org1',
    globalTimeframe: 'aktuell',
    sections: [],
    tiles: [],
    metadata: {},
  },
  updatedAt: '2026-11-18T10:00:00.000Z',
};

const teams = [
  {
    id: 't-alpha',
    name: 'Team Alpha',
    description: null,
    canWrite: true,
    isMember: true,
    memberCount: 3,
    dashboardCount: 1,
  },
];

describe('Dialog Target Retention Tests', () => {
  it('behaelt gewaehltes Team-Ziel bei Titel- und Vorlagenaenderungen in NewDashboardDialogV2 bei', async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <NewDashboardDialogV2
        open={true}
        onClose={onClose}
        existingDashboards={[]}
        onCreate={onCreate}
        teams={teams}
      />,
    );

    const targetSelect = screen.getByTestId('new-dashboard-target-select');
    expect(targetSelect).toHaveValue('personal');

    // Nutzer wählt Team
    fireEvent.change(targetSelect, { target: { value: 'team:t-alpha' } });
    expect(targetSelect).toHaveValue('team:t-alpha');

    // Nutzer ändert danach den Titel
    const titleInput = screen.getByTestId('new-dashboard-title-input');
    fireEvent.change(titleInput, { target: { value: 'Unser Team Dashboard' } });

    // Vorlage wechseln
    await waitFor(() => {
      expect(screen.getByTestId('template-card-sales')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('template-card-sales'));

    // Ziel muss weiterhin Team Alpha sein!
    expect(targetSelect).toHaveValue('team:t-alpha');

    // Submit ausführen
    fireEvent.click(screen.getByTestId('create-dashboard-submit-button'));
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('sales', 'Unser Team Dashboard', {
        scope: 'team',
        teamId: 't-alpha',
      });
    });
  });

  it('behaelt gewaehltes Team-Ziel bei Titelaenderung in DuplicateDashboardDialogV2 bei', async () => {
    const onDuplicate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <DuplicateDashboardDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={baseDashboard}
        onDuplicate={onDuplicate}
        teams={teams}
        isDirty={false}
      />,
    );

    const targetSelect = screen.getByTestId('duplicate-dashboard-target-select');
    expect(targetSelect).toHaveValue('personal');

    // Nutzer wählt Team
    fireEvent.change(targetSelect, { target: { value: 'team:t-alpha' } });
    expect(targetSelect).toHaveValue('team:t-alpha');

    // Nutzer bearbeitet den Titel
    const titleInput = screen.getByTestId('duplicate-dashboard-title-input');
    fireEvent.change(titleInput, { target: { value: 'Kopie fuer Alpha' } });

    // Ziel bleibt unverändert
    expect(targetSelect).toHaveValue('team:t-alpha');

    // Duplizieren absenden
    fireEvent.click(screen.getByTestId('duplicate-submit-button'));
    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith('Kopie fuer Alpha', false, {
        scope: 'team',
        teamId: 't-alpha',
      });
    });
  });

  it('behaelt bearbeiteten Titel bei nachtraeglichem Wechsel des Ziels auf Team in DuplicateDashboardDialogV2 bei', async () => {
    const onDuplicate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <DuplicateDashboardDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={baseDashboard}
        onDuplicate={onDuplicate}
        teams={teams}
        isDirty={false}
      />,
    );

    // Nutzer bearbeitet zuerst den Titel
    const titleInput = screen.getByTestId('duplicate-dashboard-title-input');
    fireEvent.change(titleInput, { target: { value: 'Mein eigener Kopientitel' } });
    expect(titleInput).toHaveValue('Mein eigener Kopientitel');

    // Nutzer wechselt danach das Ziel auf Team
    const targetSelect = screen.getByTestId('duplicate-dashboard-target-select');
    fireEvent.change(targetSelect, { target: { value: 'team:t-alpha' } });
    expect(targetSelect).toHaveValue('team:t-alpha');

    // Titel darf NICHT überschrieben worden sein!
    expect(titleInput).toHaveValue('Mein eigener Kopientitel');

    // Duplizieren absenden
    fireEvent.click(screen.getByTestId('duplicate-submit-button'));
    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith('Mein eigener Kopientitel', false, {
        scope: 'team',
        teamId: 't-alpha',
      });
    });
  });
});
