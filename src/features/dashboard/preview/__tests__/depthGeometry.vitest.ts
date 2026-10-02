// Designprobe Testkachel (Teilauftrag 0): Geometrie der Tiefen-Diagramme.
import { describe, expect, it } from 'vitest';
import {
  areaPath,
  barDepth,
  donutSegments,
  layoutBars,
  linePath,
  linePoints,
  niceScale,
} from '../charts/depthGeometry';
import { SAMPLE_SERIES, SAMPLE_SHARES, SAMPLE_STAGES } from '../previewSampleData';
import fs from 'node:fs';
import path from 'node:path';
import { DASHBOARD_PREVIEW_PATH } from '../previewRoute';

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

  it('weist negative und nicht endliche Werte ab', () => {
    expect(() => layoutBars([{ label: 'x', value: -1 }], AREA, 10)).toThrow(RangeError);
    expect(() => layoutBars([{ label: 'x', value: Number.POSITIVE_INFINITY }], AREA, 10)).toThrow(
      RangeError,
    );
  });

  it('liefert für leere Reihen keine Säulen', () => {
    expect(layoutBars([], AREA, 10)).toEqual([]);
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

describe('Vorschauroute in src/app/App.tsx', () => {
  const app = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', '..', 'app', 'App.tsx'),
    'utf-8',
  );

  it('gibt es nur im Dev-Modus oder mit Vorschau-Flag, als statischen Ausdruck für den Build', () => {
    expect(app).toMatch(
      /DASHBOARD_PREVIEW_ENABLED =\s*import\.meta\.env\.DEV \|\| import\.meta\.env\.VITE_DASHBOARD_PREVIEW === 'true'/,
    );
    expect(app).toMatch(/DashboardPreviewPage = DASHBOARD_PREVIEW_ENABLED\s*\?\s*React\.lazy/);
    expect(app).toContain('{DashboardPreviewPage && (');
    expect(DASHBOARD_PREVIEW_PATH).toBe('/dashboard-vorschau');
  });

  it('liegt außerhalb von ProtectedRoute, weil die Probe nur Beispieldaten zeigt', () => {
    expect(app.indexOf('path={DASHBOARD_PREVIEW_PATH}')).toBeGreaterThan(-1);
    expect(app.indexOf('path={DASHBOARD_PREVIEW_PATH}')).toBeLessThan(
      app.indexOf('<Route element={<ProtectedRoute />}>'),
    );
  });
});
