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

function version(id: string, n: number): ScenarioVersion {
  return {
    id,
    scenarioId: 'sc-1',
    versionNumber: n,
    parameters: baseParams,
    createdAt: new Date().toISOString(),
    description: `Beschreibung v${n}`,
  };
}

function props() {
  return {
    scenarios: [scenario],
    activeScenario: scenario,
    activeVersion: version('v-1', 1),
    versions: [version('v-1', 1), version('v-2', 2)],
    onSelectScenario: vi.fn(),
    onSelectVersion: vi.fn(),
    onOpenDiff: vi.fn(),
    createNewVersion: vi.fn(),
  };
}

describe('ScenarioManageTab (characterization)', () => {
  it('Standard-Render: Selektor, Versionskarten und Aktionen', () => {
    render(<ScenarioManageTab {...props()} />);
    expect(screen.getByText('Szenario wechseln')).toBeInTheDocument();
    expect(screen.getByText('Vorhandene Szenario-Versionen:')).toBeInTheDocument();
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
    expect(screen.getByText('Beschreibung v1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aktivieren' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Diff/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Neue Version/ })).toBeInTheDocument();
  });

  it('Aktivieren-Button selektiert die inaktive Version', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: 'Aktivieren' }));
    expect(p.onSelectVersion).toHaveBeenCalledWith('v-2');
  });

  it('Neue-Version-Formular öffnet und bricht ab', async () => {
    const user = userEvent.setup();
    render(<ScenarioManageTab {...props()} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    expect(screen.getByText('Neue Version (v3) konfigurieren')).toBeInTheDocument();
    expect(screen.getByText('Marketing-Budget (€/Jahr)')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Abbrechen' })[0]!);
    expect(screen.queryByText('Neue Version (v3) konfigurieren')).not.toBeInTheDocument();
  });

  it('gültiges Formular legt Version an und öffnet Diff', async () => {
    const user = userEvent.setup();
    const p = props();
    const created = version('v-3', 3);
    p.createNewVersion.mockReturnValue(created);
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(p.createNewVersion).toHaveBeenCalledTimes(1);
    expect(p.onOpenDiff).toHaveBeenCalledWith('v-3');
  });
});
