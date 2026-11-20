// Auftrag 170 (P14b), Codex-Runde 5: Die Tabellenalternative der Heatmap zeigt
// dasselbe Raster wie die Grafik (Phase × Woche), nicht die rohen Zeitreihenpunkte.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DashboardChart } from '../components/DashboardChart';
import type { ResolvedTileData, TimeSeriesPoint } from '../data/dashboardData';

const AT = '2026-11-02T00:00:00+01:00';
const AT2 = '2026-11-03T00:00:00+01:00';
const AT3 = '2026-11-04T00:00:00+01:00';

function pt(at: string, value: number | null): TimeSeriesPoint {
  return { at, value, status: value === null ? 'luecke' : 'belegt', measuredAt: at };
}

function heatmapData(mode: 'phase_woche' | 'woche_wochentag'): ResolvedTileData {
  const points = [pt(AT, 5), pt(AT2, 7)];
  return {
    catalogId: 'test',
    state: 'bereit',
    value: null,
    series: null,
    overview: null,
    unit: 'Ereignisse',
    timeBasis: 'Letzte 12 Wochen (täglich)',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/x.ts', exportName: 'X' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    timeSeries: {
      source: 'deal_stage_events',
      resolution: 'tag',
      from: '2026-11-01',
      to: '2026-11-30',
      historyStartAt: '2026-10-01',
      points,
    },
    timeSeriesExtras: {
      notices: [],
      heatmap: {
        mode,
        aggregation: 'fluss',
        points,
        phaseSeries:
          mode === 'phase_woche'
            ? [
                { phase: 'Kontakt', points: [pt(AT, 5), pt(AT2, 7)] },
                { phase: 'Termin', points: [pt(AT3, 3)] },
              ]
            : undefined,
      },
    },
  };
}

function renderHeatmap(mode: 'phase_woche' | 'woche_wochentag') {
  return render(
    <DashboardChart
      view="heatmap"
      data={heatmapData(mode)}
      title="Heatmap-Test"
      period="Letzte 12 Wochen"
      idPrefix="h1"
      onRetryChartLoad={() => undefined}
    />,
  );
}

describe('Heatmap-Tabellenalternative (Auftrag 170)', () => {
  it('zeigt bei „Phase × Woche“ die Phasenwerte je Woche statt der Rohreihe', async () => {
    renderHeatmap('phase_woche');
    const table = await screen.findByTestId('tile-table');
    const rowHeaders = within(table)
      .getAllByRole('rowheader')
      .map((h) => h.textContent ?? '');
    // 2 Phasen × 1 KW = 2 Zeilen; die Summe 5 + 7 = 12 steht in der Kontakt-Zeile.
    expect(rowHeaders).toHaveLength(2);
    expect(rowHeaders[0]).toMatch(/^Kontakt, KW \d+ \(\d{2}\.\d{2}\.\d{4}\)$/);
    expect(rowHeaders[1]).toMatch(/^Termin, KW \d+ \(\d{2}\.\d{2}\.\d{4}\)$/);
    const kontaktRow = within(table).getByRole('row', { name: /Kontakt/ });
    expect(kontaktRow).toHaveTextContent('12');
    const terminRow = within(table).getByRole('row', { name: /Termin/ });
    expect(terminRow).toHaveTextContent('3');
  });

  it('zeigt bei „Woche × Wochentag“ die Rasterzellen statt der Rohreihe', async () => {
    renderHeatmap('woche_wochentag');
    const table = await screen.findByTestId('tile-table');
    const rowHeaders = within(table)
      .getAllByRole('rowheader')
      .map((h) => h.textContent ?? '');
    // 7 Wochentage × 1 KW = 7 Zellen; Montag und Dienstag sind belegt (5 + 7 = 12).
    expect(rowHeaders).toHaveLength(7);
    expect(rowHeaders[0]).toMatch(/^Mo, KW \d+ \(\d{2}\.\d{2}\.\d{4}\)$/);
    const mondayRow = within(table).getByRole('row', { name: /^Mo,/ });
    expect(mondayRow).toHaveTextContent('5');
    const tuesdayRow = within(table).getByRole('row', { name: /^Di,/ });
    expect(tuesdayRow).toHaveTextContent('7');
  });
});
