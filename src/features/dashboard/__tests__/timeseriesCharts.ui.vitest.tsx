// @vitest-environment jsdom
// Auftrag 170 (P14b): Heatmap, Zusatzebenen des Liniendiagramms, Druckzeilen, Inspector „Vergleichen“.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HeatmapChart, heatmapStep, HEATMAP_STEPS } from '../components/charts/HeatmapChart';
import { DepthLineChart } from '../components/charts/DepthLineChart';
import { InspectorCompareSection } from '../components/editor/inspector/InspectorCompareSection';
import { printExtrasRows } from '../components/export/printExtrasRows';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { TileTimeSeriesExtras } from '../model/timeseries/types';
import type { ResolvedTileData, TimeSeriesPoint } from '../data/dashboardData';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';

const day = (d: string, value: number | null): TimeSeriesPoint => ({
  at: `${d}T00:00:00+02:00`,
  value,
  status: value === null ? 'luecke' : 'belegt',
  measuredAt: null,
});

function entry(id: string): ActiveCatalogEntry {
  const e = getCatalogEntry(id);
  if (!e || !isActiveEntry(e)) throw new Error(id);
  return e;
}

describe('Auftrag 170 – HeatmapChart', () => {
  const extras: TileTimeSeriesExtras = {
    notices: [],
    heatmap: {
      mode: 'woche_wochentag',
      aggregation: 'keine',
      points: [day('2026-06-01', 10), day('2026-06-02', null), day('2026-06-03', 30)],
    },
  };

  it('zeigt leere Zellen als Muster mit Text „Keine Daten“ und eine Legende mit Wertebereich', () => {
    render(
      <HeatmapChart
        idPrefix="hm"
        data={[]}
        unit="EUR"
        period="12 Wochen"
        title="Leads"
        reducedMotion
        extras={extras}
      />,
    );
    const empty = screen.getAllByTestId('heatmap-empty-cell');
    expect(empty).toHaveLength(5);
    expect(empty[0]!.getAttribute('aria-label')).toContain('Keine Daten');
    expect(empty[0]!.getAttribute('fill')).toMatch(/^url\(#/);
    const filled = screen.getAllByTestId('heatmap-cell');
    expect(filled[0]!.getAttribute('aria-label')).toBe('KW 23, Montag 01.06.2026: 10 EUR');
    const legend = screen.getByTestId('heatmap-legend');
    expect(within(legend).getByText('10 EUR')).toBeTruthy();
    expect(within(legend).getByText('30 EUR')).toBeTruthy();
  });

  it('wandert mit Pfeiltasten durch das Raster und liest die Zelle vor', () => {
    render(
      <HeatmapChart
        idPrefix="hm"
        data={[]}
        unit="EUR"
        period="12 Wochen"
        title="Leads"
        reducedMotion
        extras={extras}
      />,
    );
    const first = screen.getAllByRole('gridcell')[0]!;
    fireEvent.focus(first);
    expect(screen.getByTestId('chart-readout').textContent).toContain('Mo, KW 23: 10 EUR');
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByTestId('chart-readout').textContent).toContain('Di, KW 23: Keine Daten');
  });

  it('zeigt die umgeformte Kachelreihe statt der Rohwerte (Einheit passt zum Wert)', () => {
    render(
      <HeatmapChart
        idPrefix="hm3"
        data={[{ label: 'x', value: 0.01, at: '2026-06-01T00:00:00+02:00', status: 'belegt' }]}
        unit="Tsd. EUR"
        period="12 Wochen"
        title="ARR"
        reducedMotion
        extras={extras}
      />,
    );
    expect(screen.getAllByTestId('heatmap-cell')[0]!.getAttribute('aria-label')).toContain(
      '0,01 Tsd. EUR',
    );
  });

  it('verteilt Werte auf die sequenziellen Token-Stufen', () => {
    expect(heatmapStep(0, 0, 100)).toBe(0);
    expect(heatmapStep(100, 0, 100)).toBe(HEATMAP_STEPS.length - 1);
    expect(heatmapStep(5, 5, 5)).toBe(HEATMAP_STEPS.length - 1);
  });

  it('rendert Phase × Woche mit Phasen als Zeilen', () => {
    render(
      <HeatmapChart
        idPrefix="hm2"
        data={[]}
        unit="Eintritte"
        period="12 Wochen"
        title="Phasen"
        reducedMotion
        extras={{
          notices: [],
          heatmap: {
            mode: 'phase_woche',
            aggregation: 'fluss',
            points: [],
            phaseSeries: [
              { phase: 'Verhandlung', points: [day('2026-06-01', 2)] },
              { phase: 'Deal gewonnen', points: [day('2026-06-01', 0)] },
            ],
          },
        }}
      />,
    );
    expect(screen.getAllByRole('rowheader').map((r) => r.textContent)).toEqual([
      'Verhandlung',
      'Deal gewonnen',
    ]);
  });
});

describe('Auftrag 170 – DepthLineChart mit Vergleich, zweiter Reihe und Band', () => {
  const rows = [10, 20, 30].map((v, i) => ({
    label: `T${i}`,
    value: v,
    at: `2026-06-0${i + 1}T00:00:00+02:00`,
  }));
  const extras: TileTimeSeriesExtras = {
    notices: ['Erwartungsband: nicht geladen'],
    compare: {
      type: 'vorperiode',
      points: [day('2026-05-29', 0), day('2026-05-30', 10), day('2026-05-31', null)],
      datenstandAb: '2026-05-30T00:00:00+02:00',
      partialNotice: 'Vergleich unvollständig: Daten ab 30.05.2026',
    },
    second: {
      title: 'Pipeline-Abdeckung',
      unit: 'x',
      typ: 'links',
      points: [day('a', 1.5), day('b', 2), day('c', null)],
    },
    bands: {
      hasBand: true,
      explanation: 'Üblicher Bereich der letzten 8 Tage (10.–90. Perzentil)',
      bands: [0, 1, 2].map((index) => ({ index, lower: 5, upper: 25 })),
    },
  };

  it('zeichnet Vergleichslinie, eigene Achse, Band und erklärt alles in Text', () => {
    render(
      <DepthLineChart
        idPrefix="l"
        data={rows}
        unit="EUR"
        period="24 h"
        title="ARR"
        reducedMotion
        extras={extras}
      />,
    );
    expect(screen.getByTestId('depth-compare-line')).toBeTruthy();
    expect(screen.getByTestId('depth-second-series-line')).toBeTruthy();
    expect(screen.getAllByTestId('depth-second-axis-tick').length).toBeGreaterThan(1);
    expect(screen.getByTestId('expectation-band').getAttribute('d')).toMatch(/^M .* Z$/);
    expect(screen.getByTestId('depth-line-note-partial').textContent).toBe(
      'Vergleich unvollständig: Daten ab 30.05.2026',
    );
    expect(screen.getByTestId('depth-line-note-second').textContent).toContain('rechte Achse in x');
    expect(screen.getByTestId('depth-line-note-bands').textContent).toContain('letzten 8 Tage');
    expect(screen.getByTestId('depth-line-note-notice-0').textContent).toBe(
      'Erwartungsband: nicht geladen',
    );
  });

  it('zeigt im Fadenkreuz beide Werte am selben Zeitpunkt, 0-Vergleich „nicht berechenbar“', () => {
    render(
      <DepthLineChart
        idPrefix="l2"
        data={rows}
        unit="EUR"
        period="24 h"
        title="ARR"
        reducedMotion
        extras={extras}
      />,
    );
    fireEvent.focus(screen.getByRole('slider'));
    const text = document.body.textContent ?? '';
    expect(text).toContain('Vorperiode: 0 EUR');
    expect(text).toContain('nicht berechenbar');
    expect(text).toContain('Pipeline-Abdeckung: 1,5 x');
  });

  it('teilt die Achse bei gleicher Einheit und zeigt „Zu wenig Daten“ ohne Band', () => {
    render(
      <DepthLineChart
        idPrefix="l3"
        data={rows}
        unit="EUR"
        period="24 h"
        title="ARR"
        reducedMotion
        extras={{
          notices: [],
          second: {
            title: 'MRR',
            unit: 'EUR',
            typ: 'inner',
            points: [day('a', 1), day('b', 2), day('c', 3)],
          },
          bands: {
            hasBand: false,
            reason: 'Zu wenig Daten für ein Erwartungsband (mind. 8 Perioden)',
          },
        }}
      />,
    );
    expect(screen.queryAllByTestId('depth-second-axis-tick')).toHaveLength(0);
    expect(screen.queryByTestId('expectation-band')).toBeNull();
    expect(screen.getByTestId('depth-line-note-bands').textContent).toContain('mind. 8 Perioden');
  });
});

describe('Auftrag 170 – Druckzeilen', () => {
  const base: ResolvedTileData = {
    catalogId: 'live.arr.verlauf',
    state: 'bereit',
    value: null,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'x',
    asOf: null,
    origin: { layer: 'live', module: 'm', exportName: 'e' },
    scope: 'organisation',
    timeSeries: {
      source: 'live_kpi_events',
      resolution: 'tag',
      from: 'a',
      to: 'b',
      historyStartAt: null,
      points: [day('2026-06-01', 120), day('2026-06-02', 50)],
    },
  } as unknown as ResolvedTileData;

  it('führt Vergleich und zweite Reihe je Zeitpunkt auf', () => {
    const rows = printExtrasRows('linie', {
      ...base,
      timeSeriesExtras: {
        notices: [],
        compare: {
          type: 'vorjahr',
          points: [day('x', 100), day('y', 0)],
          datenstandAb: null,
          partialNotice: null,
        },
        second: { title: 'MRR', unit: 'EUR', typ: 'links', points: [day('x', 10), day('y', null)] },
      },
    });
    expect(rows![0]!.notes[0]).toContain('Vorjahr');
    expect(rows![0]!.notes[0]).toContain('+20,0 %');
    expect(rows![1]!.notes[0]).toContain('nicht berechenbar');
    expect(rows![0]!.notes[1]).toContain('MRR');
  });

  it('liefert Heatmap-Zellen inklusive Leerzellen als Tabelle', () => {
    const rows = printExtrasRows('heatmap', {
      ...base,
      timeSeriesExtras: {
        notices: [],
        heatmap: { mode: 'woche_wochentag', aggregation: 'keine', points: base.timeSeries!.points },
      },
    });
    expect(rows).toHaveLength(7);
    expect(rows!.filter((r) => r.value === 'Keine Daten')).toHaveLength(5);
    expect(printExtrasRows('linie', base)).toBeNull();
    const converted = printExtrasRows('heatmap', {
      ...base,
      unit: 'Tsd. EUR',
      timeSeries: { ...base.timeSeries!, points: [day('2026-06-01', 0.12)] },
      timeSeriesExtras: {
        notices: [],
        heatmap: { mode: 'woche_wochentag', aggregation: 'keine', points: base.timeSeries!.points },
      },
    });
    expect(converted!.find((r) => r.value !== 'Keine Daten')!.value).toContain('0,12');
  });
});

describe('Auftrag 170 – Inspector „Vergleichen“', () => {
  const tile = (patch: Partial<DashboardTileConfigV2> = {}): DashboardTileConfigV2 => ({
    id: 't1',
    catalogId: 'live.arr.verlauf',
    title: 'ARR',
    presentation: 'linie',
    layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
    query: { metricId: 'live.arr.verlauf' },
    ...patch,
  });

  it('setzt Vergleich, zweite Reihe und Band in der Abfrage', () => {
    const onChange = vi.fn();
    render(
      <InspectorCompareSection
        selectedTile={tile()}
        catalogEntry={entry('live.arr.verlauf')}
        onTileOverrideChange={onChange}
      />,
    );
    fireEvent.change(screen.getByTestId('inspector-compare-select'), {
      target: { value: 'vorjahr' },
    });
    expect(onChange).toHaveBeenLastCalledWith('t1', {
      query: { metricId: 'live.arr.verlauf', compare: 'vorjahr' },
    });
    fireEvent.change(screen.getByTestId('inspector-join-select'), {
      target: { value: 'live.mrr.verlauf' },
    });
    expect(onChange.mock.lastCall![1].query.join).toEqual({
      metricId: 'live.mrr.verlauf',
      typ: 'links',
    });
    fireEvent.click(screen.getByTestId('inspector-bands-toggle'));
    expect(onChange.mock.lastCall![1].query.bands).toEqual({
      type: 'percentile_10_90',
      periodCount: 8,
    });
    const options = Array.from(
      (screen.getByTestId('inspector-join-select') as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).not.toContain('crm.gewonnen_verlauf');
  });

  it('entfernt Angaben wieder und ändert den Join-Typ', () => {
    const onChange = vi.fn();
    render(
      <InspectorCompareSection
        selectedTile={tile({
          query: {
            metricId: 'live.arr.verlauf',
            compare: 'vorperiode',
            join: { metricId: 'live.mrr.verlauf', typ: 'links' },
          },
        })}
        catalogEntry={entry('live.arr.verlauf')}
        onTileOverrideChange={onChange}
      />,
    );
    fireEvent.change(screen.getByTestId('inspector-join-type'), { target: { value: 'inner' } });
    expect(onChange.mock.lastCall![1].query.join.typ).toBe('inner');
    fireEvent.change(screen.getByTestId('inspector-compare-select'), { target: { value: '' } });
    expect('compare' in onChange.mock.lastCall![1].query).toBe(false);
  });

  it('sperrt mit Grund bei Heatmap und bei gleitendem Durchschnitt', () => {
    const { rerender } = render(
      <InspectorCompareSection
        selectedTile={tile({ presentation: 'heatmap' })}
        catalogEntry={entry('live.arr.verlauf')}
        onTileOverrideChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('inspector-compare-blocked').textContent).toMatch(/Heatmap/);
    expect((screen.getByTestId('inspector-compare-select') as HTMLSelectElement).disabled).toBe(
      true,
    );
    rerender(
      <InspectorCompareSection
        selectedTile={tile({
          query: {
            metricId: 'live.arr.verlauf',
            transformations: [{ art: 'gleitender_durchschnitt', fenster: 3 }],
          },
        })}
        catalogEntry={entry('live.arr.verlauf')}
        onTileOverrideChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('inspector-compare-blocked').textContent).toMatch(
      /gleitendem Durchschnitt/,
    );
    expect((screen.getByTestId('inspector-bands-toggle') as HTMLInputElement).disabled).toBe(true);
  });
});
