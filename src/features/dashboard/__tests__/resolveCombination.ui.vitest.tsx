// Auftrag 076 (Dashboard Teilauftrag 6): Kombinationskacheln auflösen, auch über useDashboardData.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import { getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import type { ResolvedTileData } from '../data/dashboardData';
import { resolveCombination } from '../data/resolveCombination';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatTileValue } from '../components/tileFormat';

const override = vi.hoisted(() => ({
  fn: null as null | ((entry: ActiveCatalogEntry) => Partial<ResolvedTileData> | null),
}));
vi.mock('../data/resolveBaseline', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../data/resolveBaseline')>();
  return {
    ...mod,
    resolveBaseline: (entry: ActiveCatalogEntry, filter: EffectiveTileFilter) => {
      const real = mod.resolveBaseline(entry, filter);
      const patch = override.fn?.(entry);
      return patch ? { ...real, ...patch } : real;
    },
  };
});
vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));

const FILTER: EffectiveTileFilter = { mode: 'fester_stand', period: null, pipeline: null };
const entryOf = (id: string): ActiveCatalogEntry => {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(id);
  return entry;
};

afterEach(() => {
  override.fn = null;
});

describe('resolveCombination', () => {
  it('EBITDA-Marge: bereit, negativ, mit Formel und beiden Operanden', () => {
    const data = resolveCombination(entryOf('kombination.ebitda_marge'), FILTER);
    expect(data.state).toBe('bereit');
    expect(data.value).toBeCloseTo(-91.964, 3);
    expect(formatTileValue(data.value, data.unit, 'kompakt')).toBe('-92,0 %');
    expect(data.series).toBeNull();
    expect(data.origin.layer).toBe('kombination');
    expect(data.scope).toBe('stammdaten');
    expect(data.combination).toEqual({
      formula: 'EBITDA ÷ Umsatzerlöse × 100',
      operands: [
        { label: 'EBITDA', value: -309_000, unit: 'EUR', timeBasis: 'Geschäftsjahr 2025' },
        { label: 'Umsatzerlöse', value: 336_000, unit: 'EUR', timeBasis: 'Geschäftsjahr 2025' },
      ],
    });
  });

  it('CAC-Aufschlag als Faktor in deutscher Schreibweise', () => {
    const data = resolveCombination(entryOf('kombination.cac_aufschlag'), FILTER);
    expect(data.state).toBe('bereit');
    expect(formatTileValue(data.value, data.unit, 'kompakt')).toBe('5,2x');
  });

  it('Paketanteil mit Teil und Rest für Ring und Tabelle', () => {
    const data = resolveCombination(entryOf('kombination.mrr_anteil_starter'), FILTER);
    expect(data.state).toBe('bereit');
    expect(data.value).toBeCloseTo((10_045 / 34_320) * 100, 6);
    expect(data.series?.map((row) => row.label)).toEqual(['MRR Starter', 'Übrige Pakete']);
    const total = (data.series ?? []).reduce((sum, row) => sum + row.value, 0);
    expect(total).toBeCloseTo(100, 10);
    expect(data.combination?.operands.map((o) => o.value)).toEqual([10_045, 34_320]);
  });

  it('fehlender Operand ergibt nicht berechenbar mit Grund, nie 0', () => {
    override.fn = (entry) =>
      entry.id === 'baseline.umsatz' ? { state: 'keine_daten', value: null } : null;
    const data = resolveCombination(entryOf('kombination.ebitda_marge'), FILTER);
    expect(data).toMatchObject({ state: 'nicht_berechenbar', value: null, series: null });
    expect(data.message).toMatch(/Umsatzerlöse/);
    expect(data.message).not.toMatch(/EXEC|resolve|path/);
  });

  it('Nenner 0 ergibt nicht berechenbar', () => {
    override.fn = (entry) => (entry.id === 'baseline.marketing_cac' ? { value: 0 } : null);
    const data = resolveCombination(entryOf('kombination.cac_aufschlag'), FILTER);
    expect(data.state).toBe('nicht_berechenbar');
    expect(data.message).toMatch(/Marketing-CAC/);
  });

  it('fehlendes Paket in der Reihe ergibt nicht berechenbar', () => {
    override.fn = (entry) =>
      entry.id === 'baseline.mrr_paketmix'
        ? { series: [{ label: 'Growth (89€)', value: 1 }] }
        : null;
    const data = resolveCombination(entryOf('kombination.mrr_anteil_starter'), FILTER);
    expect(data.state).toBe('nicht_berechenbar');
  });

  it('ein Eintrag ohne Regel wird nie gerechnet', () => {
    const fake = { ...entryOf('kombination.ebitda_marge'), id: 'kombination.entfernt' };
    expect(resolveCombination(fake, FILTER)).toMatchObject({
      state: 'nicht_berechenbar',
      value: null,
    });
  });
});

describe('useDashboardData mit Kombination', () => {
  it('löst synchron ohne Abfrage auf und wartet bei enabled: false', () => {
    vi.mocked(useOrganization).mockReturnValue({ session: null, isLoading: false });
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const tile = {
      tileId: 'k',
      catalogId: 'kombination.cac_aufschlag',
      view: 'zahl' as const,
      size: 'klein' as const,
      filterMode: 'fester_stand' as const,
    };
    const { result, rerender } = renderHook(
      ({ enabled }) => useDashboardData(tile, undefined, { enabled }),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(result.current.state).toBe('laden');
    rerender({ enabled: true });
    expect(result.current.state).toBe('bereit');
    // Der CRM-Hook legt nur einen deaktivierten Eintrag an; abgefragt wird nichts.
    expect(client.isFetching()).toBe(0);
    for (const query of client.getQueryCache().getAll()) {
      expect(query.state.dataUpdateCount).toBe(0);
    }
  });
});
