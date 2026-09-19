import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiScenarioTradeOffs } from '../MultiScenarioTradeOffs';
import type {
  MultiVersionComparisonResult,
  ScenarioVersion,
  TradeOffDimension,
} from '../../../../types/scenario';

function version(id: string, n: number): ScenarioVersion {
  return {
    id,
    scenarioId: 'sc-1',
    versionNumber: n,
    parameters: {},
    createdAt: new Date().toISOString(),
    description: `Version ${n}`,
  } as unknown as ScenarioVersion;
}

const DIMENSIONS: TradeOffDimension[] = [
  'GROWTH',
  'PROFITABILITY',
  'LIQUIDITY',
  'ACQUISITION',
  'RETENTION',
];

function tradeOffs(all: ScenarioVersion[]) {
  return DIMENSIONS.map((dim) => ({
    dimension: dim,
    label: `Label ${dim}`,
    description: `Beschreibung ${dim}`,
    tradeOffSummary: `Summary ${dim}`,
    evaluations: Object.fromEntries(
      all.map((v, i) => [v.id, { isLeader: i === 0, metricHighlight: `${100 + i} €` }]),
    ),
  }));
}

describe('MultiScenarioTradeOffs (branch)', () => {
  it('alle fünf Dimensionen mit Icons, Leader-Stern und Normal-Zeilen', () => {
    const versions = [version('v-1', 1), version('v-2', 2)];
    render(
      <MultiScenarioTradeOffs
        tradeOffs={tradeOffs(versions) as MultiVersionComparisonResult['tradeOffs']}
        parameterMatrix={[]}
        versions={versions}
        effectiveRefId="v-1"
      />,
    );
    expect(
      screen.getByText('ZONE 3: Begründung, Trade-Off-Profile & Treiber-Matrix'),
    ).toBeInTheDocument();
    for (const icon of ['🚀', '💰', '💧', '🎯', '🛡️']) {
      expect(screen.getByText(icon)).toBeInTheDocument();
    }
    // Leader (v1) mit Stern + fett, Nicht-Leader ohne Stern
    expect(screen.getAllByText(/⭐/).length).toBeGreaterThan(0);
    expect(
      screen.getByText('Treiber- und Parameter-Matrix (Vergleich zur Referenz)'),
    ).toBeInTheDocument();
  });

  it('fehlende Evaluation für eine Version wird übersprungen (null-Zweig)', () => {
    const versions = [version('v-1', 1), version('v-2', 2)];
    const partial = [
      {
        dimension: 'GROWTH' as TradeOffDimension,
        label: 'Wachstum',
        description: 'd',
        tradeOffSummary: 's',
        evaluations: { 'v-1': { isLeader: false, metricHighlight: '50 €' } },
      },
    ];
    render(
      <MultiScenarioTradeOffs
        tradeOffs={partial as unknown as MultiVersionComparisonResult['tradeOffs']}
        parameterMatrix={[]}
        versions={versions}
        effectiveRefId="v-2"
      />,
    );
    expect(screen.getByText('Wachstum')).toBeInTheDocument();
    expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
  });

  it('Parameter-Matrix: geänderte Zeile (⚡, fett) vs. unveränderte Zeile', () => {
    const versions = [version('v-1', 1), version('v-2', 2)];
    const matrix = [
      {
        key: 'salesRepCount',
        label: 'Sales Reps',
        unit: 'FTE',
        hasChangedAgainstRef: { 'v-1': false, 'v-2': true },
        formattedValuesByVersionId: { 'v-1': '2', 'v-2': '4' },
      },
      {
        key: 'csRepCount',
        label: 'CS Reps',
        unit: 'FTE',
        hasChangedAgainstRef: { 'v-1': false, 'v-2': false },
        formattedValuesByVersionId: { 'v-1': '2', 'v-2': '2' },
      },
    ];
    render(
      <MultiScenarioTradeOffs
        tradeOffs={[]}
        parameterMatrix={matrix as unknown as MultiVersionComparisonResult['parameterMatrix']}
        versions={versions}
        effectiveRefId="v-1"
      />,
    );
    expect(screen.getByText(/Sales Reps/)).toBeInTheDocument();
    expect(screen.getByText(/⚡/)).toBeInTheDocument();
    expect(screen.getByText('CS Reps')).toBeInTheDocument();
    // Referenz-Spaltenkopf trägt (Ref)-Markierung, andere nicht
    expect(screen.getByText(/v1 \(Ref\)/)).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('leere Trade-Offs und leere Matrix rendern Kopfbereiche ohne Crash', () => {
    const versions = [version('v-9', 9)];
    render(
      <MultiScenarioTradeOffs
        tradeOffs={[]}
        parameterMatrix={[]}
        versions={versions}
        effectiveRefId="v-9"
      />,
    );
    expect(screen.getByText('5 Dimensionen (Entscheidungen 864–868)')).toBeInTheDocument();
    expect(screen.getByText(/Treiber \/ Parameter/)).toBeInTheDocument();
  });
});
