import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EditorInspectorV2 } from '../components/editor/EditorInspectorV2';
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';

const MOCK_CONFIG: DashboardConfigV2 = {
  version: 2,
  id: 'dash-test-inspector',
  title: 'Test Dashboard',
  scope: 'personal',
  ownerUserId: 'usr-1',
  organizationId: 'org-1',
  globalTimeframe: 'letzte_30_tage',
  tiles: [],
};

const MOCK_TILE: DashboardTileConfigV2 = {
  id: 'tile-arr-001',
  catalogId: 'baseline.arr',
  title: 'Annual Recurring Revenue',
  presentation: 'zahl',
  layouts: {
    desktop: { x: 0, y: 0, w: 3, h: 3 },
  },
};

describe('EditorInspectorV2', () => {
  it('zeigt den Leerzustand mit Dashboard-Metadaten, wenn keine Kachel ausgewählt ist', () => {
    const onDeselect = vi.fn();
    render(
      <EditorInspectorV2
        selectedTile={null}
        config={MOCK_CONFIG}
        onDeselect={onDeselect}
        onTileTitleChange={vi.fn()}
        onTileViewChange={vi.fn()}
        onTileOverrideChange={vi.fn()}
        onTileThresholdChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('inspector-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tipps & Tastaturkürzel')).toBeInTheDocument();
  });

  it('zeigt Kachelinformationen und 4 Tabs bei Kachelauswahl', () => {
    render(
      <EditorInspectorV2
        selectedTile={MOCK_TILE}
        config={MOCK_CONFIG}
        onDeselect={vi.fn()}
        onTileTitleChange={vi.fn()}
        onTileViewChange={vi.fn()}
        onTileOverrideChange={vi.fn()}
        onTileThresholdChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('inspector-tile-content')).toBeInTheDocument();
    expect(screen.getByText('Annual Recurring Revenue')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-tab-darstellung')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-tab-daten')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-tab-schwellenwerte')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-tab-interaktion')).toBeInTheDocument();
  });

  it('löst onTileTitleChange bei Verlassen des Titelfelds aus', () => {
    const onTileTitleChange = vi.fn();
    render(
      <EditorInspectorV2
        selectedTile={MOCK_TILE}
        config={MOCK_CONFIG}
        onDeselect={vi.fn()}
        onTileTitleChange={onTileTitleChange}
        onTileViewChange={vi.fn()}
        onTileOverrideChange={vi.fn()}
        onTileThresholdChange={vi.fn()}
      />,
    );

    const input = screen.getByTestId('inspector-title-input');
    fireEvent.change(input, { target: { value: 'Neuer ARR Titel' } });
    fireEvent.blur(input);

    expect(onTileTitleChange).toHaveBeenCalledWith('tile-arr-001', 'Neuer ARR Titel');
  });

  it('schaltet zwischen Tabs um und reagiert auf Alarme & Interaktion', () => {
    const onTileThresholdChange = vi.fn();
    const onTileDrilldownChange = vi.fn();

    render(
      <EditorInspectorV2
        selectedTile={MOCK_TILE}
        config={MOCK_CONFIG}
        onDeselect={vi.fn()}
        onTileTitleChange={vi.fn()}
        onTileViewChange={vi.fn()}
        onTileOverrideChange={vi.fn()}
        onTileThresholdChange={onTileThresholdChange}
        onTileDrilldownChange={onTileDrilldownChange}
      />,
    );

    // Tab Alarme
    fireEvent.click(screen.getByTestId('inspector-tab-schwellenwerte'));
    expect(screen.getByTestId('tab-content-schwellenwerte')).toBeInTheDocument();

    const toggle = screen.getByTestId('threshold-enable-toggle');
    fireEvent.click(toggle);
    expect(onTileThresholdChange).toHaveBeenCalledWith(
      'tile-arr-001',
      expect.objectContaining({ enabled: true }),
    );

    // Tab Interaktion
    fireEvent.click(screen.getByTestId('inspector-tab-interaktion'));
    expect(screen.getByTestId('tab-content-interaktion')).toBeInTheDocument();

    const drilldownInput = screen.getByTestId('drilldown-url-input');
    fireEvent.change(drilldownInput, { target: { value: '/crm/deals' } });
    expect(onTileDrilldownChange).toHaveBeenCalledWith('tile-arr-001', '/crm/deals');
  });

  it('löst onDeselect beim Klick auf Auswahl aufheben aus', () => {
    const onDeselect = vi.fn();
    render(
      <EditorInspectorV2
        selectedTile={MOCK_TILE}
        config={MOCK_CONFIG}
        onDeselect={onDeselect}
        onTileTitleChange={vi.fn()}
        onTileViewChange={vi.fn()}
        onTileOverrideChange={vi.fn()}
        onTileThresholdChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('inspector-deselect-btn'));
    expect(onDeselect).toHaveBeenCalledTimes(1);
  });
});
