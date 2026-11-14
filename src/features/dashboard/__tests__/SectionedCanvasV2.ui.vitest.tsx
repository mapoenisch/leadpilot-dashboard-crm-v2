// Executive Dashboard V2 (Auftrag 157 / P09a):
// UI-Tests für SectionedCanvasV2: Rendern, Einklappen (Bearbeitung & Vorschau),
// Entlastungstest mit zählendem useData-Mock, aktiver Bereich, Fokus & Ansagen.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionedCanvasV2 } from '../components/editor/sections/SectionedCanvasV2';
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { useEditorPreviewData } from '../preview/editorPreviewData';

function makeMockTile(id: string, catalogId: string, x: number, y: number): DashboardTileConfigV2 {
  return {
    id,
    catalogId,
    title: `Kachel ${id}`,
    presentation: 'zahl',
    layouts: {
      desktop: { x, y, w: 3, h: 3 },
      tablet: { x, y, w: 3, h: 3 },
      mobile: { x: 0, y, w: 1, h: 3 },
    },
    query: {
      metricId: catalogId,
      timeframe: 'letzte_30_tage',
    },
  };
}

describe('SectionedCanvasV2 UI & Entlastung (P09a)', () => {
  it('rendert ohne Sektionen das identische unsektionierte Raster', () => {
    const config: DashboardConfigV2 = {
      id: 'dash_1',
      version: 2,
      title: 'Test Dashboard',
      scope: 'personal',
      ownerUserId: 'user_1',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [makeMockTile('t1', 'baseline.arr', 0, 0), makeMockTile('t2', 'baseline.mrr', 3, 0)],
      createdAt: '2026-11-14T00:00:00Z',
      updatedAt: '2026-11-14T00:00:00Z',
    };

    render(
      <SectionedCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        useData={useEditorPreviewData}
      />,
    );

    expect(screen.getByTestId('editor-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-grid')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-tile-t1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-tile-t2')).toBeInTheDocument();
    expect(screen.queryByTestId('unsectioned-area')).toBeNull();
  });

  it('rendert Sektionen mit Sektionsköpfen und gruppierten Kacheln', () => {
    const config: DashboardConfigV2 = {
      id: 'dash_1',
      version: 2,
      title: 'Gliedertes Dashboard',
      scope: 'personal',
      ownerUserId: 'user_1',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [
        makeMockTile('t_unsec', 'baseline.arr', 0, 0),
        makeMockTile('t_sec1', 'baseline.mrr', 0, 0),
        makeMockTile('t_sec2', 'baseline.ebitda', 0, 0),
      ],
      sections: [
        {
          id: 'sec_1',
          title: 'Finanzen',
          collapsed: false,
          tileIds: ['t_sec1'],
        },
        {
          id: 'sec_2',
          title: 'Pipeline',
          collapsed: false,
          tileIds: ['t_sec2'],
        },
      ],
      createdAt: '2026-11-14T00:00:00Z',
      updatedAt: '2026-11-14T00:00:00Z',
    };

    render(
      <SectionedCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        useData={useEditorPreviewData}
      />,
    );

    expect(screen.getByTestId('unsectioned-area')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-tile-t_unsec')).toBeInTheDocument();

    expect(screen.getByTestId('dashboard-section-sec_1')).toBeInTheDocument();
    expect(screen.getByTestId('section-title-sec_1')).toHaveTextContent('Finanzen');
    expect(screen.getByTestId('canvas-tile-t_sec1')).toBeInTheDocument();

    expect(screen.getByTestId('dashboard-section-sec_2')).toBeInTheDocument();
    expect(screen.getByTestId('section-title-sec_2')).toHaveTextContent('Pipeline');
    expect(screen.getByTestId('canvas-tile-t_sec2')).toBeInTheDocument();
  });

  it('Entlastungsnachweis: eingeklappte Sektionen rendern keine Kacheln und rufen useData nicht auf', () => {
    const dataCallsPerTile: Record<string, number> = {};

    const useCountingData: TileDataHook = (tile, filters) => {
      dataCallsPerTile[tile.tileId] = (dataCallsPerTile[tile.tileId] ?? 0) + 1;
      return useEditorPreviewData(tile, filters);
    };

    const config: DashboardConfigV2 = {
      id: 'dash_entlastung',
      version: 2,
      title: 'Entlastungs-Test',
      scope: 'personal',
      ownerUserId: 'user_1',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [
        makeMockTile('t_active_1', 'baseline.arr', 0, 0),
        makeMockTile('t_active_2', 'baseline.mrr', 3, 0),
        makeMockTile('t_collapsed_1', 'baseline.ebitda', 0, 0),
        makeMockTile('t_collapsed_2', 'baseline.headcount', 3, 0),
      ],
      sections: [
        {
          id: 'sec_open',
          title: 'Offene Sektion',
          collapsed: false,
          tileIds: ['t_active_1', 't_active_2'],
        },
        {
          id: 'sec_closed',
          title: 'Eingeklappte Sektion',
          collapsed: true,
          tileIds: ['t_collapsed_1', 't_collapsed_2'],
        },
      ],
      createdAt: '2026-11-14T00:00:00Z',
      updatedAt: '2026-11-14T00:00:00Z',
    };

    render(
      <SectionedCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        useData={useCountingData}
      />,
    );

    // Kacheln der offenen Sektion müssen gerendert werden
    expect(screen.getByTestId('canvas-tile-t_active_1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-tile-t_active_2')).toBeInTheDocument();
    expect(dataCallsPerTile['t_active_1']).toBeGreaterThanOrEqual(1);
    expect(dataCallsPerTile['t_active_2']).toBeGreaterThanOrEqual(1);

    // Kacheln der eingeklappten Sektion dürfen WEDER gerendert werden NOCH useData aufrufen
    expect(screen.queryByTestId('canvas-tile-t_collapsed_1')).toBeNull();
    expect(screen.queryByTestId('canvas-tile-t_collapsed_2')).toBeNull();
    expect(dataCallsPerTile['t_collapsed_1']).toBeUndefined();
    expect(dataCallsPerTile['t_collapsed_2']).toBeUndefined();
  });

  it('steuert Einklappen, aktiven Bereich und Bestätigungsdialog barrierefrei', async () => {
    const onToggle = vi.fn();
    const onSelectArea = vi.fn();
    const onConfirmRemove = vi.fn();
    const onCancelRemove = vi.fn();

    const config: DashboardConfigV2 = {
      id: 'dash_a11y',
      version: 2,
      title: 'A11y Test',
      scope: 'personal',
      ownerUserId: 'user_1',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [makeMockTile('t1', 'baseline.arr', 0, 0)],
      sections: [
        {
          id: 'sec_1',
          title: 'Vertrieb',
          collapsed: false,
          tileIds: ['t1'],
        },
      ],
      createdAt: '2026-11-14T00:00:00Z',
      updatedAt: '2026-11-14T00:00:00Z',
    };

    const { rerender } = render(
      <SectionedCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        activeAreaId="sec_1"
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onSelectActiveArea={onSelectArea}
        onToggleCollapseSection={onToggle}
        announcement="Sektion 'Vertrieb' eingeklappt"
        useData={useEditorPreviewData}
      />,
    );

    // Live-Region enthält Ansage
    const liveRegion = screen.getByTestId('grid-a11y-announcement');
    expect(liveRegion).toHaveTextContent("Sektion 'Vertrieb' eingeklappt");

    // Einklapp-Schalter hat aria-expanded="true"
    const toggleBtn = screen.getByTestId('section-collapse-btn-sec_1');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'section-content-sec_1');

    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledWith('sec_1');

    // Aktiver Bereich hat Badge
    expect(screen.getByTestId('section-active-badge-sec_1')).toHaveTextContent(/aktiv/i);

    // Bestätigungsdialog bei Löschen prüfen
    rerender(
      <SectionedCanvasV2
        config={config}
        activeBreakpoint="desktop"
        selectedTileId={null}
        activeAreaId="sec_1"
        onSelectTile={vi.fn()}
        onDeselect={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        sectionToRemove={config.sections![0]}
        onConfirmRemoveSection={onConfirmRemove}
        onCancelRemoveSection={onCancelRemove}
        useData={useEditorPreviewData}
      />,
    );

    expect(screen.getByTestId('remove-section-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('remove-section-dialog-content')).toHaveTextContent(
      '1 Kachel bleibt',
    );

    fireEvent.click(screen.getByTestId('confirm-remove-section-btn'));
    expect(onConfirmRemove).toHaveBeenCalled();
  });
});
