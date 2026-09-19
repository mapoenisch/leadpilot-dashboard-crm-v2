import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiScenarioKpiTable } from '../MultiScenarioKpiTable';
import type { ScenarioVersion, MultiVersionComparisonResult, KpiMatrixRow } from '@/types/scenario';

function ver(id: string, n: number): ScenarioVersion {
  return {
    id,
    scenarioId: 'sA',
    versionNumber: n,
    parameters: {} as never,
    createdAt: '2026-01-01T00:00:00.000Z',
  } as ScenarioVersion;
}

function stats(median: number) {
  return { median, p10: median - 100, p90: median + 100 };
}

const versions = [ver('v1', 1), ver('v2', 2)];

const kpiMatrix: KpiMatrixRow[] = [
  {
    kpiId: 'arr',
    label: 'ARR',
    unit: '€',
    direction: 'HIGHER_IS_BETTER',
    baselineValue: 411840,
    valuesByVersionId: { v1: stats(400000), v2: stats(420000) },
    deltasAgainstRef: { v2: 20000 },
    percentAgainstRef: { v2: 5 },
    isFavorableAgainstRef: { v2: true },
  },
  {
    kpiId: 'churn',
    label: 'Churn',
    unit: '%',
    direction: 'LOWER_IS_BETTER',
    baselineValue: 2.8,
    valuesByVersionId: { v1: stats(2.5) },
    deltasAgainstRef: {},
    percentAgainstRef: {},
    isFavorableAgainstRef: {},
  },
  {
    kpiId: 'mrr',
    label: 'MRR',
    unit: '€',
    direction: 'HIGHER_IS_BETTER',
    baselineValue: 34320,
    valuesByVersionId: { v1: stats(34000), v2: stats(33000) },
    deltasAgainstRef: { v2: -1000 },
    percentAgainstRef: { v2: -2.9 },
    isFavorableAgainstRef: { v2: false },
  },
  {
    kpiId: 'deals',
    label: 'Deals',
    unit: 'Anzahl',
    direction: 'HIGHER_IS_BETTER',
    baselineValue: 47,
    valuesByVersionId: { v1: stats(48), v2: stats(50) },
    deltasAgainstRef: {},
    percentAgainstRef: {},
    isFavorableAgainstRef: {},
  },
  {
    kpiId: 'marge',
    label: 'Marge',
    unit: '%',
    direction: 'HIGHER_IS_BETTER',
    baselineValue: 10,
    valuesByVersionId: { v1: stats(11), v2: stats(12) },
    deltasAgainstRef: { v2: 0 },
    percentAgainstRef: { v2: 0 },
    isFavorableAgainstRef: { v2: true },
  },
];

const comparisonResult: MultiVersionComparisonResult = {
  referenceVersionId: 'v1',
  versions,
  parameterMatrix: [],
  kpiMatrix,
  tradeOffs: [],
  keyDifferences: [],
  comparisonWarnings: [],
  summaryText: 'x',
};

function renderTable(refId = 'v1') {
  return render(
    <MultiScenarioKpiTable comparisonResult={comparisonResult} effectiveRefId={refId} />,
  );
}

describe('MultiScenarioKpiTable (branch3)', () => {
  it('Kopf markiert die Referenzversion und die Baseline', () => {
    renderTable();
    expect(
      screen.getByText('KPI-Ergebnismatrix (P50 Median & Deltas zur Referenz)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Metrik (KPI)')).toBeInTheDocument();
    expect(screen.getByText('Baseline 2026')).toBeInTheDocument();
    expect(screen.getByText('v1 (Ref)')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('411.840 €')).toBeInTheDocument();
  });

  it('Referenzwerte stehen fett ohne Delta-Zeile', () => {
    const { container } = renderTable();
    expect(screen.getByText('400.000 €')).toBeInTheDocument();
    expect(screen.getByText('400.000 €').className).toContain('font-bold');
    expect(screen.getByText('420.000 €').className).toContain('font-normal');
    expect(container.querySelectorAll('.text-success, .text-accent')).toHaveLength(3);
  });

  it('günstiges Delta trägt Erfolgsfarbe mit Vorzeichen', () => {
    renderTable();
    expect(screen.getByText(/\+20\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\(\+5%\)/)).toBeInTheDocument();
  });

  it('ungünstiges Delta trägt Kontrastfarbe ohne Plus bei Minus', () => {
    renderTable();
    expect(screen.getByText(/-1\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\(-2\.9%\)/)).toBeInTheDocument();
  });

  it('fehlende Runs zeigen den Platzhalter', () => {
    renderTable();
    expect(screen.getByText('– (keine Runs)')).toBeInTheDocument();
  });

  it('Null-Delta und Null-Prozent rendern mit Plus und Nullklammer', () => {
    renderTable();
    expect(screen.getByText(/\+0/)).toBeInTheDocument();
    expect(screen.getByText(/\(0%\)/)).toBeInTheDocument();
    expect(screen.getByText('50 Anzahl')).toBeInTheDocument();
  });
});
