// Auftrag 073 (Dashboard Teilauftrag 4): Fokus, Hinweisplatz, Leerzustand und abgelehnte Pipeline.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardTile } from '../components/DashboardTile';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData } from '../data/dashboardData';
import { resolveCombination } from '../data/resolveCombination';

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
    expect(screen.getByTestId('tile-notice-slot').className).not.toContain('h-[56px]');
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
    expect(screen.getByTestId('tile-notice-slot').className).toContain('h-[56px]');
  });

  it('hält den Hinweisplatz bei kombinierten Live-Zuständen fest und scrollbar', () => {
    const live = {
      layer: 'live' as const,
      module: 'src/services/liveKpi',
      exportName: 'store',
      liveKpiId: 'arr',
    };
    show(
      resolved({
        state: 'veraltet',
        quality: 'degradiert',
        origin: live,
        asOf: '2026-10-04T12:05:00Z',
      }),
    );
    const slot = screen.getByTestId('tile-notice-slot');
    expect(slot.className).toContain('h-[56px]');
    expect(slot.className).toContain('overflow-y-auto');
    expect(slot).toHaveAttribute('tabindex', '0');
    expect(slot).toHaveAttribute('aria-label', 'Hinweise zur Datenqualität');
  });

  it('sagt die Rückkehr zu aktuellen Daten an', () => {
    const { rerender } = show(resolved({ quality: 'degradiert' }));
    const live = screen.getByTestId('tile-live-status');
    expect(live).toHaveTextContent('Datenqualität eingeschränkt.');
    rerender(
      <DashboardTile tile={TILE} entry={ARR} data={resolved()} onShowDetails={() => undefined} />,
    );
    expect(live).toHaveTextContent('Wert wieder aktuell.');
  });

  it('meldet bei unpassender Übersicht nicht „Keine Daten“, sondern bleibt still', () => {
    const tile = { ...TILE, view: 'uebersicht' as const };
    show(resolved({ overview: null }), tile, ARR);
    expect(screen.getByTestId('tile-chart-hint')).toHaveTextContent('passt nicht');
    expect(screen.getByTestId('tile-live-status')).toHaveTextContent('');
  });

  it('nennt den abgelehnten zentralen Zeitraum im Dashboard-Modus', () => {
    show(
      resolved({
        effectiveFilter: {
          mode: 'dashboard',
          period: null,
          pipeline: null,
          periodReason: 'Quelle hat kein belegtes Datumsfeld',
        },
      }),
      TILE,
      ARR,
      { period: { from: '2026-01-01', to: '2026-03-31' } },
    );
    expect(screen.getByTestId('tile-time-reference')).toHaveTextContent(
      'Zeitbezug: Dashboard-Filter · gewählt: 01.01.2026 – 31.03.2026',
    );
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

  it('sagt veraltet und eingeschränkt gemeinsam an', () => {
    show(
      resolved({
        state: 'veraltet',
        quality: 'degradiert',
        asOf: '2026-10-04T12:05:00Z',
      }),
    );
    const live = screen.getByTestId('tile-live-status');
    expect(live).toHaveTextContent('Wert veraltet. Stand 04.10.2026, 14:05.');
    expect(live).toHaveTextContent('Datenqualität eingeschränkt.');
  });

  it('reserviert im Kopf einer Live-Kachel ohne Zeitstempel den Platz für „Stand …“', () => {
    const live = {
      layer: 'live' as const,
      module: 'src/services/liveKpi',
      exportName: 'store',
      liveKpiId: 'arr',
    };
    const { unmount } = show(resolved({ state: 'laden', value: null, origin: live }));
    const reserve = screen.getByTestId('tile-stand-reserve');
    expect(reserve).toHaveAttribute('aria-hidden', 'true');
    expect(reserve.className).toContain('invisible');
    unmount();
    const withStand = show(resolved({ origin: live, asOf: '2026-10-04T12:05:00Z' }));
    expect(screen.queryByTestId('tile-stand-reserve')).toBeNull();
    withStand.unmount();
    show(resolved());
    expect(screen.queryByTestId('tile-stand-reserve')).toBeNull();
  });
});

describe('Kombinationskachel (Auftrag 076)', () => {
  const MARGE = active('kombination.ebitda_marge');
  const SHARE = active('kombination.mrr_anteil_growth');
  const tile = (catalogId: string, view: DashboardTileConfig['view'] = 'zahl') => ({
    ...TILE,
    catalogId,
    view,
    size: view === 'zahl' ? ('klein' as const) : ('mittel' as const),
  });
  const filter = { mode: 'fester_stand' as const, period: null, pipeline: null };

  it('zeigt Formel, Quelle und Wert in deutscher Schreibweise', () => {
    show(resolveCombination(MARGE, filter), tile(MARGE.id), MARGE);
    expect(screen.getByTestId('tile-formula').textContent).toBe(
      'Formel: EBITDA ÷ Umsatzerlöse × 100',
    );
    expect(screen.getByTestId('tile-meta').textContent).toContain('Kombination aus Stammdaten');
    expect(screen.getByTestId('tile-number').textContent).toContain('-92,0 %');
  });

  it('nicht berechenbar: Badge, Grund, kein Wert, Ansage; Formelzeile in jedem Zustand', () => {
    const base = resolveCombination(MARGE, filter);
    const states: ResolvedTileData[] = [
      { ...base, state: 'laden', value: null },
      base,
      {
        ...base,
        state: 'nicht_berechenbar',
        value: null,
        message: 'Für „Umsatzerlöse“ fehlt ein Wert.',
      },
    ];
    for (const data of states) {
      const { unmount } = show(data, tile(MARGE.id), MARGE);
      expect(screen.getByTestId('tile-formula')).toBeTruthy();
      unmount();
    }
    show(states[2] as ResolvedTileData, tile(MARGE.id), MARGE);
    expect(screen.getByTestId('tile-state-badge').textContent).toBe('Nicht berechenbar');
    expect(screen.getByTestId('tile-blocked').textContent).toBe(
      'Für „Umsatzerlöse“ fehlt ein Wert.',
    );
    expect(screen.getByTestId('tile-blocked').parentElement?.className).toContain('min-h-[56px]');
    expect(screen.queryByTestId('tile-number')).toBeNull();
    expect(screen.getByTestId('tile-live-status').textContent).toBe(
      'Nicht berechenbar: Für „Umsatzerlöse“ fehlt ein Wert.',
    );
  });

  it('Anteil als Tabelle mit Teil und Rest in Prozent', () => {
    show(resolveCombination(SHARE, filter), tile(SHARE.id, 'tabelle'), SHARE);
    const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells).toEqual(['57,1 %', '42,9 %']);
    expect(screen.getByRole('rowheader', { name: 'MRR Growth' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Übrige Pakete' })).toBeTruthy();
  });
});
