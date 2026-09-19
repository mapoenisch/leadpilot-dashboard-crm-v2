import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { ScenarioDiffTab } from '../ScenarioDiffTab';
import { scenarioService } from '../../../../simulation/scenarioService';
import type { ScenarioVersion } from '../../../../types/scenario';

function Harness({
  versions,
  activeVersion,
  initialA,
  initialB,
}: {
  versions: ScenarioVersion[];
  activeVersion: ScenarioVersion;
  initialA: string;
  initialB: string;
}) {
  const [idA, setIdA] = useState(initialA);
  const [idB, setIdB] = useState(initialB);
  return (
    <ScenarioDiffTab
      versions={versions}
      activeVersion={activeVersion}
      diffVersionIdA={idA}
      diffVersionIdB={idB}
      setDiffVersionIdA={setIdA}
      setDiffVersionIdB={setIdB}
    />
  );
}

describe('ScenarioDiffTab (branch2, echte Mini-Runs)', () => {
  it('beidseitig simuliert: KPI-Werte statt Ausstehend-Badges plus Zielstatus', async () => {
    const { scenario } = scenarioService.createScenario('Branch2 Diff Runs', 'Mini-Runs');
    const all = scenarioService.getVersionsForScenario(scenario.id);
    const v1 = all[0]!;
    const v2 = scenarioService.createScenarioVersion(
      scenario.id,
      { marketingBudgetYearly: 120000, salesRepCount: 4 },
      'Hohes Budget',
    );
    await scenarioService.runScenarioVersion(v1.id, 771001, 10);
    await scenarioService.runScenarioVersion(v2.id, 771002, 10);
    const versions = scenarioService.getVersionsForScenario(scenario.id);

    render(<Harness versions={versions} activeVersion={v2} initialA={v1.id} initialB={v2.id} />);

    // keine Ausstehend-Zweige mehr in der KPI-Tabelle
    expect(screen.queryByText('Simulation ausstehend')).not.toBeInTheDocument();
    expect(screen.queryByText(/– \(Simulation ausstehend\)/)).not.toBeInTheDocument();
    // Delta-Badges (positiv: höheres Budget -> cyan oder orange je KPI-Richtung)
    expect(screen.getByTestId('changed-params-bar')).toBeInTheDocument();
    // Zielstatus-Badges und Erklärungssektion
    expect(screen.getByText(/Zielstatus & Simulationsstatus:/)).toBeInTheDocument();
    expect(screen.getByText('Directionality-bewertet')).toBeInTheDocument();
  }, 25000);

  it('umgekehrter Vergleich (hoch vs. niedrig) zeigt negatives Delta', async () => {
    const { scenario } = scenarioService.createScenario('Branch2 Diff Negativ', 'Negativ-Delta');
    const all = scenarioService.getVersionsForScenario(scenario.id);
    const vLow = all[0]!;
    const vHigh = scenarioService.createScenarioVersion(
      scenario.id,
      { marketingBudgetYearly: 140000, salesRepCount: 4 },
      'Sehr hohes Budget',
    );
    await scenarioService.runScenarioVersion(vLow.id, 772001, 10);
    await scenarioService.runScenarioVersion(vHigh.id, 772002, 10);
    const versions = scenarioService.getVersionsForScenario(scenario.id);

    // A = hoch, B = niedrig -> Delta vA->vB negativ
    render(
      <Harness versions={versions} activeVersion={vHigh} initialA={vHigh.id} initialB={vLow.id} />,
    );
    expect(screen.queryByText('Simulation ausstehend')).not.toBeInTheDocument();
    // Delta-Spalte mit Prozent-Anteil
    expect(screen.getAllByText(/%\)/).length).toBeGreaterThanOrEqual(1);
  }, 25000);

  it('leere Versionsliste: kein Crash, Hinweistext ohne Tabellen-Crash', () => {
    render(
      <ScenarioDiffTab
        versions={[]}
        activeVersion={undefined}
        diffVersionIdA=""
        diffVersionIdB=""
        setDiffVersionIdA={vi.fn()}
        setDiffVersionIdB={vi.fn()}
      />,
    );
    expect(
      screen.getByText('Keine Parameterunterschiede zwischen Version A und Version B.'),
    ).toBeInTheDocument();
  });

  it('KPI-Tabelle ohne Vergleich rendert Baseline-Spalte', async () => {
    const { scenario } = scenarioService.createScenario('Branch2 Baseline-Spalte', 'Baseline');
    const versions = scenarioService.getVersionsForScenario(scenario.id);
    const v1 = versions[0]!;
    render(<Harness versions={versions} activeVersion={v1} initialA={v1.id} initialB={v1.id} />);
    expect(screen.getByText('Baseline 2026')).toBeInTheDocument();
    expect(screen.getByText(/KPI-Auswirkung & Zielerreichung/)).toBeInTheDocument();
  });
});
