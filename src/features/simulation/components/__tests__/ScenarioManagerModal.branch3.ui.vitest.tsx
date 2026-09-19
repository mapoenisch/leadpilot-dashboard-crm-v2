import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioManagerModal } from '../ScenarioManagerModal';
import { scenarioService } from '../../../../simulation/scenarioService';
import { useSimulationStore } from '@/store/simulationStore';
import { DEFAULT_BASE_2026_SCENARIO_ID } from '../../../../simulation/scenarioRepository';

function renderModal() {
  return render(<ScenarioManagerModal isOpen={true} onClose={() => {}} />);
}

describe('ScenarioManagerModal (branch3)', () => {
  it('Kopf zeigt Schutz-Chip, aktive Version und Einzahl-Form', () => {
    renderModal();
    expect(screen.getByText('LeadPilot Basis-Szenario 2026')).toBeInTheDocument();
    expect(screen.getByText('Geschützt (Base 2026)')).toBeInTheDocument();
    expect(screen.getByText('Aktive Version: v1')).toBeInTheDocument();
    expect(screen.getByText('(1 Version verfügbar)')).toBeInTheDocument();
  });

  it('ohne zweite Version kein Versions-Badge, Diff-Button öffnet Diff mit gesetzter Version', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.queryByText(/Versionen$/)).not.toBeInTheDocument();
    expect(screen.getByText('Szenario wechseln')).toBeInTheDocument();
    await user.click(screen.getAllByText('Diff ➔')[0]!);
    expect(screen.getByText('Referenz-Version (Version A)')).toBeInTheDocument();
    expect(screen.queryByText('Szenario wechseln')).not.toBeInTheDocument();
  });

  it('zweite Version schaltet auf Mehrzahl mit Badge', () => {
    useSimulationStore
      .getState()
      .createNewVersion(
        DEFAULT_BASE_2026_SCENARIO_ID,
        { marketingBudgetYearly: 70000 },
        'Branch3 v2',
      );
    renderModal();
    expect(screen.getByText('(2 Versionen verfügbar)')).toBeInTheDocument();
  });

  it('dritte Version erscheint im Diff-Badge nach Live-Aktualisierung', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('scenario-diff-tab'));
    expect(screen.getByText('2 Versionen')).toBeInTheDocument();
    useSimulationStore
      .getState()
      .createNewVersion(
        DEFAULT_BASE_2026_SCENARIO_ID,
        { marketingBudgetYearly: 80000 },
        'Branch3 v3',
      );
    expect(await screen.findByText('3 Versionen')).toBeInTheDocument();
  });

  it('namenloses Szenario nutzt den Fallback-Titel', () => {
    const { scenario } = scenarioService.createScenario('', 'ohne Namen');
    useSimulationStore.setState({ scenarios: scenarioService.getScenarios() });
    useSimulationStore.getState().selectScenario(scenario.id);
    renderModal();
    expect(screen.getByText('Unbenanntes Szenario')).toBeInTheDocument();
  });

  it('Vergleich ohne Vorauswahl öffnet den Diff-Tab', async () => {
    const user = userEvent.setup();
    useSimulationStore.getState().selectScenario(DEFAULT_BASE_2026_SCENARIO_ID);
    renderModal();
    expect(screen.getByText('Szenario wechseln')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Vergleich gegen andere Version öffnen ➔' }),
    );
    expect(screen.getByText('Referenz-Version (Version A)')).toBeInTheDocument();
  });
});
