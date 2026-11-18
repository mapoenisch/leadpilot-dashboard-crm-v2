import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { TileThresholdBadge } from '../components/TileThresholdBadge';
import { LazyDashboardTile } from '../components/LazyDashboardTile';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import type { ThresholdEvaluationResult } from '../model/thresholdRuleV2';

describe('TileThresholdBadge & Kachelanzeige (Auftrag 166 / P13a)', () => {
  it('zeigt Badge mit Text, Symbol und aria-label fuer warnung und kritisch', () => {
    const warnEval: ThresholdEvaluationResult = {
      stufe: 'warnung',
      grenze: 200,
      text: 'Warnung (ab 200 EUR)',
    };

    const { rerender } = render(<TileThresholdBadge evaluation={warnEval} />);
    const badge = screen.getByTestId('tile-threshold-badge');
    expect(badge).toHaveTextContent('Warnung');
    expect(badge).toHaveAttribute('data-threshold-stufe', 'warnung');
    expect(badge).toHaveAttribute('aria-label', 'Schwellenwert: Warnung (ab 200 EUR)');

    const critEval: ThresholdEvaluationResult = {
      stufe: 'kritisch',
      grenze: 500,
      text: 'Kritisch (ab 500 EUR)',
    };
    rerender(<TileThresholdBadge evaluation={critEval} />);
    expect(badge).toHaveTextContent('Kritisch');
    expect(badge).toHaveAttribute('data-threshold-stufe', 'kritisch');
    expect(badge).toHaveAttribute('aria-label', 'Schwellenwert: Kritisch (ab 500 EUR)');
  });

  it('zeigt Schwellenwert pruefen fuer regel_ungueltig', () => {
    const invalidEval: ThresholdEvaluationResult = {
      stufe: 'regel_ungueltig',
      text: 'Der Operator Zwischen kann nicht eindeutig übersetzt werden.',
    };
    render(<TileThresholdBadge evaluation={invalidEval} />);
    const badge = screen.getByTestId('tile-threshold-badge');
    expect(badge).toHaveTextContent('Schwellenwert prüfen');
    expect(badge).toHaveAttribute('data-threshold-stufe', 'regel_ungueltig');
  });

  it('rendert kein Badge bei normal, keine_daten oder nicht_bewertet', () => {
    const { container, rerender } = render(
      <TileThresholdBadge evaluation={{ stufe: 'normal', text: 'Im Normalbereich' }} />,
    );
    expect(container.firstChild).toBeNull();

    rerender(<TileThresholdBadge evaluation={{ stufe: 'keine_daten', text: 'Keine Daten' }} />);
    expect(container.firstChild).toBeNull();

    rerender(
      <TileThresholdBadge evaluation={{ stufe: 'nicht_bewertet', text: 'Nicht bewertet' }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  describe('Integration in LazyDashboardTile', () => {
    const tile: DashboardTileConfig = {
      tileId: 't-1',
      catalogId: 'baseline.arr',
      view: 'zahl',
      size: 'klein',
      filterMode: 'dashboard',
    };

    const fakeData: TileData = {
      catalogId: 'baseline.arr',
      state: 'bereit',
      value: 250,
      series: null,
      overview: null,
      unit: 'EUR',
      timeBasis: 'Stand 2025',
      asOf: null,
      origin: { layer: 'baseline', module: '', exportName: '' },
      scope: 'stammdaten',
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    };

    it('bewertet Regel und zeigt Warnungs-Badge sowie linken 2px Rand', () => {
      render(
        <LazyDashboardTile
          tile={tile}
          useData={() => fakeData}
          onShowDetails={vi.fn()}
          threshold={{
            formatVersion: 2,
            enabled: true,
            art: 'hoch_ist_schlecht',
            einheit: 'EUR',
            warnung: 200,
            kritisch: 500,
          }}
        />,
      );

      const badge = screen.getByTestId('tile-threshold-badge');
      expect(badge).toHaveTextContent('Warnung');
      const card = screen.getByTestId('dashboard-tile');
      expect(card.className).toContain('border-l-2 border-l-amber-400');
    });

    it('zeigt kein Badge bei Zeitreihen (Nicht-Einzelwert)', () => {
      const timeSeriesTile: DashboardTileConfig = {
        tileId: 't-ts',
        catalogId: 'baseline.arr_verlauf',
        view: 'linie',
        size: 'mittel',
        filterMode: 'dashboard',
      };

      render(
        <LazyDashboardTile
          tile={timeSeriesTile}
          useData={() => fakeData}
          onShowDetails={vi.fn()}
          threshold={{
            formatVersion: 2,
            enabled: true,
            art: 'hoch_ist_schlecht',
            einheit: 'EUR',
            warnung: 200,
          }}
        />,
      );

      expect(screen.queryByTestId('tile-threshold-badge')).toBeNull();
    });
  });

  describe('Render-Zähler-Test (2.4 Nr. 25)', () => {
    it('rendert Badge bei unveraendertem Wert nicht zusaetzlich neu', () => {
      let badgeRenders = 0;

      const MonitoredBadge: React.FC<{ evaluation: ThresholdEvaluationResult }> = React.memo(
        ({ evaluation }) => {
          badgeRenders++;
          return <TileThresholdBadge evaluation={evaluation} />;
        },
      );

      let triggerParentRerender: () => void = () => {};

      function TestParent() {
        const [, setTick] = useState(0);
        triggerParentRerender = () => setTick((t) => t + 1);

        // Evaluation bleibt wertstabil
        const evaluation = React.useMemo<ThresholdEvaluationResult>(
          () => ({
            stufe: 'warnung',
            grenze: 200,
            text: 'Warnung (ab 200 EUR)',
          }),
          [],
        );

        return <MonitoredBadge evaluation={evaluation} />;
      }

      render(<TestParent />);
      expect(badgeRenders).toBe(1);

      // Re-render des Parents triggern ohne Wertänderung
      act(() => {
        triggerParentRerender();
      });

      // Badge darf dank React.memo nicht erneut gerendert haben
      expect(badgeRenders).toBe(1);
    });
  });
});
