import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioDiffTab } from '../ScenarioDiffTab';
import type { ScenarioParameters, ScenarioVersion } from '../../../../types/scenario';

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

function version(id: string, n: number, salesRepCount: number): ScenarioVersion {
  return {
    id,
    scenarioId: 'sc-1',
    versionNumber: n,
    parameters: { ...baseParams, salesRepCount },
    createdAt: new Date().toISOString(),
    description: `Version ${n}`,
  };
}

describe('ScenarioDiffTab (characterization)', () => {
  it('ohne Vergleichs-IDs: Selektoren plus Leerstands-Hinweis', () => {
    render(
      <ScenarioDiffTab
        versions={[]}
        activeVersion={null}
        diffVersionIdA=""
        diffVersionIdB=""
        setDiffVersionIdA={() => {}}
        setDiffVersionIdB={() => {}}
      />,
    );
    expect(screen.getByText('Referenz-Version (Version A)')).toBeInTheDocument();
    expect(screen.getByText('Vergleichs-Version (Version B)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tauschen/ })).toBeInTheDocument();
    expect(
      screen.getByText('Keine Parameterunterschiede zwischen Version A und Version B.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/KPI-Auswirkung & Zielerreichung/)).toBeInTheDocument();
  });

  it('Tauschen-Button ruft Setter mit vertauschten IDs auf', async () => {
    const user = userEvent.setup();
    const setA = vi.fn();
    const setB = vi.fn();
    render(
      <ScenarioDiffTab
        versions={[version('va', 1, 2), version('vb', 2, 4)]}
        activeVersion={version('vb', 2, 4)}
        diffVersionIdA="va"
        diffVersionIdB="vb"
        setDiffVersionIdA={setA}
        setDiffVersionIdB={setB}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Tauschen/ }));
    expect(setA).toHaveBeenCalledWith('vb');
    expect(setB).toHaveBeenCalledWith('va');
  });

  it('Filter-Checkbox "Nur geänderte" ist umschaltbar', async () => {
    const user = userEvent.setup();
    render(
      <ScenarioDiffTab
        versions={[version('va', 1, 2), version('vb', 2, 4)]}
        activeVersion={version('vb', 2, 4)}
        diffVersionIdA=""
        diffVersionIdB=""
        setDiffVersionIdA={() => {}}
        setDiffVersionIdB={() => {}}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: /Nur geänderte Parameter/ });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/Parameter-Gegenüberstellung/)).toBeInTheDocument();
  });
});
