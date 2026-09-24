import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiScenarioComparisonModal } from '../MultiScenarioComparisonModal';
import { scenarioService } from '../../../../simulation/scenarioService';
import { useSimulationStore } from '@/store/simulationStore';

// Hinweis: scenarioService ist ein file-weites Singleton — Seeds
// akkumulieren sich über die Tests (gewollt, deterministisch aufsteigend).
let branchScenarioId: string | null = null;

function seedBranchScenario(): void {
  const { scenario } = scenarioService.createScenario('Branch Multi Szenario', 'Branch-Test');
  branchScenarioId = scenario.id;
  useSimulationStore.setState({ scenarios: scenarioService.getScenarios() });
}

function addBranchVersion(): void {
  if (!branchScenarioId) throw new Error('kein Branch-Szenario');
  const n = scenarioService.getVersionsForScenario(branchScenarioId).length;
  scenarioService.createScenarioVersion(
    branchScenarioId,
    { marketingBudgetYearly: 90000 + n * 10000, salesRepCount: 2 + (n % 3) },
    `Branch v${n + 1}`,
  );
  useSimulationStore.setState({ scenarios: scenarioService.getScenarios() });
}

describe('MultiScenarioComparisonModal (branch)', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      scenarios: scenarioService.getScenarios(),
      runs: [],
      draftMeasures: [],
    });
  });

  it('nur Basis-Version: Warnung statt Ergebnis (unter-2-Zweig)', () => {
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Zu wenige Versionen ausgewählt')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Bitte wählen Sie mindestens 2 Versionen aus, um den Vergleich durchzuführen.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ZONE 2:/)).not.toBeInTheDocument();
  });

  it('zwei Versionen: Zone 2 rendert, Minimum-Guard blockt Abwahl', async () => {
    const user = userEvent.setup();
    seedBranchScenario(); // total: Basis + 1 = 2
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('2 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.getByText(/ZONE 2: Ergebnis-Deltas & Trajektorien/)).toBeInTheDocument();
    expect(
      screen.getByText('ARR-Trajektorienvergleich der ausgewählten Versionen (€)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ZONE 3: Begründung, Trade-Off-Profile & Treiber-Matrix/),
    ).toBeInTheDocument();
    // Minimum-Guard: Abwahl bei 2 wird ignoriert
    await user.click(screen.getAllByRole('checkbox')[0]!);
    expect(screen.getByText('2 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.queryByText('Zu wenige Versionen ausgewählt')).not.toBeInTheDocument();
  });

  it('Referenz-Version per Select wechseln (drei Versionen)', async () => {
    const user = userEvent.setup();
    addBranchVersion(); // total: 3
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('3 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.getAllByText('Referenz')).toHaveLength(1);
    const combo = screen.getByRole('combobox', { name: 'Referenzversion für Delta-Vergleich' });
    await user.click(combo);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    await user.click(options[options.length - 1]!);
    // genau ein Referenz-Chip, Vergleich rendert weiter
    expect(screen.getAllByText('Referenz')).toHaveLength(1);
    expect(screen.getByText(/ZONE 2: Ergebnis-Deltas & Trajektorien/)).toBeInTheDocument();
  });

  it('Abwählen einer von drei Versionen schrumpft Auswahl auf 2', async () => {
    const user = userEvent.setup();
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('3 / 4 ausgewählt')).toBeInTheDocument();
    await user.click(screen.getAllByRole('checkbox')[0]!);
    expect(screen.getByText('2 / 4 ausgewählt')).toBeInTheDocument();
  });

  it('Maximum-Guard: bei >4 Versionen bleibt Auswahl bei 4', async () => {
    const user = userEvent.setup();
    addBranchVersion();
    addBranchVersion();
    addBranchVersion(); // total: 6 -> initiale Auswahl erste 4
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('4 / 4 ausgewählt')).toBeInTheDocument();
    const unchecked = screen
      .getAllByRole('checkbox')
      .filter((b) => !(b as HTMLInputElement).checked);
    expect(unchecked.length).toBeGreaterThan(0);
    await user.click(unchecked[0]!);
    expect(screen.getByText('4 / 4 ausgewählt')).toBeInTheDocument();
  });

  it('Übernahme-Flow: übernehmen zeigt Erfolgsmeldung', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MultiScenarioComparisonModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Als neue Version übernehmen' }));
    expect(screen.getByText('Konfigurations-Übernahme')).toBeInTheDocument();
    expect(screen.getByText(/erfolgreich als neue Arbeitsversion/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
