// Viewer strikt lesend (Entscheid Marc Poenisch, 25.09.2026; Revision G49):
// Viewer sehen Runs und Audit, aber keine Start-/Re-Run-/Reproduce-Knöpfe,
// sondern den Hinweis „nur Lesezugriff“. Admin und Manager starten mit Rolle.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTierView } from '../AuditTierView';
import { ManagementTierView } from '../ManagementTierView';
import { RunActionModal } from '../RunActionModal';
import { useOrganization } from '@/auth/organizationContext';
import { useSimulationStore } from '@/store/simulationStore';
import type { OrganizationRole } from '@/types/organization';
import type { SimulationRun } from '@/types/scenario';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
const mockedOrg = vi.mocked(useOrganization);

function asRole(role: OrganizationRole) {
  mockedOrg.mockReturnValue({
    session: { userId: 'u-1', organizationId: 'org-a', role },
    isLoading: false,
  });
}

const run = {
  runId: 'run-perm-1',
  scenarioId: 'sc-1',
  scenarioVersionId: 'v-1',
  seed: 42,
  status: 'COMPLETED',
  startedAt: new Date().toISOString(),
  baselineVersion: 'baseline-2026',
  manifest: {
    runId: 'run-perm-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    baselineVersion: 'baseline-2026',
    baselineId: 'b1',
    baselineHash: 'h1',
    organizationId: 'org-a',
    dataSourceId: 'simulated-crm',
    createdAt: new Date().toISOString(),
    targetTicks: 30,
    parameters: {},
    correlationId: 'corr-1',
  },
  finalMetrics: { liveARR: 450000 },
  correlationId: 'corr-1',
} as unknown as SimulationRun;

const initial = useSimulationStore.getState();
const runVersion = vi.fn().mockResolvedValue(undefined);
const reRun = vi.fn().mockResolvedValue(undefined);
const reproduce = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useSimulationStore.setState({ runs: [run], runVersion, reRun, reproduce });
});

afterEach(() => {
  useSimulationStore.setState(initial, true);
});

const managementProps = () => ({
  onOpenScenarioModal: vi.fn(),
  onOpenRunModal: vi.fn(),
  onOpenMeasureModal: vi.fn(),
});

describe('Run-Start je Rolle', () => {
  it('Viewer: kein „Run / Re-Run“, stattdessen Hinweis; Maßnahmen bleiben erreichbar', () => {
    asRole('viewer');
    render(<ManagementTierView {...managementProps()} />);
    expect(screen.queryByRole('button', { name: /Run \/ Re-Run/ })).toBeNull();
    expect(screen.getByText('Runs: nur Lesezugriff')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maßnahmen/ })).toBeInTheDocument();
  });

  it.each<OrganizationRole>(['admin', 'manager'])(
    '%s: „Run / Re-Run“ öffnet das Modal',
    async (role) => {
      asRole(role);
      const props = managementProps();
      render(<ManagementTierView {...props} />);
      expect(screen.queryByText('Runs: nur Lesezugriff')).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: /Run \/ Re-Run/ }));
      expect(props.onOpenRunModal).toHaveBeenCalledTimes(1);
    },
  );

  it('Viewer: Audit-Ansicht zeigt Runs und Audit, aber kein Re-Run/Reproduce', async () => {
    asRole('viewer');
    render(<AuditTierView />);
    expect(screen.getByText('run-perm-1')).toBeInTheDocument();
    expect(screen.getByText('(nur Lesezugriff)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Re-Run' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reproduce' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Audit' }));
    expect(screen.queryByRole('button', { name: /exakt Reproduzieren/ })).toBeNull();
  });

  it('Manager: Re-Run und Reproduce tragen die Rolle bis in den Store', async () => {
    asRole('manager');
    render(<AuditTierView />);
    expect(screen.queryByText('(nur Lesezugriff)')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Re-Run' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reproduce' }));
    expect(reRun).toHaveBeenCalledWith('v-1', 'manager');
    expect(reproduce).toHaveBeenCalledWith('run-perm-1', 'manager');
  });

  it('Viewer: Run-Modal bietet keine Start-Aktionen an', () => {
    asRole('viewer');
    render(<RunActionModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Neuen Run Starten' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Re-Run Ausführen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reproduzieren' })).toBeNull();
    expect(screen.getByText(/nur Lesezugriff/)).toBeInTheDocument();
  });

  it('Admin: „Neuen Run Starten“ übergibt Organisation und Rolle', async () => {
    asRole('admin');
    render(<RunActionModal isOpen onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Neuen Run Starten' }));
    expect(runVersion).toHaveBeenCalledWith(expect.any(String), 'org-a', 'admin');
  });
});
