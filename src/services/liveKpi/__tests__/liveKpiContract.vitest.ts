// G32-Charakterisierung: liveKpiContract (reine Funktionen, keine Mocks nötig).
import { describe, it, expect } from 'vitest';
import {
  buildIdempotencyKey,
  validateLiveKpiEvent,
} from '../liveKpiContract';
import {
  LIVE_KPI_CONTRACT_VERSION,
  LIVE_KPI_PROVENANCE,
} from '@/types/liveKpi';

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contractVersion: LIVE_KPI_CONTRACT_VERSION,
    provenance: LIVE_KPI_PROVENANCE,
    sourceSystem: 'hubspot',
    eventId: 'evt-1',
    kpiId: 'arr',
    value: 411840,
    unit: 'EUR',
    occurredAt: '2026-01-01T10:00:00.000Z',
    qualityStatus: 'valid',
    correlationId: 'corr-1',
    ...overrides,
  };
}

describe('buildIdempotencyKey', () => {
  it('Format sourceSystem:eventId', () => {
    expect(buildIdempotencyKey('hubspot', 'evt-1')).toBe('hubspot:evt-1');
  });

  it('wirft bei ungültigem sourceSystem', () => {
    expect(() => buildIdempotencyKey('ungültig leer!', 'evt-1')).toThrow('sourceSystem');
  });

  it('wirft bei ungültiger eventId', () => {
    expect(() => buildIdempotencyKey('hubspot', '')).toThrow('eventId');
  });
});

describe('validateLiveKpiEvent', () => {
  it('gültiges Event: valid mit Event + Idempotenzschlüssel', () => {
    const res = validateLiveKpiEvent(validEvent());
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.idempotencyKey).toBe('hubspot:evt-1');
      expect(res.event.value).toBe(411840);
    }
  });

  it('nicht-Objekte: PAYLOAD_MALFORMED', () => {
    for (const bad of [null, 42, 'x', []]) {
      const res = validateLiveKpiEvent(bad);
      expect(res.valid).toBe(false);
      if (!res.valid) expect(res.errorCode).toBe('PAYLOAD_MALFORMED');
    }
  });

  it('falsche Version / Provenance', () => {
    const v = validateLiveKpiEvent(validEvent({ contractVersion: 'v9' }));
    if (!v.valid) expect(v.errorCode).toBe('INVALID_CONTRACT_VERSION');
    else throw new Error('sollte fehlschlagen');
    const p = validateLiveKpiEvent(validEvent({ provenance: 'direkt' }));
    if (!p.valid) expect(p.errorCode).toBe('INVALID_PROVENANCE');
    else throw new Error('sollte fehlschlagen');
  });

  it('ungültige Bezeichner (sourceSystem, eventId, kpiId)', () => {
    const codes = ['INVALID_SOURCE_SYSTEM', 'INVALID_EVENT_ID', 'INVALID_KPI_ID'] as const;
    const fields = ['sourceSystem', 'eventId', 'kpiId'] as const;
    fields.forEach((field, i) => {
      const res = validateLiveKpiEvent(validEvent({ [field]: '!!' }));
      if (!res.valid) expect(res.errorCode).toBe(codes[i]);
      else throw new Error(`sollte fehlschlagen: ${field}`);
    });
  });

  it('ungültige Werte (String, NaN, Infinity)', () => {
    for (const bad of ['x', NaN, Infinity]) {
      const res = validateLiveKpiEvent(validEvent({ value: bad }));
      if (!res.valid) expect(res.errorCode).toBe('INVALID_VALUE');
      else throw new Error('sollte fehlschlagen');
    }
  });

  it('leere Unit, Zeitstempel-Fälle, falscher Quality-Status, leere Correlation-ID', () => {
    const u = validateLiveKpiEvent(validEvent({ unit: '  ' }));
    if (!u.valid) expect(u.errorCode).toBe('INVALID_UNIT');
    else throw new Error('sollte fehlschlagen');
    const t1 = validateLiveKpiEvent(validEvent({ occurredAt: '01.01.2026' }));
    if (!t1.valid) expect(t1.errorCode).toBe('INVALID_TIMESTAMP');
    else throw new Error('sollte fehlschlagen');
    const t2 = validateLiveKpiEvent(validEvent({ occurredAt: '2026-13-99T99:99:99.000Z' }));
    if (!t2.valid) expect(t2.errorCode).toBe('INVALID_TIMESTAMP');
    else throw new Error('sollte fehlschlagen');
    const q = validateLiveKpiEvent(validEvent({ qualityStatus: 'top' }));
    if (!q.valid) expect(q.errorCode).toBe('INVALID_QUALITY_STATUS');
    else throw new Error('sollte fehlschlagen');
    const c = validateLiveKpiEvent(validEvent({ correlationId: '' }));
    if (!c.valid) expect(c.errorCode).toBe('INVALID_CORRELATION_ID');
    else throw new Error('sollte fehlschlagen');
  });

  it('Kontext: ungültig als Nicht-Objekt, ok als Objekt oder fehlend', () => {
    const bad = validateLiveKpiEvent(validEvent({ context: [1] }));
    if (!bad.valid) expect(bad.errorCode).toBe('INVALID_CONTEXT');
    else throw new Error('sollte fehlschlagen');
    expect(validateLiveKpiEvent(validEvent({ context: { a: 1 } })).valid).toBe(true);
    expect(validateLiveKpiEvent(validEvent({ context: null })).valid).toBe(true);
    const { context: _drop, ...without } = validEvent();
    expect(validateLiveKpiEvent(without).valid).toBe(true);
  });

  it('trimmt Unit/Correlation-ID, übernimmt optionale Felder', () => {
    const res = validateLiveKpiEvent(
      validEvent({ unit: '  EUR  ', correlationId: '  c1 ', sourceReference: 'ref-9' }),
    );
    if (!res.valid) throw new Error('sollte gelten');
    expect(res.event.unit).toBe('EUR');
    expect(res.event.correlationId).toBe('c1');
    expect(res.event.sourceReference).toBe('ref-9');
  });
});
