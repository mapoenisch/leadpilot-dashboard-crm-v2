// Charakterisierung: crmKeys (zentrale Query-Key-Factory).
import { describe, it, expect } from 'vitest';
import { crmKeys } from '../queryKeys';

describe('crmKeys', () => {
  it('alle Keys hängen unter ["crm"]', () => {
    expect(crmKeys.all).toEqual(['crm']);
    for (const key of [
      crmKeys.companies(),
      crmKeys.contacts(),
      crmKeys.deals(),
      crmKeys.auditSummary(),
      crmKeys.pipelineOverview(),
      crmKeys.syncStatus(),
    ]) {
      expect(key[0]).toBe('crm');
      expect(key).toHaveLength(2);
    }
  });

  it('Ressourcen-Keys sind eindeutig und stabil', () => {
    expect(crmKeys.companies()).toEqual(['crm', 'companies']);
    expect(crmKeys.deals()).toEqual(['crm', 'deals']);
    expect(crmKeys.syncStatus()).toEqual(['crm', 'syncStatus']);
    const keys = [
      crmKeys.companies(),
      crmKeys.contacts(),
      crmKeys.deals(),
      crmKeys.auditSummary(),
      crmKeys.pipelineOverview(),
      crmKeys.syncStatus(),
    ].map((k) => k.join('/'));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
