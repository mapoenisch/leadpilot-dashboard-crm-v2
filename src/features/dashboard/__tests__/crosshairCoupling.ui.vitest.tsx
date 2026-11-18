// Auftrag 164: Rot-Nachweise für Fadenkreuz-Kopplung (Auftrag 161 §2.4 Nr. 18–21).
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeControlProvider } from '../time/TimeControlProvider';
import { DepthLineChart } from '../components/charts/DepthLineChart';
import type { TimeDatumInput } from '../components/charts/depthGeometry';

const TIME_SERIES_A: TimeDatumInput[] = [
  { label: '10. Okt', value: 100, at: '2026-10-10T00:00:00+02:00' },
  { label: '11. Okt', value: 150, at: '2026-10-11T00:00:00+02:00' },
  { label: '12. Okt', value: 200, at: '2026-10-12T00:00:00+02:00' },
  { label: '13. Okt', value: 250, at: '2026-10-13T00:00:00+02:00' },
];

const TIME_SERIES_B: TimeDatumInput[] = [
  { label: '10. Okt', value: 10, at: '2026-10-10T00:00:00+02:00' },
  { label: '11. Okt', value: 20, at: '2026-10-11T00:00:00+02:00' },
  { label: '12. Okt', value: 30, at: '2026-10-12T00:00:00+02:00' },
  { label: '13. Okt', value: 40, at: '2026-10-13T00:00:00+02:00' },
];

function renderTwoTiles() {
  return render(
    <TimeControlProvider>
      <div data-testid="tile-a">
        <DepthLineChart
          idPrefix="tile-a"
          tileId="tile-a"
          data={TIME_SERIES_A}
          unit="EUR"
          period="Oktober 2026"
          title="Umsatz"
          reducedMotion
        />
      </div>
      <div data-testid="tile-b">
        <DepthLineChart
          idPrefix="tile-b"
          tileId="tile-b"
          data={TIME_SERIES_B}
          unit="Deals"
          period="Oktober 2026"
          title="Abschlüsse"
          reducedMotion
        />
      </div>
    </TimeControlProvider>,
  );
}

