// Designprobe Testkachel (Teilauftrag 0): Geometrie der Tiefen-Diagramme.
import { describe, expect, it } from 'vitest';
import {
  areaPath,
  barDepth,
  donutSegments,
  layoutBars,
  layoutHBars,
  linePath,
  linePoints,
  niceScale,
  niceSignedScale,
  summarizeSeries,
} from '../components/charts/depthGeometry';
import { SAMPLE_SERIES, SAMPLE_SHARES, SAMPLE_STAGES } from '../preview/previewSampleData';
import fs from 'node:fs';
import path from 'node:path';
import { DASHBOARD_PREVIEW_PATH } from '../preview/previewRoute';
import { SERIES_COLORS, shadeHex, shareColors } from '../components/charts/chartTypes';

const AREA = { left: 10, top: 20, width: 400, height: 200 };
const RING = { cx: 100, cy: 100, outer: 80, inner: 50 };

describe('barDepth', () => {
  it('bleibt wie im bestehenden Funnel-Stil zwischen 3 und 8 px', () => {
    expect(barDepth(5)).toBe(3);
    expect(barDepth(40)).toBe(6);
    expect(barDepth(500)).toBe(8);
  });
});

describe('niceScale', () => {
  it('liefert eine runde Obergrenze über dem Maximum mit aufsteigenden Hilfslinien', () => {
    const scale = niceScale(1280);
    expect(scale.max).toBeGreaterThanOrEqual(1280);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max);
    expect([...scale.ticks].sort((a, b) => a - b)).toEqual(scale.ticks);
  });

  it('fällt bei leeren oder ungültigen Maxima sicher auf 0 bis 1 zurück', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(Number.NaN)).toEqual({ max: 1, ticks: [0, 1] });
  });
});

