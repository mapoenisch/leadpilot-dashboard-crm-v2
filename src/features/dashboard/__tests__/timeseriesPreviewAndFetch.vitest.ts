// Auftrag 170 (P14b): Vorschau-Zusatzreihen, Szenario-Auswahl und RPC-Aufrufe (Fehlerpfade).
import { describe, expect, it, vi } from 'vitest';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData, TileTimeSeriesData } from '../data/dashboardData';
import { withPreviewTimeSeriesExtras } from '../preview/previewTimeSeriesExtras';
import {
  PREVIEW_COMPARE_DASHBOARD_ID,
  createPreviewCompareConfig,
  previewScenarioDashboard,
} from '../preview/previewCompare';
import { PREVIEW_TRANSFORMATIONS_DASHBOARD_ID } from '../preview/previewTransformations';
import { fetchTimeSeriesCompare, fetchTimeSeriesPhases } from '../data/resolveTimeSeriesCompare';
import { berlinDayKey, formatBerlinDate, isoWeek, dayNumber } from '../model/timeseries/berlinDate';

function entry(id: string): ActiveCatalogEntry {
  const e = getCatalogEntry(id);
  if (!e || !isActiveEntry(e)) throw new Error(id);
  return e;
}

const LIVE: TileTimeSeriesData = {
  source: 'live_kpi_events',
  resolution: 'stunde',
  from: '2026-11-15T00:00:00+01:00',
  to: '2026-11-16T00:00:00+01:00',
  historyStartAt: '2026-11-01T00:00:00+01:00',
  points: Array.from({ length: 24 }, (_, h) => ({
    at: `2026-11-15T${String(h).padStart(2, '0')}:00:00+01:00`,
    value: 40 + h,
    status: 'belegt' as const,
    measuredAt: null,
  })),
};
const CRM: TileTimeSeriesData = {
  ...LIVE,
  source: 'deal_stage_events',
  resolution: 'woche',
  from: '2026-08-24T00:00:00+02:00',
  historyStartAt: '2026-09-21T00:00:00+02:00',
  points: LIVE.points.slice(0, 12),
};

function data(catalogId: string, series: TileTimeSeriesData): ResolvedTileData {
  return {
    catalogId,
    state: 'bereit',
    value: null,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'x',
    asOf: null,
    origin: { layer: 'live', module: 'm', exportName: 'e' },
    scope: 'organisation',
    timeSeries: series,
  } as unknown as ResolvedTileData;
}

const tile = (
  catalogId: string,
  view: DashboardTileConfig['view'],
  query = {},
): DashboardTileConfig => ({
  tileId: 't',
  catalogId,
  view,
  size: 'mittel',
  filterMode: 'dashboard',
  query: { metricId: catalogId, ...query },
});

describe('Auftrag 170 – Vorschau-Zusatzreihen', () => {
  it('liefert Vergleich, zweite Reihe und Band über denselben Rechenweg', () => {
    const out = withPreviewTimeSeriesExtras(
      tile('live.arr.verlauf', 'linie', {
        compare: 'vorperiode',
        join: { metricId: 'live.pipeline_coverage.verlauf', typ: 'links' },
        bands: { type: 'percentile_10_90', periodCount: 8 },
      }),
      entry('live.arr.verlauf'),
      data('live.arr.verlauf', LIVE),
    );
    const extras = out.timeSeriesExtras!;
    expect(extras.compare!.points).toHaveLength(24);
    expect(extras.compare!.partialNotice).toBeNull();
    expect(extras.second!.unit).toBe('x');
    expect(extras.bands!.hasBand).toBe(true);
  });

  it('zeigt Teilhistorie beim Vorjahr und „zu wenig Daten“ beim Band ohne Historie', () => {
    const out = withPreviewTimeSeriesExtras(
      tile('crm.gewonnen_verlauf', 'linie', {
        compare: 'vorjahr',
        bands: { type: 'percentile_10_90', periodCount: 8 },
      }),
      entry('crm.gewonnen_verlauf'),
      data('crm.gewonnen_verlauf', CRM),
    );
    expect(out.timeSeriesExtras!.compare!.partialNotice).toBe(
      'Vergleich unvollständig: Daten ab 21.09.2026',
    );
    expect(out.timeSeriesExtras!.bands!.hasBand).toBe(false);
  });

  it('liefert Heatmap-Daten je Kennzahl und meldet unzulässige zweite Reihen', () => {
    const phases = withPreviewTimeSeriesExtras(
      tile('crm.phaseneintritte_verlauf', 'heatmap'),
      entry('crm.phaseneintritte_verlauf'),
      data('crm.phaseneintritte_verlauf', CRM),
    );
    expect(phases.timeSeriesExtras!.heatmap!.phaseSeries).toHaveLength(7);
    const daily = withPreviewTimeSeriesExtras(
      tile('live.pipeline_leads.verlauf', 'heatmap'),
      entry('live.pipeline_leads.verlauf'),
      data('live.pipeline_leads.verlauf', LIVE),
    );
    expect(daily.timeSeries!.resolution).toBe('tag');
    expect(daily.timeSeries!.points).toHaveLength(84);
    const bad = withPreviewTimeSeriesExtras(
      tile('crm.gewonnen_verlauf', 'linie', {
        join: { metricId: 'live.arr.verlauf', typ: 'inner' },
      }),
      entry('crm.gewonnen_verlauf'),
      data('crm.gewonnen_verlauf', CRM),
    );
    expect(bad.timeSeriesExtras!.notices[0]).toMatch(/nicht verknüpfbar/);
    const plain = data('live.arr.verlauf', LIVE);
    expect(
      withPreviewTimeSeriesExtras(
        tile('live.arr.verlauf', 'linie'),
        entry('live.arr.verlauf'),
        plain,
      ),
    ).toBe(plain);
    const loading = { ...plain, state: 'laden' } as ResolvedTileData;
    expect(
      withPreviewTimeSeriesExtras(
        tile('live.arr.verlauf', 'heatmap'),
        entry('live.arr.verlauf'),
        loading,
      ),
    ).toBe(loading);
  });

  it('wählt das Start-Dashboard der Szenarien', () => {
    expect(previewScenarioDashboard({ vergleich: true })!.id).toBe(PREVIEW_COMPARE_DASHBOARD_ID);
    expect(previewScenarioDashboard({ transformationen: true })!.id).toBe(
      PREVIEW_TRANSFORMATIONS_DASHBOARD_ID,
    );
    expect(previewScenarioDashboard({})).toBeNull();
    expect(createPreviewCompareConfig().tiles).toHaveLength(7);
  });
});

