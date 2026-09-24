import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioDiffTab } from '../ScenarioDiffTab';
import { scenarioService } from '../../../../simulation/scenarioService';
import type { ScenarioVersion } from '../../../../types/scenario';

function setupScenario() {
  const { scenario } = scenarioService.createScenario('Branch Diff Szenario', 'Branch-Test');
  const v1 = scenarioService.getVersionsForScenario(scenario.id)[0]!;
  const v2 = scenarioService.createScenarioVersion(
    scenario.id,
    { marketingBudgetYearly: 120000, salesRepCount: 4 },
    'Höheres Budget',
  );
  const v3 = scenarioService.createScenarioVersion(
    scenario.id,
    { targetPackageFocus: 'Growth' },
    'Anderer Fokus',
  );
  const versions = scenarioService.getVersionsForScenario(scenario.id);
  return { scenario, v1, v2, v3, versions };
}

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

describe('ScenarioDiffTab (branch)', () => {
  it('ungültige IDs: Fehlerzweig liefert Null-Vergleich ohne Crash', () => {
    render(
      <ScenarioDiffTab
        versions={[]}
        activeVersion={null}
        diffVersionIdA="gibts-nicht-a"
        diffVersionIdB="gibts-nicht-b"
        setDiffVersionIdA={() => {}}
        setDiffVersionIdB={() => {}}
      />,
    );
    expect(
      screen.getByText('Keine Parameterunterschiede zwischen Version A und Version B.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('changed-params-bar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Management-Erklärung/)).not.toBeInTheDocument();
  });

  it('echter Vergleich: Changed-Bar, Summary und KPI-Tabelle mit ausstehenden Simulationen', () => {
    const { versions, v1, v2 } = setupScenario();
    render(<Harness versions={versions} activeVersion={v2} initialA={v1.id} initialB={v2.id} />);
    const bar = screen.getByTestId('changed-params-bar');
    expect(bar.textContent).toMatch(/geänderte/);
    expect(screen.getByText(/Management-Erklärung/)).toBeInTheDocument();
    // frische Versionen ohne Runs -> Simulation-ausstehend-Zweige
    expect(screen.getAllByText('Simulation ausstehend').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/– \(Simulation ausstehend\)/).length).toBeGreaterThan(0);
  });

  it('identische Version (A=B): keine Unterschiede, Unverändert-Badges', () => {
    const { versions, v1 } = setupScenario();
    render(<Harness versions={versions} activeVersion={v1} initialA={v1.id} initialB={v1.id} />);
    expect(
      screen.getByText('Keine Parameterunterschiede zwischen Version A und Version B.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Unverändert').length).toBeGreaterThan(0);
  });

  it('nicht-numerisches Delta (Paket-Fokus) zeigt Geändert-Badge', () => {
    const { versions, v1, v3 } = setupScenario();
    render(<Harness versions={versions} activeVersion={v3} initialA={v1.id} initialB={v3.id} />);
    expect(screen.getAllByText('Geändert').length).toBeGreaterThan(0);
  });

  it('Filter "Nur geänderte" reduziert Zeilen bei echtem Vergleich', async () => {
    const user = userEvent.setup();
    const { versions, v1, v2 } = setupScenario();
    render(<Harness versions={versions} activeVersion={v2} initialA={v1.id} initialB={v2.id} />);
    expect(screen.getByTestId('changed-params-bar')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: /Nur geänderte Parameter/ });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    // nach Filter keine Unverändert-Badges mehr in der Parameter-Tabelle
    expect(screen.queryByText('Unverändert')).not.toBeInTheDocument();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('Select-Interaktion wechselt Referenz-Version per Combobox', async () => {
    const user = userEvent.setup();
    const { versions, v1, v2 } = setupScenario();
    render(<Harness versions={versions} activeVersion={v2} initialA={v1.id} initialB={v2.id} />);
    const combo = screen.getByRole('combobox', { name: 'Referenz-Version (Version A)' });
    await user.click(combo);
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    // wähle v2 als neue Referenz
    const target = options.find((o) => o.textContent?.includes(`v${v2.versionNumber}`));
    expect(target).toBeDefined();
    await user.click(target!);
    // Vergleichsvariante B bleibt v2 -> identisch -> keine Unterschiede
    expect(
      screen.getByText('Keine Parameterunterschiede zwischen Version A und Version B.'),
    ).toBeInTheDocument();
  });

  it('Tauschen-Button kehrt Vergleich um (negatives statt positives Delta)', async () => {
    const user = userEvent.setup();
    const setA = vi.fn();
    const setB = vi.fn();
    const { versions, v1, v2 } = setupScenario();
    render(
      <ScenarioDiffTab
        versions={versions}
        activeVersion={v2}
        diffVersionIdA={v1.id}
        diffVersionIdB={v2.id}
        setDiffVersionIdA={setA}
        setDiffVersionIdB={setB}
      />,
    );
    expect(screen.getByTestId('changed-params-bar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tauschen/ }));
    expect(setA).toHaveBeenCalledWith(v2.id);
    expect(setB).toHaveBeenCalledWith(v1.id);
  });
});
