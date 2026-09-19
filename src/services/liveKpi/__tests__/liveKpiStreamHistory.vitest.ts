import { describe, it, expect } from 'vitest';
import { compareSnapshots, mergeIntoHistory, normalizeHistory } from '../liveKpiStreamHistory';
import type { LiveKpiSnapshot } from '../liveKpiReadAdapter';

function snap(occurredAt: string, ingestedAt: string): LiveKpiSnapshot {
  return {
    kpiId: 'pipeline_leads',
    value: 1,
    occurredAt,
    ingestedAt,
    qualityStatus: 'valid',
    unit: 'Anzahl',
  } as LiveKpiSnapshot;
}

// 067K / G57: Aufteilungsnachweis für liveKpiStreamHistory (aus
// liveKpiStreamStore.ts herausgelöst, keine Verhaltensänderung).
describe('liveKpiStreamHistory', () => {
  it('compareSnapshots ordnet lexikografisch', () => {
    const a = snap('2026-01-01', '2026-01-01T01:00:00Z');
    const b = snap('2026-01-02', '2026-01-01T01:00:00Z');
    expect(compareSnapshots(a, b)).toBeLessThan(0);
    expect(compareSnapshots(b, a)).toBeGreaterThan(0);
    expect(compareSnapshots(a, { ...a })).toBe(0);
    const c = snap('2026-01-01', '2026-01-01T02:00:00Z');
    expect(compareSnapshots(a, c)).toBeLessThan(0);
  });

  it('mergeIntoHistory hängt sortiert an, verwirft Duplikate, kappt bei 30', () => {
    const a = snap('2026-01-01', '2026-01-01T01:00:00Z');
    const b = snap('2026-01-02', '2026-01-02T01:00:00Z');
    expect(mergeIntoHistory([b], a)).toEqual([a, b]);
    expect(mergeIntoHistory([a], { ...a })).toEqual([a]);
    const many = Array.from({ length: 30 }, (_, i) =>
      snap(`2026-01-${String(i + 1).padStart(2, '0')}`, '2026-01-01T01:00:00Z'),
    );
    const merged = mergeIntoHistory(many, snap('2026-02-01', '2026-02-01T01:00:00Z'));
    expect(merged).toHaveLength(30);
    expect(merged[0]?.occurredAt).toBe('2026-01-02');
  });

  it('normalizeHistory sortiert, entdoppelt und kappt', () => {
    const a = snap('2026-01-02', '2026-01-02T01:00:00Z');
    const b = snap('2026-01-01', '2026-01-01T01:00:00Z');
    expect(normalizeHistory([a, b, { ...a }]).map((s) => s.occurredAt)).toEqual([
      '2026-01-01',
      '2026-01-02',
    ]);
  });
});
