import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { useEditorPreviewData } from '../preview/editorPreviewData';

const MOCK_INITIAL_CONFIG: DashboardConfigV2 = {
  version: 2,
  id: 'dash-shell-test',
  title: 'Shell Test Dashboard',
  scope: 'personal',
  ownerUserId: 'usr-pilot',
  organizationId: 'org-pilot',
  globalTimeframe: 'letzte_30_tage',
  tiles: [
    {
      id: 'tile-init-1',
      catalogId: 'baseline.arr',
      title: 'Initial ARR',
      presentation: 'zahl',
      layouts: {
        desktop: { x: 0, y: 0, w: 3, h: 3 },
      },
    },
  ],
};

describe('DashboardEditorShellV2', () => {
  it('rendert alle Zonen: Top-Bar, Widget-Bibliothek, Canvas, Inspector und Statusleiste', () => {
    render(
      <DashboardEditorShellV2
        initialConfig={MOCK_INITIAL_CONFIG}
        useData={useEditorPreviewData}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeInTheDocument();
    expect(screen.getByTestId('editor-top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('widget-library')).toBeInTheDocument();
    expect(screen.getByTestId('editor-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('editor-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('editor-status-bar')).toBeInTheDocument();
  });

  it('fügt eine Kachel aus der Bibliothek hinzu und unterstützt Undo/Redo', async () => {
    render(
      <DashboardEditorShellV2
        initialConfig={MOCK_INITIAL_CONFIG}
        useData={useEditorPreviewData}
        onSave={vi.fn()}
      />,
    );

    // Initial 1 Kachel
    expect(screen.getAllByTestId(/^canvas-tile-/)).toHaveLength(1);

    // Klick auf Hinzufügen bei der ersten Bibliothekskachel
    const addButtons = screen.getAllByTestId(/^add-tile-btn-/);
    fireEvent.click(addButtons[0]!);

    // Nun 2 Kacheln vorhanden
    expect(screen.getAllByTestId(/^canvas-tile-/)).toHaveLength(2);

    // Dirty-Indikator ist aktiv
    expect(screen.getByTestId('dirty-indicator')).toBeInTheDocument();

    // Undo über Top-Bar
    const undoBtn = screen.getByTestId('undo-button');
    expect(undoBtn).not.toBeDisabled();
    fireEvent.click(undoBtn);

    // Wieder 1 Kachel
    expect(screen.getAllByTestId(/^canvas-tile-/)).toHaveLength(1);

    // Redo über Top-Bar
    const redoBtn = screen.getByTestId('redo-button');
    expect(redoBtn).not.toBeDisabled();
    fireEvent.click(redoBtn);

    // Wieder 2 Kacheln
    expect(screen.getAllByTestId(/^canvas-tile-/)).toHaveLength(2);
  });

  it('entfernt eine Kachel über die Canvas-Schnellaktion', () => {
    render(
      <DashboardEditorShellV2
        initialConfig={MOCK_INITIAL_CONFIG}
        useData={useEditorPreviewData}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByTestId('canvas-tile-tile-init-1')).toBeInTheDocument();

    const removeBtn = screen.getByTestId('tile-remove-btn-tile-init-1');
    fireEvent.click(removeBtn);

    // Canvas ist nun leer -> Leerzustand wird angezeigt
    expect(screen.getByTestId('canvas-empty-state')).toBeInTheDocument();
  });

  it('schaltet in den Vorschau-Modus um und blendet Hilfspaneele aus', () => {
    render(
      <DashboardEditorShellV2
        initialConfig={MOCK_INITIAL_CONFIG}
        useData={useEditorPreviewData}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByTestId('widget-library')).toBeInTheDocument();
    expect(screen.getByTestId('editor-inspector')).toBeInTheDocument();

    // Vorschau aktivieren
    const previewBtn = screen.getByTestId('preview-mode-button');
    fireEvent.click(previewBtn);

    // Seitenpaneele sind im Vorschaumodus ausgeblendet
    expect(screen.queryByTestId('widget-library')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-inspector')).not.toBeInTheDocument();
    expect(screen.getByTestId('editor-canvas')).toBeInTheDocument();

    // Vorschau wieder deaktivieren
    fireEvent.click(previewBtn);
    expect(screen.getByTestId('widget-library')).toBeInTheDocument();
    expect(screen.getByTestId('editor-inspector')).toBeInTheDocument();
  });

  it('wechselt Breakpoints über die Top-Bar', () => {
    render(
      <DashboardEditorShellV2
        initialConfig={MOCK_INITIAL_CONFIG}
        useData={useEditorPreviewData}
        onSave={vi.fn()}
      />,
    );

    const canvas = screen.getByTestId('editor-canvas');
    expect(canvas).toHaveAttribute('data-breakpoint', 'desktop');

    // Tablet
    fireEvent.click(screen.getByTestId('breakpoint-tablet'));
    expect(canvas).toHaveAttribute('data-breakpoint', 'tablet');

    // Mobile
    fireEvent.click(screen.getByTestId('breakpoint-mobile'));
    expect(canvas).toHaveAttribute('data-breakpoint', 'mobile');
  });

  it('ruft onSave auf, wenn der Entwurf ungespeichert ist', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <DashboardEditorShellV2
        initialConfig={MOCK_INITIAL_CONFIG}
        useData={useEditorPreviewData}
        onSave={onSave}
      />,
    );

    const saveBtn = screen.getByTestId('save-button');
    // Vor Änderung deaktiviert
    expect(saveBtn).toBeDisabled();

    // Titel ändern
    fireEvent.click(screen.getByTestId('title-button'));
    const input = screen.getByTestId('title-input');
    fireEvent.change(input, { target: { value: 'Geänderter Dashboard Titel' } });
    fireEvent.blur(input);

    // Nun ist der Entwurf dirty und Speichern aktiv
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0]![0].title).toBe('Geänderter Dashboard Titel');
    });
  });
});
