import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioManageTab } from '../ScenarioManageTab';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../../../simulation/scenarioRepository';
import { parameterRegistry } from '../../../../simulation/parameterRegistry';
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

function version(id: string, n: number, desc?: string): ScenarioVersion {
  return {
    id,
    scenarioId: 'sc-1',
    versionNumber: n,
    parameters: baseParams,
    createdAt: new Date().toISOString(),
    description: desc ?? `Beschreibung v${n}`,
  };
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

describe('ScenarioManageTab (branch)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Validierungsfehler wird angezeigt und per Param-Änderung gelöscht', async () => {
    const user = userEvent.setup();
    vi.spyOn(parameterRegistry, 'validateAllParameters').mockReturnValue({
      valid: false,
      errors: ['Marketing-Budget zu hoch'],
      normalizedParams: {} as never,
    });
    const p = props();
    p.createNewVersion.mockReturnValue(version('v-3', 3));
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(screen.getByText('Validierungsfehler')).toBeInTheDocument();
    expect(screen.getByText(/Preflight-Validierung fehlgeschlagen/)).toBeInTheDocument();
    expect(p.createNewVersion).not.toHaveBeenCalled();
    // Param-Änderung (Stepper +) löscht den Fehler
    await user.click(screen.getAllByRole('button', { name: 'Wert erhöhen' })[0]!);
    expect(screen.queryByText('Validierungsfehler')).not.toBeInTheDocument();
  });

  it('werfendes createNewVersion zeigt Fehlermeldung (Error + Fallback)', async () => {
    const user = userEvent.setup();
    const p1 = props();
    p1.createNewVersion.mockImplementation(() => {
      throw new Error('Speicher voll');
    });
    const { unmount } = render(<ScenarioManageTab {...p1} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(screen.getByText('Speicher voll')).toBeInTheDocument();
    unmount();

    const p2 = props();
    p2.createNewVersion.mockImplementation(() => {
      throw 'kaputt';
    });
    render(<ScenarioManageTab {...p2} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(screen.getByText('Fehler beim Erstellen der Version.')).toBeInTheDocument();
  });

  it('ohne aktives Szenario ist Submit ein No-Op', async () => {
    const user = userEvent.setup();
    const p = props({ activeScenario: null });
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(p.createNewVersion).not.toHaveBeenCalled();
    expect(p.onOpenDiff).not.toHaveBeenCalled();
  });

  it('Base-Chip, fehlende Beschreibung und aktive Karte ohne Aktivieren-Button', () => {
    const base = { ...version(DEFAULT_BASE_2026_VERSION_ID, 1), description: '' };
    const other = version('v-2', 2);
    render(<ScenarioManageTab {...props({ versions: [base, other], activeVersion: base })} />);
    expect(screen.getByText('★ Base 2026')).toBeInTheDocument();
    expect(screen.getByText('Keine Beschreibung angegeben.')).toBeInTheDocument();
    // nur die inaktive Karte trägt Aktivieren-Button, Diff-Buttons für beide
    expect(screen.getAllByRole('button', { name: 'Aktivieren' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Diff/ })).toHaveLength(2);
  });

  it('Karten-Klick aktiviert Version, Diff-Button öffnet nur Diff (stopPropagation)', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByText('Beschreibung v2'));
    expect(p.onSelectVersion).toHaveBeenCalledWith('v-2');
    const callsBefore = p.onSelectVersion.mock.calls.length;
    await user.click(screen.getAllByRole('button', { name: /Diff/ })[1]!);
    expect(p.onOpenDiff).toHaveBeenCalledWith('v-2');
    expect(p.onSelectVersion.mock.calls.length).toBe(callsBefore);
  });

  it('Vergleichs-Button nur bei mehr als einer Version', async () => {
    const user = userEvent.setup();
    const single = props({ versions: [version('v-1', 1)] });
    const { unmount } = render(<ScenarioManageTab {...single} />);
    expect(
      screen.queryByRole('button', { name: /Vergleich gegen andere Version/ }),
    ).not.toBeInTheDocument();
    unmount();

    const p2 = props();
    render(<ScenarioManageTab {...p2} />);
    await user.click(screen.getByRole('button', { name: /Vergleich gegen andere Version öffnen/ }));
    expect(p2.onOpenDiff).toHaveBeenCalledWith();
  });

  it('Formular-Abbruch über unteren Abbrechen-Button; Beschreibungseingabe', async () => {
    const user = userEvent.setup();
    const p = props();
    p.createNewVersion.mockReturnValue(version('v-3', 3));
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    const input = screen.getByPlaceholderText('z. B. Erhöhte Marketing-Ausgaben Q3');
    await user.type(input, 'Mehr Budget');
    expect(input).toHaveValue('Mehr Budget');
    const cancelBtns = screen.getAllByRole('button', { name: 'Abbrechen' });
    expect(cancelBtns).toHaveLength(2);
    await user.click(cancelBtns[1]!);
    expect(screen.queryByText('Neue Version (v3) konfigurieren')).not.toBeInTheDocument();
  });

  it('Szenario-Wechsel per Combobox ruft onSelectScenario', async () => {
    const user = userEvent.setup();
    const other: Scenario = { ...scenario, id: 'sc-2', name: 'Kosten 2026' };
    const p = props({ scenarios: [scenario, other] });
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('combobox', { name: 'Szenario wechseln' }));
    const opt = screen.getByRole('option', { name: /Kosten 2026/ });
    await user.click(opt);
    expect(p.onSelectScenario).toHaveBeenCalledWith('sc-2');
  });

  it('Stepper- und Input-Änderungen fliessen in createNewVersion ein', async () => {
    const user = userEvent.setup();
    const p = props();
    p.createNewVersion.mockReturnValue(version('v-3', 3));
    render(<ScenarioManageTab {...p} />);
    await user.click(screen.getByRole('button', { name: /Neue Version/ }));
    const marketingInput = screen.getByLabelText('Marketing-Budget (€/Jahr)');
    fireEvent.change(marketingInput, { target: { value: '70000' } });
    await user.click(screen.getByRole('button', { name: 'Version v3 anlegen & speichern' }));
    expect(p.createNewVersion).toHaveBeenCalledTimes(1);
    const [, paramsArg] = p.createNewVersion.mock.calls[0] as [string, Record<string, unknown>];
    expect(paramsArg.marketingBudgetYearly).toBe(70000);
  });
});
