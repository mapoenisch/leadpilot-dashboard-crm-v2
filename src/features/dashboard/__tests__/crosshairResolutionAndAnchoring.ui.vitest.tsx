// Auftrag 164 / Codex P2 Regressionstests:
// - Standalone-Diagramm ohne TimeControlProvider (Befund 1)
// - Verankerung der Quellauswahl am Zeitpunkt bei Datenverschiebungen (Befund 2)
// - Metadatenbasierte Abschnitts-Endzeitpunkte für Monats- und Wochenauflösung (Befund 3)
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DepthLineChart } from '../components/charts/DepthLineChart';
import { TimeControlProvider } from '../time/TimeControlProvider';
import { findMatchingPointIndex } from '../time/useCrosshair';
import type { TimeDatumInput } from '../components/charts/depthGeometry';

describe('findMatchingPointIndex Metadaten (Codex P2 Befund 3)', () => {
  it('Monatsauflösung: ordnet Tage im Februar dem Februar zu, März 2 jedoch nicht mehr', () => {
    const data: TimeDatumInput[] = [
      { label: 'Januar', value: 10, at: '2026-01-01T00:00:00+01:00' },
      { label: 'Februar', value: 20, at: '2026-02-01T00:00:00+01:00' },
    ];

    // Jan 15 -> Index 0
    expect(findMatchingPointIndex(data, '2026-01-15T12:00:00+01:00', { resolution: 'monat' })).toBe(
      0,
    );

    // Feb 28 -> Index 1 (letzter Tag im Februar 2026)
    expect(findMatchingPointIndex(data, '2026-02-28T23:59:59+01:00', { resolution: 'monat' })).toBe(
      1,
    );

    // 1. März und 2. März 2026 -> liegen außerhalb des Fensters (nicht fälschlich Feb)
    expect(
      findMatchingPointIndex(data, '2026-03-01T00:00:00+01:00', { resolution: 'monat' }),
    ).toBeNull();
    expect(
      findMatchingPointIndex(data, '2026-03-02T12:00:00+01:00', { resolution: 'monat' }),
    ).toBeNull();
  });

  it('Monatsauflösung nach kurzem Vormonat: schließt alle Tage des langen Folgemonats ein', () => {
    const data: TimeDatumInput[] = [
      { label: 'Februar', value: 20, at: '2026-02-01T00:00:00+01:00' },
      { label: 'März', value: 30, at: '2026-03-01T00:00:00+01:00' },
    ];

    // 31. März 2026 -> Index 1 (März hat 31 Tage, obwohl Feb nur 28 hat)
    expect(findMatchingPointIndex(data, '2026-03-31T20:00:00+02:00', { resolution: 'monat' })).toBe(
      1,
    );

    // 1. April -> außerhalb
    expect(
      findMatchingPointIndex(data, '2026-04-01T00:00:00+02:00', { resolution: 'monat' }),
    ).toBeNull();
  });

  it('Wochenauflösung mit einzelnem Punkt: schließt beliebigen Tag der Woche ein', () => {
    // 2. Feb 2026 ist Montag
    const data: TimeDatumInput[] = [{ label: 'KW 6', value: 42, at: '2026-02-02T00:00:00+01:00' }];

    // Donnerstag 5. Feb 2026 -> Index 0
    expect(findMatchingPointIndex(data, '2026-02-05T15:30:00+01:00', { resolution: 'woche' })).toBe(
      0,
    );

    // Sonntag 8. Feb 2026 -> Index 0
    expect(findMatchingPointIndex(data, '2026-02-08T23:59:59+01:00', { resolution: 'woche' })).toBe(
      0,
    );

    // Montag 9. Feb 2026 -> nächste Woche, daher außerhalb
    expect(
      findMatchingPointIndex(data, '2026-02-09T00:00:00+01:00', { resolution: 'woche' }),
    ).toBeNull();
  });

  it('Berücksichtigt windowEnd als Obergrenze', () => {
    const data: TimeDatumInput[] = [
      { label: 'Februar', value: 20, at: '2026-02-01T00:00:00+01:00' },
    ];

    // windowEnd auf 15. Feb gekappt
    expect(
      findMatchingPointIndex(data, '2026-02-10T00:00:00+01:00', {
        resolution: 'monat',
        windowEnd: '2026-02-15T00:00:00+01:00',
      }),
    ).toBe(0);

    expect(
      findMatchingPointIndex(data, '2026-02-16T00:00:00+01:00', {
        resolution: 'monat',
        windowEnd: '2026-02-15T00:00:00+01:00',
      }),
    ).toBeNull();
  });
});

