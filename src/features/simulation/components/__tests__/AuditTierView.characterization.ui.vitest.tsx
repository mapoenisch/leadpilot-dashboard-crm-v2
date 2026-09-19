import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTierView } from '../AuditTierView';
import { useSimulationStore } from '@/store/simulationStore';
import type { SimulationRun } from '../../../../types/scenario';

function auditRun(runId: string): SimulationRun {
  return {
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    rngState: 42,
    modelVersion: 'sim-v1',
    schemaVersion: 'schema-3',
    baselineVersion: 'baseline-2026',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    manifest: {
      runId,
      scenarioId: 'sc-1',
      scenarioVersionId: 'v-1',
      seed: 42,
      initialRngState: 42,
      modelVersion: 'sim-v1',
      schemaVersion: 'schema-3',
      baselineVersion: 'baseline-2026',
      baselineId: 'b1',
      baselineHash: 'h1',
      organizationId: 'org-1',
      dataSourceId: 'simulated-crm',
      createdAt: new Date().toISOString(),
      simulationStartDate: '2026-01-01',
      targetTicks: 30,
      parameters: {},
      correlationId: 'corr-1',
    },
    finalMetrics: { liveARR: 450000 },
    correlationId: 'corr-1',
  } as unknown as SimulationRun;
}

describe('AuditTierView (characterization)', () => {
  beforeEach(() => {
    useSimulationStore.setState({ runs: [] });
  });

  it('leerer Stand: Header, Zähler und Tabellenspalten', () => {
    render(<AuditTierView />);
    expect(screen.getByText('Technik & Audit-Ebene: Technische Run-Historie')).toBeInTheDocument();
    expect(screen.getByText('Gesamtläufe: 0')).toBeInTheDocument();
    expect(screen.getByText('Run-ID')).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Ergebnis ARR')).toBeInTheDocument();
  });

  it('gesetzter Run erscheint als Tabellenzeile mit Aktionen', () => {
    useSimulationStore.setState({ runs: [auditRun('run-audit-1')] });
    render(<AuditTierView />);
    expect(screen.getByText('Gesamtläufe: 1')).toBeInTheDocument();
    expect(screen.getByText('run-audit-1')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-Run' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reproduce' })).toBeInTheDocument();
  });

  it('Audit-Button öffnet Manifest-Modal mit Tab-Wechsel', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({ runs: [auditRun('run-audit-2')] });
    render(<AuditTierView />);
    await user.click(screen.getByRole('button', { name: 'Audit' }));
    expect(screen.getByRole('dialog', { name: 'Audit-Details: run-audit-2' })).toBeInTheDocument();
    expect(screen.getByText('Model Version:')).toBeInTheDocument();
    expect(screen.getByText('sim-v1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Snapshot Integrität & State' }));
    expect(screen.getByRole('button', { name: 'RunManifest & Parameter' })).toBeInTheDocument();
  });
});
