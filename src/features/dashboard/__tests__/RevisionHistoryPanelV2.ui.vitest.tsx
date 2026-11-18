import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevisionHistoryPanelV2 } from '../components/editor/versions/RevisionHistoryPanelV2';
import { inMemoryStore } from '../services/dashboardInMemoryStoreV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('RevisionHistoryPanelV2', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  const baseConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash_hist_1',
    title: 'Mein Dashboard',
    scope: 'personal',
    ownerUserId: 'usr_me',
    organizationId: 'org_1',
    globalTimeframe: 'letzte_30_tage',
    tiles: [],
  };

  it('gibt null zurück wenn isOpen false ist', () => {
    const { container } = render(
      <RevisionHistoryPanelV2
        isOpen={false}
        onClose={() => {}}
        dashboardId={baseConfig.id}
        currentRevision={1}
        currentConfig={baseConfig}
        onRestoreRevision={async () => true}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('rendert Versionshistorie, schließt über Close-Button und wechselt in Vergleichsmodus', async () => {
    inMemoryStore.set(baseConfig.id, {
      row: {
        id: baseConfig.id,
        title: baseConfig.title,
        scope: 'personal',
        teamId: null,
        teamName: null,
        revision: 2,
        config: baseConfig,
        updatedAt: new Date().toISOString(),
      },
      revisions: [
        {
          revision: 2,
          title: 'Revision 2',
          createdByUserId: 'usr_me',
          createdAt: new Date().toISOString(),
          changeSummary: 'Zweite Version',
          config: baseConfig,
        },
        {
          revision: 1,
          title: 'Revision 1',
          createdByUserId: 'usr_other',
          createdAt: new Date().toISOString(),
          changeSummary: 'Erste Version',
          config: baseConfig,
        },
      ],
    });

    const handleClose = vi.fn();
    const handleRestore = vi.fn().mockResolvedValue(true);

    render(
      <RevisionHistoryPanelV2
        isOpen={true}
        onClose={handleClose}
        dashboardId={baseConfig.id}
        currentRevision={2}
        currentConfig={baseConfig}
        currentUserId="usr_me"
        onRestoreRevision={handleRestore}
      />,
    );

    // Warte auf Laden der Revisionen
    await waitFor(() => {
      expect(screen.getByText('Versionshistorie')).toBeDefined();
      expect(screen.getByText(/Zweite Version/)).toBeDefined();
    });

    // Close-Button
    const closeBtn = screen.getByTestId('close-versions-panel');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Vergleich-Auswahlmodus aktivieren
    const compareToggle = screen.getByTestId('toggle-select-mode-button');
    fireEvent.click(compareToggle);
    expect(screen.getByText('Abbrechen')).toBeDefined();
    expect(screen.getByText(/Wähle 2 Versionen aus/)).toBeDefined();
  });

  it('unterstützt Export des aktuellen Stands', async () => {
    inMemoryStore.set(baseConfig.id, {
      row: {
        id: baseConfig.id,
        title: baseConfig.title,
        scope: 'personal',
        teamId: null,
        teamName: null,
        revision: 1,
        config: baseConfig,
        updatedAt: new Date().toISOString(),
      },
      revisions: [
        {
          revision: 1,
          title: 'Revision 1',
          createdByUserId: 'usr_me',
          createdAt: new Date().toISOString(),
          changeSummary: 'Init',
          config: baseConfig,
        },
      ],
    });

    render(
      <RevisionHistoryPanelV2
        isOpen={true}
        onClose={() => {}}
        dashboardId={baseConfig.id}
        currentRevision={1}
        currentConfig={baseConfig}
        onRestoreRevision={async () => true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('export-current-button')).toBeDefined();
    });

    // Mock createObjectURL & revokeObjectURL & click
    const createObjectUrlSpy = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectUrlSpy = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    globalThis.URL.createObjectURL = createObjectUrlSpy;
    globalThis.URL.revokeObjectURL = revokeObjectUrlSpy;

    const exportBtn = screen.getByTestId('export-current-button');
    fireEvent.click(exportBtn);
    expect(createObjectUrlSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('vergleicht eine Revision mit dem aktuellen Stand und schaltet Diff zurück', async () => {
    const configV1: DashboardConfigV2 = {
      ...baseConfig,
      title: 'Alter Titel V1',
    };

    inMemoryStore.set(baseConfig.id, {
      row: {
        id: baseConfig.id,
        title: 'Neuer Titel V2',
        scope: 'personal',
        teamId: null,
        teamName: null,
        revision: 2,
        config: baseConfig,
        updatedAt: new Date().toISOString(),
      },
      revisions: [
        {
          revision: 2,
          title: 'Neuer Titel V2',
          createdByUserId: 'usr_me',
          createdAt: new Date().toISOString(),
          changeSummary: 'Update Titel',
          config: baseConfig,
        },
        {
          revision: 1,
          title: 'Alter Titel V1',
          createdByUserId: 'usr_other',
          createdAt: new Date().toISOString(),
          changeSummary: 'Init V1',
          config: configV1,
        },
      ],
    });

    render(
      <RevisionHistoryPanelV2
        isOpen={true}
        onClose={() => {}}
        dashboardId={baseConfig.id}
        currentRevision={2}
        currentConfig={baseConfig}
        onRestoreRevision={async () => true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Init V1/)).toBeDefined();
    });

    // Klick auf "Vergleichen" bei Revision 1
    const compareRev1Btn = screen.getByTestId('compare-revision-1');
    fireEvent.click(compareRev1Btn);

    // Diff View sollte sichtbar sein
    await waitFor(() => {
      expect(screen.getByTestId('revision-diff-view')).toBeDefined();
    });

    // Zurück zur Historie
    const backBtn = screen.getByTestId('diff-back-button');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Versionshistorie')).toBeDefined();
    });
  });

  it('führt Wiederherstellung mit Entwurfssicherung als Kopie durch', async () => {
    const draft: DashboardConfigV2 = {
      ...baseConfig,
      title: 'Ungespeicherter Entwurf',
    };

    inMemoryStore.set(baseConfig.id, {
      row: {
        id: baseConfig.id,
        title: baseConfig.title,
        scope: 'personal',
        teamId: null,
        teamName: null,
        revision: 2,
        config: baseConfig,
        updatedAt: new Date().toISOString(),
      },
      revisions: [
        {
          revision: 2,
          title: 'V2',
          createdByUserId: 'usr_me',
          createdAt: new Date().toISOString(),
          changeSummary: 'V2',
          config: baseConfig,
        },
        {
          revision: 1,
          title: 'V1',
          createdByUserId: 'usr_me',
          createdAt: new Date().toISOString(),
          changeSummary: 'V1',
          config: baseConfig,
        },
      ],
    });

    const handleRestore = vi.fn().mockResolvedValue(true);
    const handleSaveAsCopy = vi.fn().mockResolvedValue({ ok: true });

    render(
      <RevisionHistoryPanelV2
        isOpen={true}
        onClose={() => {}}
        dashboardId={baseConfig.id}
        currentRevision={2}
        currentConfig={baseConfig}
        draftConfig={draft}
        isDirty={true}
        onRestoreRevision={handleRestore}
        onSaveAsCopy={handleSaveAsCopy}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('restore-revision-1')).toBeDefined();
    });

    // Klick auf Wiederherstellen Revision 1
    fireEvent.click(screen.getByTestId('restore-revision-1'));

    // Bestätigungsdialog sollte geöffnet sein
    await waitFor(() => {
      expect(screen.getByTestId('restore-save-copy-button')).toBeDefined();
    });

    // Klick auf Kopie sichern und wiederherstellen
    const confirmBtn = screen.getByTestId('restore-save-copy-button');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleRestore).toHaveBeenCalledWith(1, { saveDraftAsCopy: true });
    });
  });
});
