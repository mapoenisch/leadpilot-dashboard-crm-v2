// Auftrag 160 (P10b-1): Tests für resolveTimeSeries (Parser, Fenster, Punktgrenze, Zeitzone).
import { describe, expect, it, vi } from 'vitest';
import {
  fetchTimeSeries,
  formatBerlinIso,
  formatPointLabel,
  parseTimeSeriesResponse,
  resolveTimeSeriesTile,
  subtractBerlin,
  timeSeriesWindow,
  truncateBerlin,
} from '../data/resolveTimeSeries';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';

const makeTestEntry = (patch: Partial<ActiveCatalogEntry> = {}): ActiveCatalogEntry => ({
  id: 'crm.gewonnen_verlauf',
  name: 'Gewonnene Deals je Woche (Anzahl)',
  category: 'vertrieb_crm',
  kind: 'kpi',
  status: 'aktiv',
  definition: '',
  unit: 'Deals',
  shape: 'zeitreihe',
  aggregation: 'fluss',
  timeMode: 'fest',
  timeBasis: 'Letzte 12 Wochen',
  views: ['linie', 'saeulen', 'tabelle'],
  defaultView: 'linie',
  minSize: 'mittel',
  groupings: [],
  filters: ['pipeline'],
  detailRouteId: '',
  access: 'alle',
  history: {
    kind: 'ereignisse',
    source: 'deal_stage_events',
    reconstructable: 'nur_fluesse',
    note: '',
    defaultWindow: { resolution: 'woche', count: 12 },
  },
  source: { layer: 'crm', module: 'crm', exportName: 'deals' },
  ...patch,
});

describe('parseTimeSeriesResponse', () => {
  it('parst eine gültige CRM-Zeitreihenantwort und mappt bucketStart auf at', () => {
    const raw = {
      source: 'deal_stage_events',
      metric: 'Deal gewonnen',
      resolution: 'woche',
      from: '2026-10-05T00:00:00+02:00',
      to: '2026-10-19T00:00:00+02:00',
      historyStartAt: '2026-10-05T10:00:00+02:00',
      generatedAt: '2026-11-16T10:00:00+01:00',
      points: [
        {
          bucketStart: '2026-10-05T00:00:00+02:00',
          value: 2,
          status: 'belegt',
          measuredAt: null,
        },
        {
          bucketStart: '2026-10-12T00:00:00+02:00',
          value: 0,
          status: 'belegt',
          measuredAt: null,
        },
      ],
      pipelineBasis: 'aktuelle_pipeline_des_deals',
      extraFieldToIgnore: 'should_be_ignored',
    };

    const res = parseTimeSeriesResponse(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.source).toBe('deal_stage_events');
    expect(res.data.resolution).toBe('woche');
    expect(res.data.from).toBe('2026-10-05T00:00:00+02:00');
    expect(res.data.to).toBe('2026-10-19T00:00:00+02:00');
    expect(res.data.historyStartAt).toBe('2026-10-05T10:00:00+02:00');
    expect(res.data.pipelineBasis).toBe('aktuelle_pipeline_des_deals');
    expect(res.data.points).toHaveLength(2);
    expect(res.data.points[0]).toEqual({
      at: '2026-10-05T00:00:00+02:00',
      value: 2,
      status: 'belegt',
      measuredAt: null,
    });
    expect(res.data.points[1]).toEqual({
      at: '2026-10-12T00:00:00+02:00',
      value: 0,
      status: 'belegt',
      measuredAt: null,
    });
  });

  it('mappt live_kpi auf live_kpi_events und übernimmt measuredAt', () => {
    const raw = {
      source: 'live_kpi',
      metric: 'arr_direct',
      resolution: 'stunde',
      from: '2026-10-05T10:00:00+02:00',
      to: '2026-10-05T12:00:00+02:00',
      historyStartAt: '2026-10-05T10:00:00+02:00',
      points: [
        {
          bucketStart: '2026-10-05T10:00:00+02:00',
          value: 150,
          status: 'belegt',
          measuredAt: '2026-10-05T10:50:00+02:00',
        },
        {
          bucketStart: '2026-10-05T11:00:00+02:00',
          value: null,
          status: 'luecke',
          measuredAt: null,
        },
      ],
    };

    const res = parseTimeSeriesResponse(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.source).toBe('live_kpi_events');
    expect(res.data.points[0]?.measuredAt).toBe('2026-10-05T10:50:00+02:00');
    expect(res.data.points[1]?.status).toBe('luecke');
    expect(res.data.points[1]?.value).toBeNull();
  });

  it('weist ungültige Wurzelobjekte und Datentypen ab', () => {
    expect(parseTimeSeriesResponse(null).ok).toBe(false);
    expect(parseTimeSeriesResponse([]).ok).toBe(false);
    expect(parseTimeSeriesResponse('invalid').ok).toBe(false);
    expect(parseTimeSeriesResponse({ source: 'bad_source' }).ok).toBe(false);
    expect(
      parseTimeSeriesResponse({
        source: 'deal_stage_events',
        resolution: 'sekunde',
      }).ok,
    ).toBe(false);
    expect(
      parseTimeSeriesResponse({
        source: 'deal_stage_events',
        resolution: 'woche',
        from: 123,
      }).ok,
    ).toBe(false);
    expect(
      parseTimeSeriesResponse({
        source: 'deal_stage_events',
        resolution: 'woche',
        from: 'a',
        to: 'b',
        points: 'not_an_array',
      }).ok,
    ).toBe(false);
    expect(
      parseTimeSeriesResponse({
        source: 'deal_stage_events',
        resolution: 'woche',
        from: 'a',
        to: 'b',
        points: [{ bucketStart: 'a', status: 'invalid_status' }],
      }).ok,
    ).toBe(false);
  });
});