describe('Fadenkreuz-Kopplung (Rot-Nachweise)', () => {
  // (a) Vitest Fadenkreuz in Kachel A zeigt Linie in Kachel B
  it('(a) Fadenkreuz in Kachel A zeigt Linie in Kachel B und aktualisiert Ablesezeile', () => {
    renderTwoTiles();

    const tileA = screen.getByTestId('tile-a');
    const tileB = screen.getByTestId('tile-b');

    // Zu Beginn keine Fadenkreuz-Linie in Kachel B
    const bLinesBefore = tileB.querySelectorAll('line[stroke-dasharray="2 3"]');
    expect(bLinesBefore.length).toBe(0);

    // Kachel A: Maus über 2. Datenpunkt (11. Okt, Index 1)
    const hitRectsA = tileA.querySelectorAll('rect[fill="transparent"]');
    expect(hitRectsA.length).toBe(4);
    fireEvent.mouseEnter(hitRectsA[1]!);

    // Kachel A zeigt Linie
    const aLinesAfter = tileA.querySelectorAll('line[stroke-dasharray="2 3"]');
    expect(aLinesAfter.length).toBe(1);

    // Kachel B MUSS jetzt ebenfalls eine Fadenkreuz-Linie am passenden Abschnitt zeigen
    const bLinesAfter = tileB.querySelectorAll('line[stroke-dasharray="2 3"]');
    expect(bLinesAfter.length).toBe(1);

    // Kachel B Ablesezeile zeigt den Wert für 11. Okt (20 Deals)
    const readouts = screen.getAllByTestId('chart-readout');
    const readoutB = readouts[1]!;
    expect(readoutB.textContent).toContain('11. Okt');
    expect(readoutB.textContent).toContain('20 Deals');

    // Nur die auslösende Kachel A kündigt per aria-live="polite" an, Kachel B nicht
    const readoutA = readouts[0]!;
    expect(readoutA.getAttribute('aria-live')).toBe('polite');
    expect(readoutB.getAttribute('aria-live')).toBe('off');
  });

  // (b) Render-Zähltest mit 1 auslösender, 3 mitlaufenden und 3 Nicht-Verlaufskacheln
  it('(b) Render-Zähltest: Nur Verlaufskacheln rendern neu, Nicht-Verlaufskacheln nicht', () => {
    let rendersNV1 = 0;
    let rendersNV2 = 0;
    let rendersNV3 = 0;

    const NonVerlauf1 = React.memo(() => {
      rendersNV1++;
      return <div data-testid="nv-1">NV1</div>;
    });
    const NonVerlauf2 = React.memo(() => {
      rendersNV2++;
      return <div data-testid="nv-2">NV2</div>;
    });
    const NonVerlauf3 = React.memo(() => {
      rendersNV3++;
      return <div data-testid="nv-3">NV3</div>;
    });

    render(
      <TimeControlProvider>
        <div data-testid="v-1">
          <DepthLineChart
            idPrefix="v1"
            tileId="v1"
            data={TIME_SERIES_A}
            unit="EUR"
            period="Okt"
            title="V1"
            reducedMotion
          />
        </div>
        <div data-testid="v-2">
          <DepthLineChart
            idPrefix="v2"
            tileId="v2"
            data={TIME_SERIES_B}
            unit="Deals"
            period="Okt"
            title="V2"
            reducedMotion
          />
        </div>
        <div data-testid="v-3">
          <DepthLineChart
            idPrefix="v3"
            tileId="v3"
            data={TIME_SERIES_B}
            unit="Deals"
            period="Okt"
            title="V3"
            reducedMotion
          />
        </div>
        <div data-testid="v-4">
          <DepthLineChart
            idPrefix="v4"
            tileId="v4"
            data={TIME_SERIES_B}
            unit="Deals"
            period="Okt"
            title="V4"
            reducedMotion
          />
        </div>
        <NonVerlauf1 />
        <NonVerlauf2 />
        <NonVerlauf3 />
      </TimeControlProvider>,
    );

    const initialNV1 = rendersNV1;
    const initialNV2 = rendersNV2;
    const initialNV3 = rendersNV3;

    // Fadenkreuz-Wechsel in V1 auslösen
    const v1 = screen.getByTestId('v-1');
    const hitRectsV1 = v1.querySelectorAll('rect[fill="transparent"]');
    fireEvent.mouseEnter(hitRectsV1[2]!);

    // Nicht-Verlaufskacheln dürfen NICHT neu gerendert haben
    expect(rendersNV1).toBe(initialNV1);
    expect(rendersNV2).toBe(initialNV2);
    expect(rendersNV3).toBe(initialNV3);

    // V2, V3, V4 zeigen Fadenkreuz-Linie
    const v2 = screen.getByTestId('v-2');
    const v3 = screen.getByTestId('v-3');
    const v4 = screen.getByTestId('v-4');
    expect(v2.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(v3.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(v4.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
  });

  // (c) Tastatur Pfeiltaste wandert
  it('(c) Tastatur: Slider-Fokus setzt Fadenkreuz, Pfeiltasten wandern, Escape leert', async () => {
    const user = userEvent.setup();
    renderTwoTiles();

    const tileA = screen.getByTestId('tile-a');
    const tileB = screen.getByTestId('tile-b');
    const sliders = screen.getAllByRole('slider');
    const sliderA = sliders[0]!;

    // Fokus auf Slider in Kachel A setzt Fadenkreuz auf ersten Punkt (10. Okt)
    await user.click(sliderA);

    expect(tileA.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(tileB.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    const readouts = screen.getAllByTestId('chart-readout');
    expect(readouts[1]!.textContent).toContain('10. Okt');

    // Pfeiltaste rechts wandert zum nächsten Zeitpunkt (11. Okt)
    await user.keyboard('{ArrowRight}');
    expect(readouts[1]!.textContent).toContain('11. Okt');

    // Escape leert das Fadenkreuz
    await user.keyboard('{Escape}');
    expect(tileA.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(0);
    expect(tileB.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(0);
  });

  it('koppelt Kacheln mit unterschiedlichen Auflösungen (Tag vs. Woche)', () => {
    const dailyData: TimeDatumInput[] = [
      { label: '09. Okt', value: 10, at: '2026-10-09T00:00:00+02:00' },
      { label: '14. Okt', value: 20, at: '2026-10-14T00:00:00+02:00' },
    ];
    const weeklyData: TimeDatumInput[] = [
      { label: 'KW 41', value: 100, at: '2026-10-05T00:00:00+02:00' },
      { label: 'KW 42', value: 200, at: '2026-10-12T00:00:00+02:00' },
    ];

    render(
      <TimeControlProvider>
        <div data-testid="tile-daily">
          <DepthLineChart
            idPrefix="daily"
            tileId="daily"
            data={dailyData}
            unit="Deals"
            period="Okt"
            title="Täglich"
            reducedMotion
          />
        </div>
        <div data-testid="tile-weekly">
          <DepthLineChart
            idPrefix="weekly"
            tileId="weekly"
            data={weeklyData}
            unit="EUR"
            period="Okt"
            title="Wöchentlich"
            reducedMotion
          />
        </div>
      </TimeControlProvider>,
    );

    const daily = screen.getByTestId('tile-daily');
    const weekly = screen.getByTestId('tile-weekly');

    // 14. Okt in Täglich auswählen -> liegt in KW 42 (12. Okt bis 19. Okt)
    const hitDaily = daily.querySelectorAll('rect[fill="transparent"]');
    fireEvent.mouseEnter(hitDaily[1]!);

    const weeklyLines = weekly.querySelectorAll('line[stroke-dasharray="2 3"]');
    expect(weeklyLines.length).toBe(1);

    const readouts = screen.getAllByTestId('chart-readout');
    expect(readouts[1]!.textContent).toContain('KW 42');
    expect(readouts[1]!.textContent).toContain('200 EUR');
  });

  it('zeigt kein Fadenkreuz, wenn Zeitpunkt außerhalb des eigenen Fensters liegt', () => {
    const earlyData: TimeDatumInput[] = [
      { label: '01. Okt', value: 10, at: '2026-10-01T00:00:00+02:00' },
      { label: '02. Okt', value: 20, at: '2026-10-02T00:00:00+02:00' },
    ];
    const lateData: TimeDatumInput[] = [
      { label: '20. Okt', value: 100, at: '2026-10-20T00:00:00+02:00' },
      { label: '21. Okt', value: 200, at: '2026-10-21T00:00:00+02:00' },
    ];

    render(
      <TimeControlProvider>
        <div data-testid="early">
          <DepthLineChart
            idPrefix="early"
            tileId="early"
            data={earlyData}
            unit="Stk"
            period="Anfang Okt"
            title="Früh"
            reducedMotion
          />
        </div>
        <div data-testid="late">
          <DepthLineChart
            idPrefix="late"
            tileId="late"
            data={lateData}
            unit="Stk"
            period="Ende Okt"
            title="Spät"
            reducedMotion
          />
        </div>
      </TimeControlProvider>,
    );

    const early = screen.getByTestId('early');
    const late = screen.getByTestId('late');

    // 01. Okt in early auswählen -> liegt vor dem Beginn von late (20. Okt)
    fireEvent.mouseEnter(early.querySelectorAll('rect[fill="transparent"]')[0]!);

    expect(early.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    // Late darf keine Linie zeigen
    expect(late.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(0);
  });

  it('unterstützt Touch / Tippen per PointerDown', () => {
    render(
      <TimeControlProvider>
        <div data-testid="tile-touch-a">
          <DepthLineChart
            idPrefix="touch-a"
            tileId="touch-a"
            data={TIME_SERIES_A}
            unit="EUR"
            period="Okt"
            title="Touch A"
            reducedMotion
          />
        </div>
        <div data-testid="tile-touch-b">
          <DepthLineChart
            idPrefix="touch-b"
            tileId="touch-b"
            data={TIME_SERIES_B}
            unit="Deals"
            period="Okt"
            title="Touch B"
            reducedMotion
          />
        </div>
      </TimeControlProvider>,
    );

    const tileA = screen.getByTestId('tile-touch-a');
    const tileB = screen.getByTestId('tile-touch-b');

    // Tippen auf 3. Datenpunkt in Kachel A
    fireEvent.pointerDown(tileA.querySelectorAll('rect[fill="transparent"]')[2]!);

    expect(tileA.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(tileB.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(screen.getAllByTestId('chart-readout')[1]!.textContent).toContain('12. Okt');
  });

  it('funktioniert mit Diagrammen ohne Zeitachse unverändert (Standalone)', () => {
    const categorical = [
      { label: 'Nord', value: 10 },
      { label: 'Süd', value: 20 },
      { label: 'West', value: 30 },
    ];
    render(
      <DepthLineChart
        idPrefix="cat"
        data={categorical}
        unit="EUR"
        period="2026"
        title="Regionen"
        reducedMotion
      />,
    );

    // Klick auf ersten Datenpunkt
    const rects = screen.getAllByRole('img')[0]!.querySelectorAll('rect[fill="transparent"]');
    fireEvent.mouseEnter(rects[0]!);

    expect(screen.getByTestId('chart-readout').textContent).toContain('Nord');
    expect(screen.getByTestId('chart-readout').getAttribute('aria-live')).toBe('polite');
  });

  it('eingeklappte Sektionen rendern keine Diagramme bei Fadenkreuz-Wechsel', () => {
    let collapsedChartRenders = 0;
    const CollapsedLineChart = (props: React.ComponentProps<typeof DepthLineChart>) => {
      collapsedChartRenders++;
      return <DepthLineChart {...props} />;
    };

    const isCollapsed = true;

    render(
      <TimeControlProvider>
        <div data-testid="visible-tile">
          <DepthLineChart
            idPrefix="vis"
            tileId="vis"
            data={TIME_SERIES_A}
            unit="EUR"
            period="Okt"
            title="Sichtbar"
            reducedMotion
          />
        </div>
        {/* Eingeklappte Sektion rendert ihren Inhalt bedingt nicht */}
        {!isCollapsed ? (
          <div data-testid="collapsed-tile">
            <CollapsedLineChart
              idPrefix="col"
              tileId="col"
              data={TIME_SERIES_B}
              unit="Deals"
              period="Okt"
              title="Eingeklappt"
              reducedMotion
            />
          </div>
        ) : null}
      </TimeControlProvider>,
    );

    expect(collapsedChartRenders).toBe(0);

    // Fadenkreuz in sichtbarer Kachel aktivieren
    const vis = screen.getByTestId('visible-tile');
    fireEvent.mouseEnter(vis.querySelectorAll('rect[fill="transparent"]')[1]!);

    // Eingeklappte Kachel hat 0 Renders
    expect(collapsedChartRenders).toBe(0);
  });

  it('Fokusverlust von Kachel A leert nicht das Fadenkreuz, wenn Kachel B bereits Quelle ist (Codex P2)', () => {
    renderTwoTiles();
    const tileA = screen.getByTestId('tile-a');
    const tileB = screen.getByTestId('tile-b');
    const sliderA = tileA.querySelector('input[type="range"]')!;

    // 1. Slider in Kachel A fokussieren -> Kachel A wird Quelle
    fireEvent.focus(sliderA);
    expect(tileA.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(tileB.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);

    // 2. Klick auf Kachel B -> Kachel B wird neue Quelle
    const hitRectsB = tileB.querySelectorAll('rect[fill="transparent"]');
    fireEvent.pointerDown(hitRectsB[2]!);

    // 3. Slider A verliert Fokus (blur)
    fireEvent.blur(sliderA);

    // Fadenkreuz muss weiterhin aktiv sein (von Kachel B gesteuert)
    expect(tileB.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
    expect(tileA.querySelectorAll('line[stroke-dasharray="2 3"]').length).toBe(1);
  });
});
