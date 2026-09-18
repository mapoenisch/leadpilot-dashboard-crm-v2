// Charakterisierung: crmEnvelopeGuard (reine Guards/Hashes, keine DB/Netz).
import { describe, it, expect } from 'vitest';
import {
  emptyCrmReadModel,
  validateCrmReadModel,
  classifyEnvelopeStatus,
  stableStringify,
  hashCrmContent,
  assertSingleSourceEnvelope,
} from '../crmEnvelopeGuard';
import { DataSourceError } from '../../../types/dataSource';
import type { CrmReadModel, CrmReadModelEnvelope } from '../../../types/dataSource';

function validModel(): CrmReadModel {
  return {
    companies: [{ id: 'c1', name: 'ACME' }],
    contacts: [{ id: 'p1', email: 'a@acme.test', companyId: 'c1' }],
    deals: [{ id: 'd1', amount: 1000 }],
    activities: [{ id: 'a1', type: 'call', timestamp: '2026-01-01T00:00:00.000Z' }],
    audit: {
      companiesLoaded: 1,
      companiesValid: 1,
      companiesErrors: 0,
      contactsLoaded: 1,
      contactsValid: 1,
      contactsMatched: 1,
      contactsErrors: 0,
      dealsLoaded: 1,
      dealsValid: 1,
      dealsErrors: 0,
    },
  } as unknown as CrmReadModel;
}

function envelope(over: Partial<CrmReadModelEnvelope> = {}): CrmReadModelEnvelope {
  return {
    sourceId: 'simulated-crm',
    organizationId: 'org-a',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    contentHash: 'abc123',
    data: validModel(),
    ...over,
  } as CrmReadModelEnvelope;
}

function codeOf(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(DataSourceError);
    return (err as DataSourceError).code;
  }
  throw new Error('erwarteter Wurf blieb aus');
}

describe('crmEnvelopeGuard', () => {
  it('emptyCrmReadModel ist leer und valide', () => {
    const m = emptyCrmReadModel();
    expect(m.companies).toEqual([]);
    expect(() => validateCrmReadModel(m)).not.toThrow();
    expect(classifyEnvelopeStatus(m)).toBe('empty');
  });

  it('valides Modell passiert den Guard', () => {
    expect(() => validateCrmReadModel(validModel())).not.toThrow();
  });

  it('Guard wirft INVALID_RUNTIME je defekter Sektion', () => {
    expect(codeOf(() => validateCrmReadModel(null))).toBe('INVALID_RUNTIME');
    expect(codeOf(() => validateCrmReadModel({ ...validModel(), deals: 'x' }))).toBe(
      'INVALID_RUNTIME',
    );
    expect(codeOf(() => validateCrmReadModel({ ...validModel(), companies: [{ id: 'c' }] }))).toBe(
      'INVALID_RUNTIME',
    );
    expect(codeOf(() => validateCrmReadModel({ ...validModel(), contacts: [{ id: 'p' }] }))).toBe(
      'INVALID_RUNTIME',
    );
    expect(
      codeOf(() => validateCrmReadModel({ ...validModel(), deals: [{ id: 'd', amount: NaN }] })),
    ).toBe('INVALID_RUNTIME');
    expect(codeOf(() => validateCrmReadModel({ ...validModel(), activities: [{ id: 'a' }] }))).toBe(
      'INVALID_RUNTIME',
    );
    expect(
      codeOf(() =>
        validateCrmReadModel({
          ...validModel(),
          audit: { ...validModel().audit, dealsErrors: -1 },
        }),
      ),
    ).toBe('INVALID_RUNTIME');
    expect(codeOf(() => validateCrmReadModel({ ...validModel(), audit: null }))).toBe(
      'INVALID_RUNTIME',
    );
  });

  it('Status: Audit-Fehler → degraded, sonst healthy', () => {
    expect(classifyEnvelopeStatus(validModel())).toBe('healthy');
    const degraded = validModel();
    degraded.audit.dealsErrors = 2;
    expect(classifyEnvelopeStatus(degraded)).toBe('degraded');
  });

  it('stableStringify sortiert Keys, Hash ist inhaltsstabil', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(hashCrmContent(validModel())).toBe(hashCrmContent(validModel()));
    expect(hashCrmContent(validModel())).toMatch(/^[0-9a-f]{16}$/);
    const changed = validModel();
    changed.deals = [];
    expect(hashCrmContent(changed)).not.toBe(hashCrmContent(validModel()));
  });

  it('Provenienz-Guard akzeptiert passende Envelope', () => {
    expect(() => assertSingleSourceEnvelope(envelope(), 'simulated-crm')).not.toThrow();
  });

  it('Provenienz-Guard wirft je Verletzungsart', () => {
    expect(codeOf(() => assertSingleSourceEnvelope(envelope(), 'hubspot'))).toBe('MIXED_SOURCE');
    expect(
      codeOf(() => assertSingleSourceEnvelope(envelope({ organizationId: '' }), 'simulated-crm')),
    ).toBe('INVALID_ORG');
    expect(
      codeOf(() =>
        assertSingleSourceEnvelope(envelope({ fetchedAt: 'kein-datum' }), 'simulated-crm'),
      ),
    ).toBe('INTEGRITY');
    expect(
      codeOf(() => assertSingleSourceEnvelope(envelope({ contentHash: '' }), 'simulated-crm')),
    ).toBe('INTEGRITY');
    expect(
      codeOf(() =>
        assertSingleSourceEnvelope(envelope({ data: { deals: [] } as never }), 'simulated-crm'),
      ),
    ).toBe('INVALID_RUNTIME');
  });
});
