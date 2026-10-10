// Auftrag 091 (Paket E, Teil 3): Klartext unter dem Kürzel, neutrales Vorjahr, kurze Metazeile.
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DashboardTile } from '../components/DashboardTile';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData, TileData } from '../data/dashboardData';

function active(id: string): ActiveCatalogEntry {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(`kein aktiver Eintrag ${id}`);
  return entry;
}

const ARR = active('baseline.arr');
const TILE: DashboardTileConfig = {
  tileId: 't1',
  catalogId: 'baseline.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
};

function resolved(overrides: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'baseline.arr',
    state: 'bereit',
    value: 2_345_678,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Stand 31.12.2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/execData.ts', exportName: 'EXEC_KPIS_1' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    ...overrides,
  };
}

function renderTile(data: TileData, tile = TILE, entry: ActiveCatalogEntry = ARR) {
  render(<DashboardTile tile={tile} entry={entry} data={data} onShowDetails={vi.fn()} />);
}

describe('DashboardTile (Auftrag 091)', () => {
  it('zeigt den Klartext unter dem Kürzel (Auftrag 091)', () => {
    renderTile(resolved());
    expect(screen.getByTestId('tile-plain-name')).toHaveTextContent(
      'Jährlich wiederkehrender Umsatz',
    );
    // ARR hat keinen belegten Vorjahreswert: keine Vergleichszeile.
    expect(screen.queryByTestId('tile-comparison')).toBeNull();
  });

  it('zeigt das Vorjahr neutral ohne Pfeil oder Farbe, nur wenn belegt (Auftrag 091)', () => {
    renderTile(
      resolved({ catalogId: 'baseline.ebitda', value: -309_000 }),
      {
        ...TILE,
        catalogId: 'baseline.ebitda',
      },
      active('baseline.ebitda'),
    );
    const line = screen.getByTestId('tile-comparison');
    expect(line).toHaveTextContent(/Vorjahr \(FY 2024\): .*288.* · Veränderung .*21/);
    expect(line.textContent).not.toMatch(/[↑↓▲▼]/);
    expect(line.className).not.toMatch(/text-(error|success|warning)/);
  });

  it('setzt das Vorzeichen direkt an den Wert, ohne Leerzeichen (Auftrag 091)', () => {
    renderTile(
      resolved({ catalogId: 'baseline.umsatz', value: 200_000 }),
      { ...TILE, catalogId: 'baseline.umsatz' },
      active('baseline.umsatz'),
    );
    expect(screen.getByTestId('tile-comparison').textContent).toBe(
      'Vorjahr (FY 2024): 164.000 EUR · Veränderung +36.000 EUR',
    );
    cleanup();
    renderTile(
      resolved({ catalogId: 'baseline.ebitda', value: -309_000 }),
      { ...TILE, catalogId: 'baseline.ebitda' },
      active('baseline.ebitda'),
    );
    expect(screen.getByTestId('tile-comparison').textContent).toBe(
      'Vorjahr (FY 2024): -288.000 EUR · Veränderung -21.000 EUR',
    );
  });

  it('nennt den festen Stand nicht doppelt neben „Stand …“, wohl aber bei gewähltem Zeitraum (Auftrag 091)', () => {
    const fixed = resolved({
      effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    });
    renderTile(fixed);
    expect(screen.getByTestId('tile-time-reference')).toHaveTextContent(
      /^Stand 31\.12\.2025 · Stammdaten$/,
    );
    cleanup();
    renderTile(fixed, { ...TILE, period: { from: '2026-07-01', to: '2026-09-30' } });
    expect(screen.getByTestId('tile-time-reference')).toHaveTextContent('fester Stand');
  });
});
