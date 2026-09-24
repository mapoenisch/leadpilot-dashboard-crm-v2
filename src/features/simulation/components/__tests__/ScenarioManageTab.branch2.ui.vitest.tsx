import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioManageTab } from '../ScenarioManageTab';
import type { Scenario, ScenarioParameters, ScenarioVersion } from '../../../../types/scenario';

const baseParams: ScenarioParameters = {
  marketingBudgetYearly: 65000,
  channelMix: { linkedIn: 20, seo: 20, partner: 20, webinar: 20, outbound: 20 },
  trialToPaidConversion: 18,
  salesRepCount: 2,
  csRepCount: 2,
  churnRateMonthly: 2.8,
  salesCycleDays: 38,
  targetPackageFocus: 'Balanced',
  winProbabilityMultiplier: 1,
  discountPercent: 12,
};

const scenario: Scenario = {
  id: 'sc-1',
  name: 'Wachstum 2026',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentVersionId: 'v-1',
  isProtected: false,
};

function version(id: string, n: number, desc?: string, params?: Partial<ScenarioParameters>) {
  return {
    id,
    scenarioId: 'sc-1',
    versionNumber: n,
    parameters: { ...baseParams, ...params },
    createdAt: new Date().toISOString(),
    description: desc ?? `Beschreibung v${n}`,
  } as ScenarioVersion;
}

function props(over: Record<string, unknown> = {}) {
  return {
    scenarios: [scenario],
    activeScenario: scenario,
    activeVersion: version('v-1', 1),
    versions: [version('v-1', 1), version('v-2', 2)],
    onSelectScenario: vi.fn(),
    onSelectVersion: vi.fn(),
    onOpenDiff: vi.fn(),
    createNewVersion: vi.fn(),
    ...over,
  };
}

describe('ScenarioManageTab (branch2)', () => {
  it('Erfolgs-Submit schließt Formular, öffnet Diff und leert Beschreibung', async () => {
    const user = userEvent.setup();
    const p = props();
    p.createNewVersion.mockReturnValue(version('v-3', 3));
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: /Neue Version \(v3\) aus Parameter-Set/ }));
    await user.type(
      screen.getByPlaceholderText('z. B. Erhöhte Marketing-Ausgaben Q3'),
      'Mehr Budget',
    );
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(p.createNewVersion).toHaveBeenCalledWith('sc-1', expect.anything(), 'Mehr Budget');
    expect(p.onOpenDiff).toHaveBeenCalledWith('v-3');
    expect(screen.queryByText('Neue Version (v3) konfigurieren')).not.toBeInTheDocument();
  });

  it('oberer Abbrechen-Button im Formular-Header schließt ebenfalls', async () => {
    const user = userEvent.setup();
    render(<ScenarioManageTab {...props()} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    expect(screen.getByText('Neue Version (v3) konfigurieren')).toBeInTheDocument();
    const cancelBtns = screen.getAllByRole('button', { name: 'Abbrechen' });
    expect(cancelBtns).toHaveLength(2);
    await user.click(cancelBtns[0]!);
    expect(screen.queryByText('Neue Version (v3) konfigurieren')).not.toBeInTheDocument();
  });

  it('geschütztes Szenario erscheint mit Schutz-Hinweis in der Auswahl', async () => {
    const user = userEvent.setup();
    const prot: Scenario = { ...scenario, id: 'sc-base', name: 'Base 2026', isProtected: true };
    render(<ScenarioManageTab {...props({ scenarios: [scenario, prot] })} />);
    await user.click(screen.getByRole('combobox', { name: 'Szenario wechseln' }));
    expect(screen.getByRole('option', { name: /Geschützt - Base 2026/ })).toBeInTheDocument();
  });

  it('fehlende Parameter fallen auf Defaults zurück, fehlende Beschreibung ebenso', () => {
    const sparse = {
      id: 'v-9',
      scenarioId: 'sc-1',
      versionNumber: 9,
      parameters: {},
      createdAt: new Date().toISOString(),
      description: '',
    } as unknown as ScenarioVersion;
    render(<ScenarioManageTab {...props({ versions: [sparse], activeVersion: sparse })} />);
    expect(screen.getByText('Keine Beschreibung angegeben.')).toBeInTheDocument();
    expect(screen.getByText('65.000 €')).toBeInTheDocument();
  });

  it('Stepper-Startwerte stammen aus der aktiven Version', async () => {
    const user = userEvent.setup();
    const active = version('v-1', 1, 'Aktiv', { marketingBudgetYearly: 90000, salesRepCount: 3 });
    render(<ScenarioManageTab {...props({ activeVersion: active })} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    expect(screen.getByLabelText('Marketing-Budget (€/Jahr)')).toHaveValue(90000);
    expect(screen.getByLabelText('Sales Reps (Headcount)')).toHaveValue(3);
  });
});
