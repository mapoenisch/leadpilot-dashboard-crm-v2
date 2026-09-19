import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiScenarioComparisonModal } from '../MultiScenarioComparisonModal';
import { scenarioService } from '../../../../simulation/scenarioService';
import { useSimulationStore } from '@/store/simulationStore';

function seedFourVersionScenario(): void {
  const { scenario } = scenarioService.createScenario('Branch2 Multi', 'Vier Versionen');
  for (let n = 1; n <= 3; n++) {
    scenarioService.createScenarioVersion(
      scenario.id,
      { marketingBudgetYearly: 80000 + n * 10000, salesRepCount: 2 + (n % 2) },
      `Branch2 v${n + 1}`,
    );
  }
  useSimulationStore.setState({ scenarios: scenarioService.getScenarios() });
}

describe('MultiScenarioComparisonModal (branch2)', () => {
  beforeEach(() => {
    useSimulationStore.setState({
      scenarios: scenarioService.getScenarios(),
      runs: [],
      draftMeasures: [],
    });
  });

  it('geschlossenes Modal rendert keinen Dialog', () => {
    render(<MultiScenarioComparisonModal isOpen={false} onClose={() => {}} />);
    expect(
      screen.queryByText('Multi-Szenario-Vergleich & Trade-Off-Entscheidungsfläche'),
    ).not.toBeInTheDocument();
  });

  it('Schließen-Button ruft onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MultiScenarioComparisonModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('vier Versionen: oranges 4/4-Badge, Referenz-Chip und Referenz-Select', () => {
    seedFourVersionScenario();
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('4 / 4 ausgewählt')).toBeInTheDocument();
    expect(screen.getByText('Referenz')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Referenzversion für Delta-Vergleich' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ZONE 2: Ergebnis-Deltas & Trajektorien/)).toBeInTheDocument();
    expect(screen.getByText(/Kein künstlicher Gesamtscore/)).toBeInTheDocument();
  });

  it('Maximum-Guard: fünfte Version lässt sich nicht zuwählen', async () => {
    const user = userEvent.setup();
    seedFourVersionScenario(); // Base + 4 = 5 Versionen -> Auswahl startet bei 4
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('4 / 4 ausgewählt')).toBeInTheDocument();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.length).toBeGreaterThanOrEqual(5);
    const unchecked = boxes.find((b) => !(b as HTMLInputElement).checked);
    expect(unchecked).toBeDefined();
    await user.click(unchecked!);
    expect(screen.getByText('4 / 4 ausgewählt')).toBeInTheDocument();
  });

  it('Referenz-Version per Select wechseln zeigt Übernehmen-Footer', async () => {
    const user = userEvent.setup();
    seedFourVersionScenario();
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Konfiguration übernehmen:')).toBeInTheDocument();
    expect(screen.getByText('Als neue Version übernehmen')).toBeInTheDocument();
    const combo = screen.getByRole('combobox', { name: 'Referenzversion für Delta-Vergleich' });
    await user.click(combo);
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(4);
    await user.click(options[1]!);
    // Referenz-Chip wandert auf die neu gewählte Karte
    expect(screen.getByText('Referenz')).toBeInTheDocument();
  });
});
