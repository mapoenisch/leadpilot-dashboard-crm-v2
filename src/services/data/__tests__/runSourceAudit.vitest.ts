import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRunSourceAudit } from '../runSourceAudit';
import { BaselineSnapshotService } from '../baselineSnapshotService';
import { dataSourceRegistry } from '../index';
import { SimulationRun } from '@/types/scenario';

function createMockRun(baselineVersion: string, dataSourceId?: string): SimulationRun {
  return {
    id: 'run-test-1',
    scenarioId: 'scen-1',
    scenarioVersionId: 'ver-1',
    runNumber: 1,
    seed: 12345,
    status: 'COMPLETED',
    startedAt: '2026-09-01T10:00:00Z',
    completedAt: '2026-09-01T10:01:00Z',
    manifest: {
      modelVersion: '1.0.0',
      schemaVersion: '1.0.0',
      baselineVersion,
      dataSourceId: dataSourceId || '',
      seed: 12345,
      intervalMs: 12000,
    },
    ticks: [],
  };
}

describe('runSourceAudit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    BaselineSnapshotService.clear();
  });

  it('löst Audit für eingefrorene BaselineSnapshotService-Version auf', () => {
    vi.spyOn(BaselineSnapshotService, 'has').mockReturnValue(true);
    vi.spyOn(BaselineSnapshotService, 'get').mockReturnValue({
      version: 'baseline-simulated-2026-08-31-v1',
      sourceId: 'simulated-crm',
      capturedAt: '2026-08-31T12:00:00Z',
      periodStart: '2026-01-01',
      counts: { companies: 20, contacts: 100, deals: 40, activities: 0 },
      companies: [],
      contacts: [],
      deals: [],
      activities: [],
      audit: {
        companiesLoaded: 20,
        companiesValid: 20,
        companiesErrors: 0,
        contactsLoaded: 100,
        contactsValid: 100,
        contactsMatched: 100,
        contactsErrors: 0,
        dealsLoaded: 40,
        dealsValid: 40,
        dealsErrors: 0,
      },
    });

    const run = createMockRun('baseline-simulated-2026-08-31-v1');
    const audit = resolveRunSourceAudit(run);

    expect(audit.isFrozen).toBe(true);
    expect(audit.dataSourceId).toBe('simulated-crm');
    expect(audit.capturedAt).toBe('2026-08-31T12:00:00Z');
    expect(audit.counts?.companies).toBe(20);
  });

  it('löst Fallback-Datenquellen auf wenn dataSourceId fehlt', () => {
    // 1. baseline-file:
    const runFile = createMockRun('baseline-file:2026-08-31-v1');
    const auditFile = resolveRunSourceAudit(runFile);
    expect(auditFile.dataSourceId).toBe('baseline-file:2026-08-31-v1');
    expect(auditFile.sourceKind).toBe('file');

    // 2. baseline-simulated-crm
    const runSim = createMockRun('baseline-simulated-crm');
    const auditSim = resolveRunSourceAudit(runSim);
    expect(auditSim.dataSourceId).toBe('simulated');

    // 3. Fallback ohne Prefix
    const runOther = createMockRun('v1.0.0');
    const auditOther = resolveRunSourceAudit(runOther);
    expect(auditOther.dataSourceId).toBe('simulated-crm');
  });

  it('verwendet Catch-Block für unbekannte Quellen (baseline-file & hubspot)', () => {
    vi.spyOn(dataSourceRegistry, 'get').mockImplementation(() => {
      throw new Error('Not found');
    });

    const runFile = createMockRun('v1', 'baseline-file:custom-snapshot.json');
    const auditFile = resolveRunSourceAudit(runFile);
    expect(auditFile.sourceKind).toBe('file');
    expect(auditFile.sourceLabel).toContain('custom-snapshot.json');
    expect(auditFile.sourceDesc).toBe('Eingefrorener Dateidatensatz');

    const runHubSpot = createMockRun('v1', 'hubspot-baseline:2026-09-01');
    const auditHubSpot = resolveRunSourceAudit(runHubSpot);
    expect(auditHubSpot.sourceKind).toBe('external');
    expect(auditHubSpot.sourceLabel).toContain('2026-09-01');
    expect(auditHubSpot.sourceDesc).toContain('HubSpot-Snapshot');

    const runUnknown = createMockRun('v1', 'unknown-source-id');
    const auditUnknown = resolveRunSourceAudit(runUnknown);
    expect(auditUnknown.sourceKind).toBe('simulated');
    expect(auditUnknown.sourceLabel).toBe('unknown-source-id');
    expect(auditUnknown.sourceDesc).toBe('');
  });
});
