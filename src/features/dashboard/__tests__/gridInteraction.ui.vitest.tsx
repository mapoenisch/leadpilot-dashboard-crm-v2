import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { EditorCanvasV2 } from '../components/editor/EditorCanvasV2';
import { useEditorPreviewData } from '../preview/editorPreviewData';

function createTestConfig(): DashboardConfigV2 {
  return {
    version: 2,
    id: 'dash_grid_test',
    title: 'Rasterengine Test Dashboard',
    scope: 'personal',
    ownerUserId: 'user_test',
    organizationId: 'org_test',
    globalTimeframe: '30d',
    globalPipeline: 'standard',
    tiles: [
      {
        id: 'tile_arr',
        catalogId: 'baseline.arr',
        title: 'Annual Recurring Revenue',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 6, h: 4 },
          tablet: { x: 0, y: 0, w: 6, h: 4 },
          mobile: { x: 0, y: 0, w: 1, h: 4 },
        },
      },
      {
        id: 'tile_mrr',
        catalogId: 'baseline.mrr',
        title: 'Monthly Recurring Revenue',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 6, y: 0, w: 6, h: 4 },
          tablet: { x: 0, y: 4, w: 6, h: 4 },
          mobile: { x: 0, y: 4, w: 1, h: 4 },
        },
      },
    ],
  };
}

describe('EditorCanvasV2 Rasterengine & WAI-ARIA Grid (P06)', () => {
  it('rendert semantisches WAI-ARIA grid mit 12 Spalten und gridcells', () => {
    const config = createTestConfig();
    const onSelectTile = vi.fn();

    render(
      <EditorCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        onSelectTile={onSelectTile}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        useData={useEditorPreviewData}
      />,
    );

    const grid = screen.getByRole('grid', { name: /dashboard-editor arbeitsfläche/i });
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('aria-colcount', '12');

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(2);

    expect(cells[0]).toHaveAttribute('aria-colindex', '1');
    expect(cells[0]).toHaveAttribute('aria-rowindex', '1');
    expect(cells[1]).toHaveAttribute('aria-colindex', '7');
    expect(cells[1]).toHaveAttribute('aria-rowindex', '1');
  });

  it('verschiebt Kachel per Alt+ArrowRight und gibt Screenreader-Ansage aus', () => {
    const config = createTestConfig();
    const onCommitLayout = vi.fn();
    const onSelectTile = vi.fn();

    render(
      <EditorCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId="tile_arr"
        onSelectTile={onSelectTile}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onCommitLayout={onCommitLayout}
        useData={useEditorPreviewData}
      />,
    );

    // Alt + ArrowRight drücken
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });

    expect(onCommitLayout).toHaveBeenCalled();
    const moves = onCommitLayout.mock.calls[0]![0];
    expect(moves[0].tileId).toBe('tile_arr');
    expect(moves[0].from.x).toBe(0);
    expect(moves[0].to.x).toBe(1);

    // Screenreader Live-Region
    const announcement = screen.getByTestId('grid-a11y-announcement');
    expect(announcement.textContent).toMatch(/verschoben auf spalte 2/i);
  });

  it('skaliert Kachel per Alt+Shift+ArrowRight und meldet Größenänderung', () => {
    const config = createTestConfig();
    const onCommitLayout = vi.fn();

    render(
      <EditorCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId="tile_arr"
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onCommitLayout={onCommitLayout}
        useData={useEditorPreviewData}
      />,
    );

    // Alt + Shift + ArrowRight drücken
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true, shiftKey: true });

    expect(onCommitLayout).toHaveBeenCalled();
    const moves = onCommitLayout.mock.calls[0]![0];
    expect(moves[0].tileId).toBe('tile_arr');
    expect(moves[0].from.w).toBe(6);
    expect(moves[0].to.w).toBe(7);

    const announcement = screen.getByTestId('grid-a11y-announcement');
    expect(announcement.textContent).toMatch(/skaliert auf 7 spalten/i);
  });

  it('rendert Resize-Handles im Bearbeitungsmodus auf Desktop', () => {
    const config = createTestConfig();

    render(
      <EditorCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId="tile_arr"
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        useData={useEditorPreviewData}
      />,
    );

    expect(screen.getByTestId('resize-handle-se-tile_arr')).toBeInTheDocument();
    expect(screen.getByTestId('resize-handle-e-tile_arr')).toBeInTheDocument();
    expect(screen.getByTestId('resize-handle-s-tile_arr')).toBeInTheDocument();
  });

  it('verarbeitet HTML5-Drop von der Widget-Bibliothek mit Zielkoordinaten', () => {
    const config = createTestConfig();
    const onAddTileAtPosition = vi.fn();

    render(
      <EditorCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onAddTileAtPosition={onAddTileAtPosition}
        useData={useEditorPreviewData}
      />,
    );

    const canvas = screen.getByTestId('editor-canvas');

    const dataTransfer = {
      getData: (format: string) => (format === 'text/leadpilot-kpi' ? 'baseline.arr' : ''),
    };

    fireEvent.drop(canvas, {
      dataTransfer,
      clientX: 200,
      clientY: 100,
    });

    expect(onAddTileAtPosition).toHaveBeenCalledWith(
      'baseline.arr',
      expect.objectContaining({
        w: 6,
        h: 4,
      }),
    );
  });

  it('ignoriert Drops ohne bekannte Katalog-ID (Auftrag 151 / N-5)', () => {
    const onAddTileAtPosition = vi.fn();
    render(
      <EditorCanvasV2
        config={createTestConfig()}
        activeBreakpoint="desktop"
        selectedTileId={null}
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onAddTileAtPosition={onAddTileAtPosition}
        useData={useEditorPreviewData}
      />,
    );
    const canvas = screen.getByTestId('editor-canvas');
    for (const text of ['beliebiger Text', 'https://example.org', 'win_rate']) {
      fireEvent.drop(canvas, {
        dataTransfer: { getData: (f: string) => (f === 'text/plain' ? text : '') },
        clientX: 50,
        clientY: 50,
      });
    }
    expect(onAddTileAtPosition).not.toHaveBeenCalled();
  });

  it('bietet auf Mobile Pfeil-Schaltflächen für vertikales Verschieben', () => {
    const config = createTestConfig();
    const onMoveMobile = vi.fn();

    render(
      <EditorCanvasV2
        config={config}
        activeBreakpoint="mobile"
        selectedTileId="tile_arr"
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onMoveMobile={onMoveMobile}
        useData={useEditorPreviewData}
      />,
    );

    // Auf Mobile keine Resize-Handles
    expect(screen.queryByTestId('resize-handle-se-tile_arr')).not.toBeInTheDocument();

    // Aber vertikale Pfeil-Buttons
    const downBtn = screen.getByTestId('tile-move-down-btn-tile_arr');
    expect(downBtn).toBeInTheDocument();
    fireEvent.click(downBtn);
    expect(onMoveMobile).toHaveBeenCalledWith('tile_arr', 'down');
  });
});
