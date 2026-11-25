// Auftrag 174b (K1, K3, K5): ruhiger Kachelkopf, einklappbare Erläuterung, Ziehgriff in der Leiste,
// Kachelkörper ohne Scrollbereich.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardTile } from '../components/DashboardTile';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData } from '../data/dashboardData';
import { CanvasTileCard } from '../components/editor/canvas/CanvasTileCard';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { TileData } from '../data/dashboardData';

function active(id: string): ActiveCatalogEntry {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(`kein aktiver Eintrag ${id}`);
  return entry;
}

const LONG_BASIS =
  'Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt.';

const TILE: DashboardTileConfig = {
  tileId: 't1',
  catalogId: 'baseline.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'dashboard',
};

function resolved(overrides: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'baseline.arr',
    state: 'bereit',
    value: 100,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: LONG_BASIS,
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/execData.ts', exportName: 'EXEC_KPIS_1' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    ...overrides,
  };
}

function show(fit: boolean) {
  return render(
    <DashboardTile
      tile={TILE}
      entry={active('baseline.arr')}
      data={resolved()}
      onShowDetails={() => undefined}
      detailsBlocked
      fit={fit}
    />,
  );
}

describe('Kachelkopf im Einpass-Modus (K3)', () => {
  it('zeigt den langen Zeitbezug erst nach dem Aufklappen', () => {
    show(true);
    expect(screen.queryByText(LONG_BASIS, { exact: false })).toBeNull();
    const toggle = screen.getByTestId('tile-explanation-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('Erläuterung anzeigen');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('tile-explanation');
    expect(within(panel).getByText(LONG_BASIS, { exact: false })).toBeInTheDocument();
    expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('Escape schließt die Erläuterung und gibt den Fokus an den Schalter zurück', () => {
    show(true);
    const toggle = screen.getByTestId('tile-explanation-toggle');
    fireEvent.click(toggle);
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByTestId('tile-explanation')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('ein Klick außerhalb schließt die Erläuterung', () => {
    show(true);
    fireEvent.click(screen.getByTestId('tile-explanation-toggle'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('tile-explanation')).toBeNull();
  });

  it('ohne Einpass-Modus bleibt der Kopf unverändert (alte Ansicht, Kiosk, Druck)', () => {
    show(false);
    expect(screen.queryByTestId('tile-explanation-toggle')).toBeNull();
    expect(screen.getByTestId('tile-meta').textContent).toContain(LONG_BASIS);
  });

  it('der Hinweis „Erst speichern“ bleibt sichtbar, einzeilig mit vollem Text als Titel', () => {
    show(true);
    const hint = screen.getByText('Erst speichern, dann Details öffnen.');
    expect(hint.className).toContain('truncate');
    expect(hint).toHaveAttribute('title', 'Erst speichern, dann Details öffnen.');
  });

  it('der Inhalt steht in der Einpassfläche', () => {
    show(true);
    expect(screen.getByTestId('tile-fit-box')).toBeInTheDocument();
    expect(screen.getByTestId('tile-fit-content')).toContainElement(
      screen.getByTestId('tile-number'),
    );
  });
});

describe('Kachelkarte im Raster (K1, K5)', () => {
  const tileV2: DashboardTileConfigV2 = {
    id: 'a',
    catalogId: 'baseline.arr',
    title: 'ARR',
    presentation: 'zahl',
    layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
  };
  const useData = (): TileData => resolved({ timeBasis: 'Stand 31.12.2025' });

  function card(isSelected = true) {
    return render(
      <CanvasTileCard
        tile={tileV2}
        position={{ x: 0, y: 0, w: 3, h: 3 }}
        activeBreakpoint="desktop"
        isSelected={isSelected}
        onSelectTile={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onPointerDownHandle={vi.fn()}
        onResizeStart={vi.fn()}
        useData={useData}
        globalTimeframe="letzte_30_tage"
      />,
    );
  }

  it('der Ziehgriff sitzt in der Aktionsleiste über der Kachelkante', () => {
    card();
    const bar = screen.getByTestId('tile-quick-actions-a');
    expect(bar).toContainElement(screen.getByTestId('drag-handle-a'));
    expect(bar.className).toContain('bottom-full');
    expect(screen.getByTestId('drag-handle-a').className).not.toContain('absolute');
  });

  it('der Griff startet weiterhin das Verschieben', () => {
    const onPointerDownHandle = vi.fn();
    render(
      <CanvasTileCard
        tile={tileV2}
        position={{ x: 0, y: 0, w: 3, h: 3 }}
        activeBreakpoint="desktop"
        isSelected
        onSelectTile={vi.fn()}
        onRemoveTile={vi.fn()}
        onDuplicateTile={vi.fn()}
        onPointerDownHandle={onPointerDownHandle}
        onResizeStart={vi.fn()}
        useData={useData}
        globalTimeframe="letzte_30_tage"
      />,
    );
    fireEvent.pointerDown(screen.getByTestId('drag-handle-a'));
    expect(onPointerDownHandle).toHaveBeenCalledWith('a', expect.anything());
  });

  it('der Kachelkörper scrollt nicht (kein overflow-auto)', () => {
    card(false);
    const body = screen.getByTestId('tile-body-a');
    expect(body.className).toContain('overflow-hidden');
    expect(body.className).not.toContain('overflow-auto');
  });
});