describe('niceSignedScale', () => {
  it('entspricht niceScale bei nur positiven Werten', () => {
    expect(niceSignedScale(0, 1280)).toEqual({ min: 0, ...niceScale(1280) });
  });

  it('spiegelt bei nur negativen Werten', () => {
    const scale = niceSignedScale(-1280, 0);
    expect(scale.max).toBe(0);
    expect(scale.min).toBe(-niceScale(1280).max);
    expect(scale.ticks[0]).toBe(scale.min);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(0);
  });

  it('enthält bei gemischten Vorzeichen die 0 als Hilfslinie', () => {
    const scale = niceSignedScale(-30, 120);
    expect(scale.min).toBeLessThanOrEqual(-30);
    expect(scale.max).toBeGreaterThanOrEqual(120);
    expect(scale.ticks).toContain(0);
  });

  it('fällt bei fehlenden Werten auf 0 bis 1 zurück', () => {
    expect(niceSignedScale(0, 0)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
    expect(niceSignedScale(Number.NaN, Number.NaN)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });
});

describe('layoutBars', () => {
  it('zeichnet den Höchstwert über die volle Höhe und 0 ohne Höhe', () => {
    const bars = layoutBars(
      [
        { label: 'a', value: 100 },
        { label: 'b', value: 0 },
      ],
      AREA,
      100,
    );
    expect(bars[0]?.height).toBe(200);
    expect(bars[0]?.y).toBe(20);
    expect(bars[1]?.height).toBe(0);
    expect(bars[1]?.y).toBe(220);
  });

  it('weist nicht endliche Werte ab', () => {
    expect(() => layoutBars([{ label: 'x', value: Number.POSITIVE_INFINITY }], AREA, 10)).toThrow(
      RangeError,
    );
    expect(() => layoutBars([{ label: 'x', value: Number.NaN }], AREA, 10)).toThrow(RangeError);
  });

  it('zeichnet negative Werte unterhalb der Nullachse (Auftrag 073)', () => {
    const bars = layoutBars(
      [
        { label: 'plus', value: 50 },
        { label: 'minus', value: -50 },
      ],
      AREA,
      { min: -100, max: 100 },
    );
    // Nullachse in der Mitte: 20 + 200 * 100 / 200 = 120.
    expect(bars[0]).toMatchObject({ zero: 120, y: 70, height: 50, negative: false });
    expect(bars[1]).toMatchObject({ zero: 120, y: 120, height: 50, negative: true });
  });

  it('legt die Nullachse bei nur negativen Werten an die Oberkante', () => {
    const bars = layoutBars([{ label: 'a', value: -40 }], AREA, { min: -100, max: 0 });
    expect(bars[0]).toMatchObject({ zero: 20, y: 20, height: 80, negative: true });
  });

  it('hebt kleine Werte ungleich 0 auf 2 px an, 0 bleibt ohne Fläche', () => {
    const bars = layoutBars(
      [
        { label: 'groß', value: 10000 },
        { label: 'klein', value: 1 },
        { label: 'klein-minus', value: -1 },
        { label: 'null', value: 0 },
      ],
      AREA,
      { min: -10000, max: 10000 },
    );
    expect(bars[1]).toMatchObject({ height: 2, y: 118, value: 1 });
    expect(bars[2]).toMatchObject({ height: 2, y: 120, value: -1 });
    expect(bars[3]).toMatchObject({ height: 0, y: 120 });
  });

  it('liefert für leere Reihen keine Säulen', () => {
    expect(layoutBars([], AREA, 10)).toEqual([]);
  });
});

describe('layoutHBars', () => {
  it('skaliert die Länge auf die Skalenobergrenze, Nullwerte haben keine Länge', () => {
    const bars = layoutHBars(
      [
        { label: 'a', value: 50 },
        { label: 'b', value: 0 },
      ],
      AREA,
      100,
    );
    expect(bars[0]?.length).toBe(200);
    expect(bars[1]?.length).toBe(0);
    expect(bars[0]?.depth).toBeGreaterThanOrEqual(3);
    expect(bars[0]?.depth).toBeLessThanOrEqual(8);
    expect((bars[1]?.y ?? 0) > (bars[0]?.y ?? 0)).toBe(true);
  });

  it('akzeptiert leere Daten', () => {
    expect(layoutHBars([], AREA, 10)).toEqual([]);
  });

  it('zeichnet negative Werte links der Nullachse und hebt kleine Werte an', () => {
    const bars = layoutHBars(
      [
        { label: 'plus', value: 50 },
        { label: 'minus', value: -50 },
        { label: 'klein', value: 0.001 },
      ],
      AREA,
      { min: -100, max: 100 },
    );
    // Nullachse in der Mitte: 10 + 400 * 100 / 200 = 210.
    expect(bars[0]).toMatchObject({ zero: 210, x: 210, length: 100, negative: false });
    expect(bars[1]).toMatchObject({ zero: 210, x: 110, length: 100, negative: true });
    expect(bars[2]).toMatchObject({ x: 210, length: 2 });
  });
});

describe('donutSegments', () => {
  it('verteilt exakt 360° und Anteile, die sich auf 1 summieren', () => {
    const segments = donutSegments(SAMPLE_SHARES, RING);
    expect(segments).toHaveLength(SAMPLE_SHARES.length);
    expect(segments[0]?.startAngle).toBe(0);
    expect(segments[segments.length - 1]?.endAngle).toBe(360);
    const sum = segments.reduce((total, segment) => total + segment.share, 0);
    expect(sum).toBeCloseTo(1, 10);
    for (let i = 1; i < segments.length; i += 1) {
      expect(segments[i]?.startAngle).toBe(segments[i - 1]?.endAngle);
    }
  });

  it('zeichnet ein einzelnes Segment als geschlossenen Ring statt eines leeren Pfads', () => {
    const [only] = donutSegments([{ label: 'alles', value: 5 }], RING);
    expect(only?.share).toBe(1);
    expect(only?.path).toMatch(/^M .* Z$/);
  });

  it('liefert für eine Summe von 0 keine Segmente und weist negative Werte ab', () => {
    expect(donutSegments([{ label: 'a', value: 0 }], RING)).toEqual([]);
    expect(() => donutSegments([{ label: 'a', value: -2 }], RING)).toThrow(RangeError);
  });
});

describe('linePoints, linePath, areaPath', () => {
  it('legt die Punkte exakt auf den Wert, ohne Tiefenverschiebung', () => {
    const points = linePoints(
      [
        { label: 'a', value: 0 },
        { label: 'b', value: 50 },
        { label: 'c', value: 100 },
      ],
      AREA,
      100,
    );
    expect(points.map((p) => p.y)).toEqual([220, 120, 20]);
    expect(points.map((p) => p.x)).toEqual([10, 210, 410]);
    expect(linePath(points)).toBe('M 10 220 L 210 120 L 410 20');
    expect(areaPath(points, 220)).toBe('M 10 220 L 210 120 L 410 20 L 410 220 L 10 220 Z');
    expect(areaPath([], 220)).toBe('');
  });
});

describe('Beispieldaten', () => {
  it('sind darstellbar, die Anteile summieren exakt auf 100 %', () => {
    expect(SAMPLE_SHARES.reduce((sum, entry) => sum + entry.value, 0)).toBe(100);
    expect(SAMPLE_STAGES.every((entry) => entry.value >= 0)).toBe(true);
    expect(SAMPLE_SERIES).toHaveLength(12);
  });
});

describe('Vorschau als eigener Einstieg, getrennt von der Produktiv-App', () => {
  const root = path.join(__dirname, '..', '..', '..', '..');
  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf-8');

  it('liegt unter einer eigenen HTML-Seite mit eigenem Einstiegsskript', () => {
    expect(DASHBOARD_PREVIEW_PATH).toBe('/dashboard-vorschau.html');
    const html = read('dashboard-vorschau.html');
    expect(html).toContain('src="/src/features/dashboard/preview/previewMain.tsx"');
    expect(html).not.toContain('/src/app/main.tsx');
  });

  it('berührt die Produktiv-App nicht: App und main kennen die Vorschau nicht', () => {
    for (const file of ['src/app/App.tsx', 'src/app/main.tsx', 'index.html']) {
      const source = read(file);
      expect(source).not.toMatch(/dashboard\/preview|dashboard-vorschau|DASHBOARD_PREVIEW/);
    }
  });

  it('lädt im Einstieg weder Anmeldung, Organisation, Store noch Datendienste', () => {
    const entry = read('src/features/dashboard/preview/previewMain.tsx');
    expect(entry).not.toMatch(/@\/(auth|store|services|app)\b/);
    expect(entry).toContain("from './DashboardPreviewPage'");
  });

  it('wird nur mit VITE_DASHBOARD_PREVIEW=true gebaut', () => {
    const config = read('vite.config.ts');
    expect(config).toMatch(/VITE_DASHBOARD_PREVIEW === 'true'/);
    // Der Eingang der Produktiv-App muss `index` heißen: .size-limit.json misst dist/assets/index-*.js.
    expect(config).toContain("index: path.resolve(__dirname, 'index.html')");
    expect(config).toMatch(
      /previewBuild\s*\?\s*\{ vorschau: path\.resolve\(__dirname, 'dashboard-vorschau\.html'\) \}\s*:\s*\{\}/,
    );
  });
});

describe('summarizeSeries', () => {
  const data = [
    { label: 'Q1', value: 10 },
    { label: 'Q2', value: 30 },
    { label: 'Q3', value: 20 },
  ];

  it('nennt Spannweite bei Rangfolge', () => {
    const text = summarizeSeries(data, 'Leads', 'Q3 2026', 'ranking');
    expect(text).toContain('3 Werte, Q3 2026.');
    expect(text).toContain('Höchster Wert: Q2, 30 Leads');
    expect(text).toContain('Niedrigster Wert: Q1, 10 Leads');
  });

  it('nennt Richtung und Änderung bei Verlauf', () => {
    expect(summarizeSeries(data, 'Leads', 'Q3 2026', 'trend')).toContain(
      'Von Q1 (10 Leads) bis Q3 (20 Leads) gestiegen um 10 Leads',
    );
  });

  it('nennt größten Anteil bei Anteilen und vermeidet Anteile bei Summe 0', () => {
    expect(summarizeSeries(data, 'Leads', 'Q3 2026', 'share')).toContain(
      'Größter Anteil: Q2 mit 30 Leads (50 Prozent)',
    );
    expect(summarizeSeries([{ label: 'A', value: 0 }], 'Leads', 'Q3 2026', 'share')).toContain(
      'keine Anteile',
    );
  });

  it('benennt leere Reihen', () => {
    expect(summarizeSeries([], 'Leads', 'Q3 2026', 'trend')).toBe('Keine Werte für Q3 2026.');
  });
});

describe('Anteilsfarben', () => {
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + c * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);

  it('mischt mit Schwarz und Weiß', () => {
    expect(shadeHex('#808080', -1)).toBe('#000000');
    expect(shadeHex('#808080', 1)).toBe('#ffffff');
    expect(shadeHex('#204060', 0)).toBe('#204060');
    expect(shadeHex('#204060', -0.5)).toBe('#102030');
  });

  it('stuft Türkis vom größten Anteil (hell) zum kleinsten (dunkel) ab', () => {
    const values = SERIES_COLORS.map(luminance);
    values.slice(1).forEach((value, index) => expect(value).toBeLessThan(values[index] ?? 0));
  });

  it('vergibt den hellsten Ton dem größten Anteil, auch bei unsortierten Daten', () => {
    expect(shareColors([5, 41, 16, 27.5, 10.5])).toEqual([
      SERIES_COLORS[4],
      SERIES_COLORS[0],
      SERIES_COLORS[2],
      SERIES_COLORS[1],
      SERIES_COLORS[3],
    ]);
    expect(shareColors([10, 10])).toEqual([SERIES_COLORS[0], SERIES_COLORS[1]]);
    // Mehr Anteile als Töne: kleinere Ränge bleiben beim dunkelsten Ton, nie wieder hell.
    const many = shareColors([70, 60, 50, 40, 30, 20, 10]);
    expect(many.slice(4)).toEqual([SERIES_COLORS[4], SERIES_COLORS[4], SERIES_COLORS[4]]);
    expect(many).not.toContain(undefined);
  });
});