describe('Standalone-Diagramm ohne TimeControlProvider (Codex P2 Befund 1)', () => {
  const STANDALONE_DATA: TimeDatumInput[] = [
    { label: '10. Okt', value: 100, at: '2026-10-10T00:00:00+02:00' },
    { label: '11. Okt', value: 150, at: '2026-10-11T00:00:00+02:00' },
    { label: '12. Okt', value: 200, at: '2026-10-12T00:00:00+02:00' },
  ];

  it('behält lokale Auswahl und Ablesewert bei Hover und Tastatur ohne Provider bei', () => {
    render(
      <DepthLineChart
        idPrefix="standalone-test"
        tileId="standalone-test"
        data={STANDALONE_DATA}
        unit="EUR"
        period="Oktober 2026"
        title="Umsatz"
        reducedMotion
      />,
    );

    // Initial: keine Linie
    expect(document.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(0);

    // Hover auf 2. Punkt (Index 1)
    const hitRects = document.querySelectorAll('rect[fill="transparent"]');
    expect(hitRects.length).toBe(3);
    fireEvent.mouseEnter(hitRects[1]!);

    // Fadenkreuzlinie MUSS sichtbar sein
    expect(document.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);

    // Ablesezeile muss 11. Okt anzeigen und Screenreader-Ankündigung aktiv haben
    const readout = screen.getByTestId('chart-readout');
    expect(readout.textContent).toContain('11. Okt');
    expect(readout.textContent).toContain('150 EUR');
    expect(readout.getAttribute('aria-live')).toBe('polite');

    // Maus verlässt -> Linie verschwindet
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    fireEvent.mouseLeave(svg!);
    expect(document.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(0);
  });
});

describe('Verankerung der Quellauswahl am Zeitpunkt (Codex P2 Befund 2)', () => {
  const INITIAL_DATA: TimeDatumInput[] = [
    { label: '10. Okt', value: 100, at: '2026-10-10T00:00:00+02:00' },
    { label: '11. Okt', value: 150, at: '2026-10-11T00:00:00+02:00' },
    { label: '12. Okt', value: 200, at: '2026-10-12T00:00:00+02:00' },
  ];

  const PREPENDED_DATA: TimeDatumInput[] = [
    { label: '09. Okt', value: 50, at: '2026-10-09T00:00:00+02:00' },
    { label: '10. Okt', value: 100, at: '2026-10-10T00:00:00+02:00' },
    { label: '11. Okt', value: 150, at: '2026-10-11T00:00:00+02:00' },
    { label: '12. Okt', value: 200, at: '2026-10-12T00:00:00+02:00' },
  ];

  const SHIFTED_OUT_DATA: TimeDatumInput[] = [
    { label: '13. Okt', value: 250, at: '2026-10-13T00:00:00+02:00' },
    { label: '14. Okt', value: 300, at: '2026-10-14T00:00:00+02:00' },
  ];

  function DynamicSourceWrapper() {
    const [dataset, setDataset] = useState<TimeDatumInput[]>(INITIAL_DATA);
    return (
      <TimeControlProvider>
        <button type="button" data-testid="prepend-btn" onClick={() => setDataset(PREPENDED_DATA)}>
          Prepend
        </button>
        <button type="button" data-testid="shift-btn" onClick={() => setDataset(SHIFTED_OUT_DATA)}>
          Shift Out
        </button>
        <DepthLineChart
          idPrefix="dynamic-tile"
          tileId="dynamic-tile"
          data={dataset}
          unit="EUR"
          period="Oktober 2026"
          title="Umsatz"
          reducedMotion
        />
      </TimeControlProvider>
    );
  }

  it('folgt dem Zeitpunkt nach Einfügen eines früheren Abschnitts und hebt Auswahl bei Entfall auf', () => {
    render(<DynamicSourceWrapper />);

    // 1. Hover auf 11. Okt (Index 1 in INITIAL_DATA)
    const hitRects = document.querySelectorAll('rect[fill="transparent"]');
    expect(hitRects.length).toBe(3);
    fireEvent.mouseEnter(hitRects[1]!);

    // Ablesezeile zeigt 11. Okt
    expect(screen.getByTestId('chart-readout').textContent).toContain('11. Okt');

    // 2. Früheren Abschnitt voranstellen (09. Okt)
    fireEvent.click(screen.getByTestId('prepend-btn'));

    // Die Auswahl MUSS weiterhin auf 11. Okt stehen (nun Index 2) statt stur auf Index 1 (10. Okt)
    const readoutAfterPrepend = screen.getByTestId('chart-readout');
    expect(readoutAfterPrepend.textContent).toContain('11. Okt');
    expect(readoutAfterPrepend.textContent).toContain('150 EUR');
    expect(document.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);

    // 3. Zeitfenster verschieben, sodass 11. Okt entfällt
    fireEvent.click(screen.getByTestId('shift-btn'));

    // Auswahl MUSS entfallen (keine Linie, Default-Text)
    expect(document.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(0);
    expect(screen.getByTestId('chart-readout').textContent).toContain(
      'Datenpunkt wählen oder darüberfahren',
    );
  });
});

describe('Verankerung der lokalen Auswahl an stabilen Schlüsseln ohne Zeitachse (Codex P2)', () => {
  const INITIAL_CATEGORIES = [
    { label: 'Stufe B', value: 20 },
    { label: 'Stufe C', value: 30 },
  ];

  const PREPENDED_CATEGORIES = [
    { label: 'Stufe A', value: 10 },
    { label: 'Stufe B', value: 20 },
    { label: 'Stufe C', value: 30 },
  ];

  const REMOVED_CATEGORIES = [
    { label: 'Stufe A', value: 10 },
    { label: 'Stufe B', value: 20 },
  ];

  function DynamicCategoriesWrapper() {
    const [dataset, setDataset] = useState(INITIAL_CATEGORIES);
    return (
      <div>
        <button
          type="button"
          data-testid="prepend-cat-btn"
          onClick={() => setDataset(PREPENDED_CATEGORIES)}
        >
          Prepend
        </button>
        <button
          type="button"
          data-testid="remove-cat-btn"
          onClick={() => setDataset(REMOVED_CATEGORIES)}
        >
          Remove C
        </button>
        <button
          type="button"
          data-testid="restore-cat-btn"
          onClick={() => setDataset(PREPENDED_CATEGORIES)}
        >
          Restore C
        </button>
        <DepthLineChart
          idPrefix="dynamic-cat-tile"
          tileId="dynamic-cat-tile"
          data={dataset}
          unit="Stk"
          period="Aktuell"
          title="Funnel"
          reducedMotion
        />
      </div>
    );
  }

  it('bewahrt Auswahl über Label bei Datenverschiebungen, löscht bei Wegfall und wählt bei Rückkehr nicht ungewollt neu', () => {
    render(<DynamicCategoriesWrapper />);

    // 1. Auswahl auf 'Stufe C' (Index 1)
    const hitRects = document.querySelectorAll('rect[fill="transparent"]');
    expect(hitRects.length).toBe(2);
    fireEvent.mouseEnter(hitRects[1]!);
    expect(screen.getByTestId('chart-readout').textContent).toContain('Stufe C');

    // 2. Prepend: 'Stufe A' voranstellen -> 'Stufe C' ist nun Index 2
    fireEvent.click(screen.getByTestId('prepend-cat-btn'));
    expect(screen.getByTestId('chart-readout').textContent).toContain('Stufe C');
    expect(screen.getByTestId('chart-readout').textContent).toContain('30 Stk');

    // 3. Remove: 'Stufe C' entfällt -> Auswahl muss explizit gelöscht sein
    fireEvent.click(screen.getByTestId('remove-cat-btn'));
    expect(screen.getByTestId('chart-readout').textContent).toContain(
      'Datenpunkt wählen oder darüberfahren',
    );

    // 4. Restore: 'Stufe C' kehrt zurück -> darf NICHT ungewollt wieder ausgewählt werden
    fireEvent.click(screen.getByTestId('restore-cat-btn'));
    expect(screen.getByTestId('chart-readout').textContent).toContain(
      'Datenpunkt wählen oder darüberfahren',
    );
  });
});
