import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRunSourceAudit } from '../runSourceAudit';
import { BaselineSnapshotService } from '../baselineSnapshotService';
import { dataSourceRegistry } from '../index';
import type { SimulationRun } from '@/types/scenario';

function createMockRun(baselineVersion: string, dataSourceId?: string): SimulationRun {
  return {
    manifest: {
      baselineVersion,
      dataSourceId,
    },
  } as unknown as SimulationRun;
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
      // 067E: Pflichtfelder des erweiterten BaselineDataset (reine Typ-Reparatur).
      baselineHash: 'a'.repeat(64),
      historicalMetrics: { baseCustomers: 66, baseMRR: 34320, baseARR: 411840 },
      organizationId: 'unknown',
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
    const result = resolveRunSourceAudit(run);

    expect(result.isFrozen).toBe(true);
    expect(result.dataSourceId).toBe('simulated-crm');
    expect(result.capturedAt).toBe('2026-08-31T12:00:00Z');
    expect(result.periodStart).toBe('2026-01-01');
    expect(result.counts?.companies).toBe(20);
    expect(result.sourceKind).toBe('simulated');
  });

  it('fällt bei nicht registrierter Datenquelle auf Fallback-Labels zurück', () => {
    vi.spyOn(dataSourceRegistry, 'get').mockImplementation(() => {
      throw new Error('Not found');
    });

    // 1. Fallback für baseline-file:
    const runFile = createMockRun('baseline-file:test-set');
    const resultFile = resolveRunSourceAudit(runFile);
    expect(resultFile.sourceKind).toBe('file');
    expect(resultFile.sourceLabel).toContain('Baseline-Datei');

    // 2. Fallback für hubspot-baseline:
    const runHubspot = createMockRun('baseline-external', 'hubspot-baseline:2026-09');
    const resultHubspot = resolveRunSourceAudit(runHubspot);
    expect(resultHubspot.sourceKind).toBe('external');
    expect(resultHubspot.sourceLabel).toContain('HubSpot-Baseline');
  });

  it('behandelt dataSourceId-Auflösung für baseline-*-Präfixe und Standard-Fall', () => {
    // Wenn weder eingefroren noch dataSourceId im Manifest:
    // a) baseline-crm-test -> dataSourceId = 'crm'
    const runPrefix = createMockRun('baseline-crm_custom-v1');
    const resultPrefix = resolveRunSourceAudit(runPrefix);
    expect(resultPrefix.dataSourceId).toBe('crm_custom');

    // b) kein baseline- Prefix -> simulated-crm
    const runDefault = createMockRun('custom-version');
    const resultDefault = resolveRunSourceAudit(runDefault);
    expect(resultDefault.dataSourceId).toBe('simulated-crm');
  });
});
