// Auftrag 174a: Nacharbeit aus dem Hosted-Smoke-Test (L1/L3/L7 Seitenbereiche, F1 Panel-Editor).
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EditorInspectorV2 } from '../components/editor/EditorInspectorV2';
import {
  INSPECTOR_PANEL_PX,
  LIBRARY_PANEL_PX,
  MIN_CANVAS_PX,
  defaultPanelsFor,
  panelModeFor,
} from '../components/editor/useEditorPanelLayout';
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';

const CONFIG: DashboardConfigV2 = {
  version: 2,
  id: 'dash-174a',
  title: 'Smoke-Test',
  scope: 'personal',
  ownerUserId: 'usr-1',
  organizationId: 'org-1',
  globalTimeframe: 'letzte_30_tage',
  tiles: [],
};

const TILE: DashboardTileConfigV2 = {
  id: 'tile-arr-verlauf',
  catalogId: 'baseline.arr_verlauf',
  title: 'ARR-Verlauf',
  presentation: 'linie',
  layouts: { desktop: { x: 0, y: 6, w: 6, h: 4 } },
};

function renderInspector(onOpenPanelEditor?: (id: string) => void) {
  return render(
    <EditorInspectorV2
      selectedTile={TILE}
      config={CONFIG}
      onDeselect={vi.fn()}
      onTileTitleChange={vi.fn()}
      onTileViewChange={vi.fn()}
      onTileOverrideChange={vi.fn()}
      onTileThresholdChange={vi.fn()}
      onOpenPanelEditor={onOpenPanelEditor}
    />,
  );
}

describe('Auftrag 174a: Seitenbereiche nach verfügbarer Editorbreite', () => {
  const both = LIBRARY_PANEL_PX + INSPECTOR_PANEL_PX + MIN_CANVAS_PX;
  const one = INSPECTOR_PANEL_PX + MIN_CANVAS_PX;

  it('teilt die Breite in beide / eine / überlagert / Blatt', () => {
    expect(panelModeFor(both, 'desktop')).toBe('beide');
    expect(panelModeFor(both - 1, 'desktop')).toBe('eine');
    expect(panelModeFor(one, 'desktop')).toBe('eine');
    expect(panelModeFor(one - 1, 'desktop')).toBe('ueberlagert');
    // Reproduktion: 1059 px Fenster in der App-Hülle = 735 px Editor
    expect(panelModeFor(735, 'desktop')).toBe('ueberlagert');
    expect(panelModeFor(736, 'tablet')).toBe('ueberlagert');
    expect(panelModeFor(343, 'mobile')).toBe('blatt');
    expect(panelModeFor(4000, 'mobile')).toBe('blatt');
  });

  it('Grundstellung je Modus lässt der Arbeitsfläche Platz; Telefon öffnet kein Blatt ungefragt', () => {
    expect(defaultPanelsFor('beide', false)).toEqual({ library: true, inspector: true });
    expect(defaultPanelsFor('eine', false)).toEqual({ library: false, inspector: true });
    expect(defaultPanelsFor('ueberlagert', false)).toEqual({ library: false, inspector: false });
    expect(defaultPanelsFor('blatt', false)).toEqual({ library: false, inspector: false });
    expect(defaultPanelsFor('beide', true)).toEqual({ library: false, inspector: false });
  });
});

describe('Auftrag 174a F1: „Im Panel-Editor öffnen“ nur mit Handler', () => {
  it('blendet die Aktion ohne Handler aus, Kacheleinstellungen bleiben zugänglich', () => {
    renderInspector();
    expect(screen.queryByTestId('open-panel-editor-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('inspector-tile-content')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-tab-darstellung')).toBeInTheDocument();
  });

  it('öffnet mit Handler die Kachel per Klick', () => {
    const open = vi.fn();
    renderInspector(open);
    fireEvent.click(screen.getByTestId('open-panel-editor-btn'));
    expect(open).toHaveBeenCalledWith('tile-arr-verlauf');
  });
});