describe('Zeitzone und Zeitfenster', () => {
  it('formatiert ISO mit korrektem Berliner Offset', () => {
    const summer = formatBerlinIso('2026-08-15T12:00:00Z');
    expect(summer).toContain('+02:00');
    const winter = formatBerlinIso('2026-12-15T12:00:00Z');
    expect(winter).toContain('+01:00');
  });

  it('rundet in Europe/Berlin korrekt auf Wochenbeginn (Montag)', () => {
    // 2026-11-18 war ein Mittwoch
    const wed = new Date('2026-11-18T14:30:00+01:00');
    const monday = truncateBerlin(wed, 'woche');
    expect(formatBerlinIso(monday)).toBe('2026-11-16T00:00:00+01:00');
  });

  it('beachtet die Zeitumstellung im Oktober bei Subtraktion', () => {
    // 26.10.2026 ist Montag nach Zeitumstellung (Winterzeit +01:00)
    const postDst = new Date('2026-10-26T00:00:00+01:00');
    const twoWeeksEarlier = subtractBerlin(postDst, 2, 'woche');
    // 12.10.2026 war noch Sommerzeit (+02:00)
    expect(formatBerlinIso(twoWeeksEarlier)).toBe('2026-10-12T00:00:00+02:00');
  });

  it('berechnet Standardfenster für 12 Wochen und 24 Stunden', () => {
    const fakeCrmEntry = makeTestEntry();
    const window = timeSeriesWindow(fakeCrmEntry, '2026-11-18T14:00:00+01:00');
    expect(window.resolution).toBe('woche');
    expect(window.count).toBe(12);
    expect(window.to).toBe('2026-11-16T00:00:00+01:00');
    expect(window.from).toBe('2026-08-24T00:00:00+02:00');
  });

  it('wirft RangeError bei Überschreitung der 400-Punkte-Grenze', () => {
    const tooManyPointsEntry = makeTestEntry({
      history: {
        kind: 'ereignisse',
        source: 'deal_stage_events',
        reconstructable: 'nur_fluesse',
        note: '',
        defaultWindow: { resolution: 'tag', count: 401 },
      },
    });

    expect(() => timeSeriesWindow(tooManyPointsEntry)).toThrow(/zu_viele_punkte/);
  });
});

describe('fetchTimeSeries', () => {
  it('ruft Supabase-RPC auf und übersetzt fehlende Funktion in verständliche Meldung', async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function public.dashboard_time_series does not exist' },
      }),
    };

    await expect(
      fetchTimeSeries(
        {
          source: 'deal_stage_events',
          metric: 'Deal gewonnen',
          resolution: 'woche',
          from: '2026-10-05T00:00:00+02:00',
          to: '2026-10-19T00:00:00+02:00',
        },
        {
          supabaseClient:
            mockClient as unknown as typeof import('@/services/db/supabaseClient').supabase,
          isConfigured: true,
        },
      ),
    ).rejects.toThrow('Verlauf auf dem Server noch nicht verfügbar');
  });
});