describe('Auftrag 170 – RPC-Aufrufe', () => {
  const RAW = {
    source: 'live_kpi',
    resolution: 'stunde',
    from: 'a',
    to: 'b',
    historyStartAt: null,
    points: [],
    compare: 'vorperiode',
    compareFrom: 'c',
    compareTo: 'a',
    comparePoints: [],
    is_partial: false,
  };
  const client = (result: { data?: unknown; error?: unknown }) =>
    ({
      rpc: vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null }),
    }) as never;
  const params = {
    source: 'live_kpi' as const,
    metric: 'arr',
    resolution: 'stunde' as const,
    from: 'a',
    to: 'b',
    compare: 'vorperiode' as const,
  };

  it('ruft die Vergleichs-RPC mit allen Parametern auf', async () => {
    const c = client({ data: RAW });
    const res = await fetchTimeSeriesCompare(params, { supabaseClient: c, isConfigured: true });
    expect(res.partialNotice).toBeNull();
    expect((c as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith(
      'dashboard_time_series_compare',
      expect.objectContaining({ p_compare: 'vorperiode', p_pipeline: null }),
    );
  });

  it('meldet fehlende RPC, Serverfehler, kaputte Antworten und fehlende Konfiguration', async () => {
    await expect(
      fetchTimeSeriesCompare(params, {
        supabaseClient: client({ error: { code: 'PGRST202' } }),
        isConfigured: true,
      }),
    ).rejects.toThrow('Vergleich auf dem Server noch nicht verfügbar');
    await expect(
      fetchTimeSeriesCompare(params, {
        supabaseClient: client({ error: { code: '22023', message: 'zu_viele_punkte' } }),
        isConfigured: true,
      }),
    ).rejects.toMatchObject({ message: 'zu_viele_punkte' });
    await expect(
      fetchTimeSeriesCompare(params, {
        supabaseClient: client({ data: { x: 1 } }),
        isConfigured: true,
      }),
    ).rejects.toThrow(/Vergleichszeitraum/);
    await expect(fetchTimeSeriesCompare(params, { isConfigured: false })).rejects.toThrow(
      'Supabase ist nicht konfiguriert',
    );
  });

  it('ruft die Phasen-RPC auf und prüft die Antwort', async () => {
    const c = client({
      data: {
        ...RAW,
        source: 'deal_stage_events',
        resolution: 'woche',
        phases: [{ phase: 'Verhandlung', points: [] }],
      },
    });
    const res = await fetchTimeSeriesPhases(
      { resolution: 'woche', from: 'a', to: 'b' },
      { supabaseClient: c, isConfigured: true },
    );
    expect(res.phases[0]!.phase).toBe('Verhandlung');
    await expect(
      fetchTimeSeriesPhases(
        { resolution: 'woche', from: 'a', to: 'b' },
        { supabaseClient: client({ data: { phases: [{ points: [] }] } }), isConfigured: true },
      ),
    ).rejects.toThrow('Phaseneintrag ungültig');
  });
});

describe('Auftrag 170 – Berliner Kalender', () => {
  it('rechnet Tag, Woche und Datum unabhängig von der Rechner-Zeitzone', () => {
    expect(berlinDayKey('2026-03-28T23:30:00Z')).toBe('2026-03-29');
    expect(berlinDayKey('kaputt-ohne-datum')).toBe('kaputt-ohn');
    expect(formatBerlinDate('2026-12-31T23:30:00Z')).toBe('01.01.2027');
    expect(isoWeek(dayNumber('2027-01-01'))).toBe(53);
    expect(isoWeek(dayNumber('2026-06-01'))).toBe(23);
  });
});
