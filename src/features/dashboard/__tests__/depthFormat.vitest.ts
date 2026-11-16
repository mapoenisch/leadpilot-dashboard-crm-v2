import { describe, expect, it } from 'vitest';
import {
  formatAxis,
  formatAxisTickLabel,
  formatDe,
  shortenLabel,
  summarizeFunnel,
  summarizeGauge,
} from '../components/charts/depthFormat';

import { gaugeArcPath } from '../components/charts/depthGeometry';

describe('formatDe & formatAxis', () => {
  it('formatiert Zahlen nach deutscher Konvention', () => {
    expect(formatDe(1234.5)).toBe('1.234,5');
  });

  it('kürzt große Beträge kompakt und lässt kleine unverändert', () => {
    expect(formatAxis(950)).toBe('950');
    expect(formatAxis(2_500_000)).toBe('2,5 Mio.');
    expect(formatAxis(10_000_000_000)).toBe('10 Mrd.');
    expect(formatAxis(-3_000_000)).toBe('-3 Mio.');
  });

  it('kürzt Labels mit Auslassungspunkten', () => {
    expect(shortenLabel('Kurz', 10)).toBe('Kurz');
    expect(shortenLabel('SehrLangesLabelDasGekuerztWird', 8)).toBe('SehrLan…');
  });

  it('kürzt Wochen- und Datumsbeschriftungen für Diagrammachsen', () => {
    expect(formatAxisTickLabel('Woche 16.11.2026')).toBe('16.11.');
    expect(formatAxisTickLabel('05.10.2026')).toBe('05.10.');
    expect(formatAxisTickLabel('14:00')).toBe('14:00');
    expect(formatAxisTickLabel('05.10.2026, 14:00–15:00 Uhr (MESZ)')).toBe('14:00');
    expect(formatAxisTickLabel('Kategorie A')).toBe('Kategorie A');
  });
});

describe('summarizeSeries, summarizeGauge, summarizeFunnel', () => {
  it('erzeugt SVG-Bogenpfade für Tachometer', () => {
    const path = gaugeArcPath(280, 160, 95, 225, 135);
    expect(path).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? A 95 95 0 1 1/);
    expect(gaugeArcPath(280, 160, 95, 0, 0)).toBe('');

    const gSummary = summarizeGauge('EBITDA-Marge', 24, '%', 'FY 2025', 0, 100);
    expect(gSummary).toContain('Tachometer für EBITDA-Marge: 24 %');
    expect(gSummary).toContain('Skala von 0 % bis 100 %');

    const fSummary = summarizeFunnel(
      [
        { label: 'Leads', value: 100 },
        { label: 'Kunden', value: 20 },
      ],
      'Deals',
      'Aktuell',
    );
    expect(fSummary).toBe(
      'Trichter mit 2 Stufen von Leads (100 Deals) bis Kunden (20 Deals), Aktuell.',
    );
    expect(summarizeFunnel([], 'Deals', 'Aktuell')).toBe('Keine Trichterstufen für Aktuell.');
  });
});
