// Auftrag 073 (Dashboard Teilauftrag 4): Fokus, Hinweisplatz, Leerzustand und abgelehnte Pipeline.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardTile } from '../components/DashboardTile';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData } from '../data/dashboardData';

function active(id: string): ActiveCatalogEntry {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(`kein aktiver Eintrag ${id}`);
  return entry;
}

const ARR = active('baseline.arr');
const VERLAUF = active('baseline.arr_verlauf');
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
    timeBasis: 'Stand 31.12.2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/execData.ts', exportName: 'EXEC_KPIS_1' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    ...overrides,
  };
}

function show(data: ResolvedTileData, tile = TILE, entry = ARR, filters?: DashboardFilters) {
  return render(
    <DashboardTile
      tile={tile}
      entry={entry}
      data={data}
      dashboardFilters={filters}
      onShowDetails={() => undefined}
    />,
  );
}

describe('DashboardTile Zustände', () => {
  it('zeigt den übernommenen Fokus sichtbar an', () => {
    show(resolved());
    expect(screen.getByTestId('tile-body').className).toContain('focus-visible:ring-2');
  });

  it('reserviert bei Live-Kacheln Platz für Hinweise, sonst nicht', () => {
    const { unmount } = show(resolved());
    expect(screen.getByTestId('tile-notice-slot').className).not.toContain('min-h-[36px]');
    unmount();
    show(
      resolved({
        origin: {
          layer: 'live',
          module: 'src/services/liveKpi',
          exportName: 'store',
          liveKpiId: 'arr',
        },
      }),
    );
    expect(screen.getByTestId('tile-notice-slot').className).toContain('min-h-[36px]');
  });

  it('sagt einen abgeleiteten Leerzustand („Keine Daten“) über die Live-Region an', () => {
    const tile = { ...TILE, catalogId: 'baseline.arr_verlauf', view: 'saeulen' as const };
    const { rerender } = render(
      <DashboardTile
        tile={tile}
        entry={VERLAUF}
        data={resolved({ state: 'laden', value: null })}
        onShowDetails={() => undefined}
      />,
    );
    const live = screen.getByTestId('tile-live-status');
    expect(live).toHaveTextContent('');
    rerender(
      <DashboardTile
        tile={tile}
        entry={VERLAUF}
        data={resolved({ series: [], value: null })}
        onShowDetails={() => undefined}
      />,
    );
    expect(live).toHaveTextContent('Keine Daten');
  });

  it('nennt die abgelehnte Pipeline und bricht lange Namen um', () => {
    const long = 'Vertrieb_Enterprise_DACH_Region_Nord_2026_Q4_Sonderprogramm_Partner';
    show(
      resolved({
        effectiveFilter: {
          mode: 'dashboard',
          period: null,
          pipeline: null,
          pipelineReason: 'Nur CRM-Quellen unterstützen den Pipeline-Filter',
        },
      }),
      TILE,
      ARR,
      { pipeline: long },
    );
    const reference = screen.getByTestId('tile-time-reference');
    expect(reference).toHaveTextContent(`Pipeline gewählt: ${long}`);
    expect(reference.querySelector('p')?.className).toContain('[overflow-wrap:anywhere]');
  });
});