describe('resolveTimeSeriesTile', () => {
  it('erzeugt ResolvedTileData mit series nur aus belegten Punkten', () => {
    const entry: ActiveCatalogEntry = {
      id: 'crm.gewonnen_verlauf',
      name: 'Gewonnene Deals je Woche (Anzahl)',
      category: 'vertrieb_crm',
      kind: 'kpi',
      status: 'aktiv',
      definition: '',
      unit: 'Deals',
      shape: 'zeitreihe',
      aggregation: 'fluss',
      timeMode: 'fest',
      timeBasis: 'Letzte 12 Wochen',
      views: ['linie'],
      defaultView: 'linie',
      minSize: 'mittel',
      groupings: [],
      filters: ['pipeline'],
      detailRouteId: '',
      access: 'alle',
      history: {
        kind: 'ereignisse',
        source: 'deal_stage_events',
        reconstructable: 'nur_fluesse',
        note: '',
      },
      source: { layer: 'crm', module: 'crm', exportName: 'deals' },
    };

    const filter: EffectiveTileFilter = { mode: 'dashboard', period: null, pipeline: null };
    const timeSeries = {
      source: 'deal_stage_events' as const,
      resolution: 'woche' as const,
      from: '2026-09-28T00:00:00+02:00',
      to: '2026-10-19T00:00:00+02:00',
      historyStartAt: '2026-10-05T10:00:00+02:00',
      points: [
        {
          at: '2026-09-28T00:00:00+02:00',
          value: null,
          status: 'vor_historienbeginn' as const,
          measuredAt: null,
        },
        {
          at: '2026-10-05T00:00:00+02:00',
          value: 3,
          status: 'belegt' as const,
          measuredAt: null,
        },
        {
          at: '2026-10-12T00:00:00+02:00',
          value: 0,
          status: 'belegt' as const,
          measuredAt: null,
        },
      ],
    };

    const resolved = resolveTimeSeriesTile(entry, timeSeries, filter);
    expect(resolved.state).toBe('bereit');
    expect(resolved.value).toBe(0); // latest point
    // series darf NUR belegte Punkte enthalten
    expect(resolved.series).toHaveLength(2);
    expect(resolved.series?.[0]?.value).toBe(3);
    expect(resolved.series?.[1]?.value).toBe(0);
    expect(resolved.timeSeries).toBe(timeSeries);
  });

  it('formatiert Labels je nach Auflösung in Berliner Zeit', () => {
    expect(formatPointLabel('2026-10-05T00:00:00+02:00', 'woche')).toContain('Woche');
    expect(formatPointLabel('2026-10-05T14:00:00+02:00', 'stunde')).toBe('14:00');
    expect(formatPointLabel('2026-10-05T00:00:00+02:00', 'tag')).toBe('05.10.2026');
  });

  it('rundet Samstag bei Wochenauflösung korrekt auf Montag ab (Codex Review Finding)', () => {
    // 2026-10-17 ist ein Samstag
    const saturday = new Date('2026-10-17T15:30:00+02:00');
    const truncated = truncateBerlin(saturday, 'woche');
    // Montag derselben Woche ist der 12.10.2026 00:00:00 in Berlin
    expect(formatBerlinIso(truncated)).toBe('2026-10-12T00:00:00+02:00');
  });

  it('berechnet 12-Wochen-Fenster über die März-Zeitumstellung exakt (Codex Review Finding)', () => {
    const entry = makeTestEntry();
    const win = timeSeriesWindow(entry, '2026-04-06T14:00:00+02:00');
    expect(win.to).toBe('2026-04-06T00:00:00+02:00');
    expect(win.from).toBe('2026-01-12T00:00:00+01:00');
    expect(win.count).toBe(12);
  });

  it('ermittelt den Berliner Offset um Mitternacht exakt an DST-Umschalttagen (Codex Review Finding)', () => {
    // 29.03.2026: DST-Sprung um 02:00 Uhr von +01:00 auf +02:00.
    // Um Mitternacht (00:00:00) gilt noch Winterzeit (+01:00).
    const marchDst = truncateBerlin('2026-03-29T15:00:00+02:00', 'tag');
    expect(formatBerlinIso(marchDst)).toBe('2026-03-29T00:00:00+01:00');

    // 25.10.2026: DST-Rücksprung um 03:00 Uhr von +02:00 auf +01:00.
    // Um Mitternacht (00:00:00) gilt noch Sommerzeit (+02:00).
    const octDst = truncateBerlin('2026-10-25T15:00:00+01:00', 'tag');
    expect(formatBerlinIso(octDst)).toBe('2026-10-25T00:00:00+02:00');
  });
});
