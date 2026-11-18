import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteDashboardDialogV2 } from '../components/editor/selection/DeleteDashboardDialogV2';
import { DuplicateDashboardDialogV2 } from '../components/editor/selection/DuplicateDashboardDialogV2';
import { NewDashboardDialogV2 } from '../components/editor/selection/NewDashboardDialogV2';
import type {
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';

const createTile = (id: string, title: string) => ({
  id,
  catalogId: 'baseline.arr',
  title,
  presentation: 'balken',
  layouts: { desktop: { x: 0, y: 0, w: 2, h: 2 } },
});

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
    tiles: [createTile('t-1', 'Pipeline')],
    metadata: {},
  },
  updatedAt: '2026-11-18T10:00:00.000Z',
};

describe('DeleteDashboardDialogV2 UI-Tests', () => {
  it('rendert Titel und Kachelanzahl (Einzahl) und löscht bei Bestätigung', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <DeleteDashboardDialogV2
        open={true}
        onClose={onClose}
        dashboard={baseDashboard}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/1 Kachel/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /„Vertriebs-Cockpit“ endgültig löschen/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /„Vertriebs-Cockpit“ endgültig löschen/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('rendert Mehrzahl bei mehreren Kacheln und zeigt Fehler wenn onConfirm fehlschlägt', async () => {
    const onConfirm = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    const multiTileDashboard: StoredDashboardV2Row = {
      ...baseDashboard,
      config: {
        ...baseDashboard.config,
        tiles: [...baseDashboard.config.tiles, createTile('t-2', 'T2')],
      },
    };

    render(
      <DeleteDashboardDialogV2
        open={true}
        onClose={onClose}
        dashboard={multiTileDashboard}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/2 Kacheln/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /„Vertriebs-Cockpit“ endgültig löschen/i }));
    await waitFor(() => {
      expect(screen.getByTestId('delete-dashboard-error')).toHaveTextContent(
        'Das Dashboard konnte nicht gelöscht werden.',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DuplicateDashboardDialogV2 UI-Tests', () => {
  it('dupliziert sauberes Dashboard mit Standardtitel', async () => {
    const onDuplicate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <DuplicateDashboardDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={baseDashboard}
        isDirty={false}
        onDuplicate={onDuplicate}
      />,
    );

    const input = screen.getByTestId('duplicate-dashboard-title-input');
    expect(input).toHaveValue('Vertriebs-Cockpit (Kopie)');

    fireEvent.click(screen.getByTestId('duplicate-submit-button'));
    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith('Vertriebs-Cockpit (Kopie)', false);
    });
  });

  it('unterstützt Dirty-Modus mit Speichern & Duplizieren und Nur Stand duplizieren', async () => {
    const onDuplicate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    const { rerender } = render(
      <DuplicateDashboardDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={baseDashboard}
        isDirty={true}
        onDuplicate={onDuplicate}
      />,
    );

    expect(screen.getByText('Ungespeicherte Änderungen vorhanden')).toBeInTheDocument();

    // Klick auf Speichern & Duplizieren
    fireEvent.click(screen.getByRole('button', { name: 'Speichern & duplizieren' }));
    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith('Vertriebs-Cockpit (Kopie)', true);
    });

    onDuplicate.mockClear();

    // Klick auf Nur Stand duplizieren
    fireEvent.click(screen.getByRole('button', { name: 'Nur Stand duplizieren' }));
    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith('Vertriebs-Cockpit (Kopie)', false);
    });

    // Validierungsfehler bei leerem Titel -> Button deaktiviert
    onDuplicate.mockClear();
    const input = screen.getByTestId('duplicate-dashboard-title-input');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Speichern & duplizieren' })).toBeDisabled();

    // Validierungsfehler bei zu langem Titel
    fireEvent.change(input, { target: { value: 'A'.repeat(81) } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern & duplizieren' }));
    await waitFor(() => {
      expect(screen.getByTestId('duplicate-dashboard-error')).toHaveTextContent(
        'Der Titel darf höchstens 80 Zeichen lang sein.',
      );
    });

    // Fehlschlag bei onDuplicate
    onDuplicate.mockResolvedValueOnce(false);
    fireEvent.change(input, { target: { value: 'Gültig' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern & duplizieren' }));
    await waitFor(() => {
      expect(screen.getByTestId('duplicate-dashboard-error')).toHaveTextContent(
        'Das Dashboard konnte nicht dupliziert werden.',
      );
    });

    // Abbrechen
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onClose).toHaveBeenCalled();

    // isSaving Zustand
    rerender(
      <DuplicateDashboardDialogV2
        open={true}
        onClose={onClose}
        currentDashboard={baseDashboard}
        isDirty={true}
        isSaving={true}
        onDuplicate={onDuplicate}
      />,
    );
    expect(screen.getByRole('button', { name: 'Wird gespeichert & dupliziert...' })).toBeDisabled();
  });
});

describe('NewDashboardDialogV2 UI-Tests', () => {
  const existingList: PersonalDashboardListItemV2[] = [
    {
      id: 'd-1',
      title: 'Executive Summary',
      scope: 'personal',
      revision: 1,
      tileCount: 4,
      sectionCount: 2,
      updatedAt: '2026-11-18T10:00:00.000Z',
    },
  ];

  it('schlägt eindeutigen Namen vor und erstellt Dashboard', async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <NewDashboardDialogV2
        open={true}
        onClose={onClose}
        existingDashboards={existingList}
        onCreate={onCreate}
      />,
    );

    // Eindeutiger Titel wurde auf "Executive Summary 2" gesetzt
    await waitFor(() => {
      const input = screen.getByTestId('new-dashboard-title-input');
      expect(input).toHaveValue('Executive Summary 2');
    });

    // Manuelles Bearbeiten des Titels
    const input = screen.getByTestId('new-dashboard-title-input');
    fireEvent.change(input, { target: { value: 'Mein neues Cockpit' } });
    expect(input).toHaveValue('Mein neues Cockpit');

    // Submit
    fireEvent.click(screen.getByTestId('create-dashboard-submit-button'));
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('executive', 'Mein neues Cockpit');
    });
  });

  it('validiert leeren oder zu langen Titel und zeigt Fehler bei Fehlschlag', async () => {
    const onCreate = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();

    render(
      <NewDashboardDialogV2
        open={true}
        onClose={onClose}
        existingDashboards={[]}
        onCreate={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('new-dashboard-title-input')).toHaveValue('Executive Summary');
    });

    const input = screen.getByTestId('new-dashboard-title-input');
    const submitBtn = screen.getByTestId('create-dashboard-submit-button');

    // Leerer Titel -> Button deaktiviert
    fireEvent.change(input, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled();

    // Zu langer Titel (> 80 Zeichen)
    fireEvent.change(input, { target: { value: 'X'.repeat(81) } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByTestId('new-dashboard-error')).toHaveTextContent(
        'Der Titel darf höchstens 80 Zeichen lang sein.',
      );
    });

    // Server-Fehler bei onCreate
    fireEvent.change(input, { target: { value: 'Fehlversuch' } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByTestId('new-dashboard-error')).toHaveTextContent(
        'Das Dashboard konnte nicht angelegt werden.',
      );
    });

    // Abbrechen
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('wechselt die Vorlage und aktualisiert den Titel automatisch', async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <NewDashboardDialogV2
        open={true}
        onClose={onClose}
        existingDashboards={[]}
        onCreate={onCreate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('template-card-sales')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('template-card-sales'));
    expect(screen.getByTestId('new-dashboard-title-input')).toHaveValue('Vertrieb & Pipeline');

    fireEvent.click(screen.getByTestId('create-dashboard-submit-button'));
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('sales', 'Vertrieb & Pipeline');
    });
  });

  it('blockiert Formular-Submits während isSaving aktiv ist (P2 Finding 3)', async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <NewDashboardDialogV2
        open={true}
        onClose={onClose}
        existingDashboards={[]}
        onCreate={onCreate}
        isSaving={true}
      />,
    );

    const form = screen.getByTestId('new-dashboard-dialog');
    fireEvent.submit(form);
    expect(onCreate).not.toHaveBeenCalled();

    const input = screen.getByTestId('new-dashboard-title-input');
    expect(input).toBeDisabled();
  });

  it('prüft Obergrenze zielabhängig und blockiert persönliches Ziel bei 20 Dashboards', async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    const twentyPersonal = Array.from({ length: 20 }, (_, i) => ({
      id: `p-${i}`,
      title: `Personal ${i}`,
      scope: 'personal' as const,
      canWrite: true,
      revision: 1,
      tileCount: 0,
      sectionCount: 0,
      updatedAt: new Date().toISOString(),
    }));

    render(
      <NewDashboardDialogV2
        open={true}
        onClose={onClose}
        existingDashboards={twentyPersonal}
        onCreate={onCreate}
        teams={[
          {
            id: 't-1',
            name: 'Vertrieb',
            description: null,
            canWrite: true,
            isMember: true,
            memberCount: 2,
            dashboardCount: 1,
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('new-dashboard-target-select')).toHaveValue('team:t-1');
    });

    // Wählt man manuell "personal", wird der Submit gesperrt und der Hinweis angezeigt
    fireEvent.change(screen.getByTestId('new-dashboard-target-select'), {
      target: { value: 'personal' },
    });

    expect(screen.getByTestId('new-dashboard-target-blocked')).toBeInTheDocument();
    expect(screen.getByTestId('create-dashboard-submit-button')).toBeDisabled();
  });
});
