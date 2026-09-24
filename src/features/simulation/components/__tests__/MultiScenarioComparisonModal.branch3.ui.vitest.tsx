import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiScenarioComparisonModal } from '../MultiScenarioComparisonModal';
import type { ScenarioVersion, MultiVersionComparisonResult } from '@/types/scenario';

const mockState = vi.hoisted(() => ({
  scenarios: [] as { id: string; name: string }[],
  versionsByScenario: {} as Record<string, ScenarioVersion[]>,
  compareImpl: null as null | (() => MultiVersionComparisonResult),
  adoptImpl: null as null | ((targetId: string, scenarioId: string) => { versionNumber: number }),
  adoptCalls: 0,
}));

vi.mock('@/store/hooks', () => ({
  useScenarios: () => mockState.scenarios,
  useActiveScenario: () => (mockState.scenarios[0] ? { id: mockState.scenarios[0]!.id } : null),
  useActiveVersion: () => null,
  useScenarioActions: () => ({
    compareMultipleVersions: () => mockState.compareImpl!(),
    adoptConfiguration: (targetId: string, scenarioId: string) => {
      mockState.adoptCalls += 1;
      return mockState.adoptImpl!(targetId, scenarioId);
    },
  }),
}));

vi.mock('@/simulation/scenarioService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/simulation/scenarioService')>();
  return {
    ...actual,
    scenarioService: {
      ...actual.scenarioService,
      getVersionsForScenario: (id: string) => mockState.versionsByScenario[id] ?? [],
    },
  };
});

function ver(scenarioId: string, id: string, n: number): ScenarioVersion {
  return {
    id,
    scenarioId,
    versionNumber: n,
    parameters: { marketingBudgetYearly: 60000 + n * 5000, salesRepCount: 2 } as never,
    createdAt: '2026-01-01T00:00:00.000Z',
  } as ScenarioVersion;
}

function stats(median: number) {
  return { median, p10: median - 1000, p90: median + 1000 };
}

function resultWith(over: Partial<MultiVersionComparisonResult>): MultiVersionComparisonResult {
  const v1 = ver('sA', 'v1', 1);
  const v2 = ver('sA', 'v2', 2);
  return {
    referenceVersionId: 'v1',
    versions: [v1, v2],
    parameterMatrix: [],
    kpiMatrix: [
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
    ],
    tradeOffs: [],
    keyDifferences: [],
    comparisonWarnings: ['Vergleichsbasis weicht ab (Entscheidung 854)'],
    summaryText: 'V2 liegt vor V1',
    ...over,
  };
}

function seedTwo() {
  mockState.scenarios = [{ id: 'sA', name: 'Szenario A' }];
  mockState.versionsByScenario = { sA: [ver('sA', 'v1', 1), ver('sA', 'v2', 2)] };
}

describe('MultiScenarioComparisonModal (branch3)', () => {
  beforeEach(() => {
    mockState.scenarios = [];
    mockState.versionsByScenario = {};
    mockState.compareImpl = null;
    mockState.adoptImpl = null;
    mockState.adoptCalls = 0;
  });

  it('ohne Versionen: Warnung, leerer Übernehmen-Select blockt die Übernahme', async () => {
    const user = userEvent.setup();
    mockState.adoptImpl = () => ({ versionNumber: 9 });
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Zu wenige Versionen ausgewählt')).toBeInTheDocument();
    expect(screen.getByText('Konfiguration übernehmen:')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Als neue Version übernehmen' }));
    expect(mockState.adoptCalls).toBe(0);
    expect(screen.queryByText('Konfigurations-Übernahme')).not.toBeInTheDocument();
  });

  it('zwei Versionen: Summary, Warnung und fehlende Runs in der Matrix', () => {
    seedTwo();
    mockState.compareImpl = () => resultWith({});
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('2 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.getByText('V2 liegt vor V1')).toBeInTheDocument();
    expect(screen.getByText('Vergleichsbasis weicht ab (Entscheidung 854)')).toBeInTheDocument();
    expect(screen.getByText('– (keine Runs)')).toBeInTheDocument();
    expect(screen.getByText('Referenz')).toBeInTheDocument();
    expect(
      screen.getByText('ARR-Trajektorienvergleich der ausgewählten Versionen (€)'),
    ).toBeInTheDocument();
  });

  it('fehlgeschlagener Vergleich blendet Zone 2 trotz Auswahl aus', () => {
    seedTwo();
    mockState.compareImpl = () => {
      throw new Error('kaputt');
    };
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('2 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.queryByText(/ZONE 2:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Zu wenige Versionen ausgewählt')).not.toBeInTheDocument();
  });

  it('Übernahme zeigt Erfolg und danach Fehlertexte', async () => {
    const user = userEvent.setup();
    seedTwo();
    mockState.compareImpl = () => resultWith({ comparisonWarnings: [] });
    mockState.adoptImpl = () => ({ versionNumber: 5 });
    const { unmount } = render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Als neue Version übernehmen' }));
    expect(screen.getByText('Konfigurations-Übernahme')).toBeInTheDocument();
    expect(screen.getByText(/erfolgreich als neue Arbeitsversion \(v5\)/)).toBeInTheDocument();
    unmount();

    mockState.adoptImpl = () => {
      throw new Error('Blockiert');
    };
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Als neue Version übernehmen' }));
    expect(screen.getByText(/Fehler bei der Übernahme: Blockiert/)).toBeInTheDocument();
  });

  it('vier Versionen: oranges Badge und versetzbare Referenz', async () => {
    const user = userEvent.setup();
    mockState.scenarios = [{ id: 'sA', name: 'Szenario A' }];
    mockState.versionsByScenario = {
      sA: [ver('sA', 'v1', 1), ver('sA', 'v2', 2), ver('sA', 'v3', 3), ver('sA', 'v4', 4)],
    };
    mockState.compareImpl = () =>
      resultWith({
        versions: mockState.versionsByScenario['sA']!,
        comparisonWarnings: [],
      });
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('4 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.getAllByText('Referenz')).toHaveLength(1);
    const combo = screen.getByRole('combobox', { name: 'Referenzversion für Delta-Vergleich' });
    await user.click(combo);
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(4);
    await user.click(options[2]!);
    expect(screen.getAllByText('Referenz')).toHaveLength(1);
  });

  it('ohne ARR-Zeile nutzt die Trajektorie den Basis-Fallback', () => {
    seedTwo();
    mockState.compareImpl = () =>
      resultWith({
        kpiMatrix: [
          {
            kpiId: 'churn',
            label: 'Churn',
            unit: '%',
            direction: 'LOWER_IS_BETTER',
            baselineValue: 2.8,
            valuesByVersionId: { v1: stats(2.5), v2: stats(2.1) },
            deltasAgainstRef: { v2: -0.4 },
            percentAgainstRef: { v2: -16 },
            isFavorableAgainstRef: { v2: true },
          },
        ],
        comparisonWarnings: [],
      });
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(
      screen.getByText('ARR-Trajektorienvergleich der ausgewählten Versionen (€)'),
    ).toBeInTheDocument();
    expect(screen.getByText('V2 liegt vor V1')).toBeInTheDocument();
  });
});
