// G32-Charakterisierung: useLiveKpiActivity (jsdom, Testing Library).
// vi.mock ausschließlich auf den ReadAdapter — nie auf den Store.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LiveKpiSnapshot } from '@/services/liveKpi/liveKpiReadAdapter';
import { useLiveKpiActivity } from '../useLiveKpiActivity';
import {
  makeSnapshot,
  flushMicrotasks,
} from '../../services/liveKpi/__tests__/fakes';

type ConnStatus = 'subscribed' | 'offline' | 'error';

const controls = vi.hoisted(() => ({
  configured: true,
  historyResolvers: [] as Array<(v: LiveKpiSnapshot[]) => void>,
  subs: [] as Array<{
    id: string;
    onEvent: (s: LiveKpiSnapshot) => void;
    onStatus: (s: ConnStatus) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('@/services/liveKpi/liveKpiReadAdapter', () => ({
  isLiveKpiReadConfigured: () => controls.configured,
  fetchLatestLiveKpi: () => Promise.resolve(null),
  fetchLiveKpiHistory: () =>
    new Promise<LiveKpiSnapshot[]>((resolve) => {
      controls.historyResolvers.push(resolve);
    }),
  subscribeToLiveKpi: (
    id: string,
    onEvent: (s: LiveKpiSnapshot) => void,
    onStatus: (s: ConnStatus) => void,
  ) => {
    const unsubscribe = vi.fn();
    controls.subs.push({ id, onEvent, onStatus, unsubscribe });
    return { unsubscribe };
  },
}));

beforeEach(() => {
  controls.configured = true;
  controls.historyResolvers = [];
  controls.subs = [];
});

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-01T10:01:00.000Z';
const T3 = '2026-01-01T10:02:00.000Z';

async function emit(index: number, snap: LiveKpiSnapshot): Promise<void> {
  await act(async () => {
    const sub = controls.subs[index];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(snap);
    await flushMicrotasks();
  });
}

async function setStatus(index: number, status: ConnStatus): Promise<void> {
  await act(async () => {
    const sub = controls.subs[index];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus(status);
    await flushMicrotasks();
  });
}

describe('useLiveKpiActivity', () => {
  it('leere/ungültige IDs: keine Items, unconfigured, kein Adapter-Kontakt', () => {
    const { result, unmount } = renderHook(() =>
      useLiveKpiActivity(['gibts-nicht', 'auch-nicht']),
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe('unconfigured');
    expect(controls.subs).toEqual([]);
    unmount();
  });

  it('Duplikate werden einmal abonniert, Reihenfolge bleibt', () => {
    const { unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_partner', 'arr_outbound']),
    );
    expect(controls.subs.map((s) => s.id)).toEqual(['arr_partner', 'arr_outbound']);
    unmount();
  });

  it('Snapshots: exakt 5 Felder, absteigend sortiert, Limit greift', async () => {
    const { result, unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound', 'arr_other'], 2),
    );
    await emit(0, makeSnapshot('arr_partner', T1, 10));
    await emit(1, makeSnapshot('arr_outbound', T3, 30));
    await emit(2, makeSnapshot('arr_other', T2, 20));
    expect(result.current.items.map((i) => i.value)).toEqual([30, 20]);
    const keys = Object.keys(result.current.items[0] ?? {}).sort();
    expect(keys).toEqual(['kpiId', 'occurredAt', 'qualityStatus', 'unit', 'value']);
    expect('id' in (result.current.items[0] ?? {})).toBe(false);
    unmount();
  });

  it('Limit-Clamp: >10 → 10', async () => {
    const ids = [
      'arr',
      'mrr',
      'pipeline_coverage',
      'arr_direct',
      'arr_partner',
      'arr_outbound',
      'arr_other',
      'pipeline_leads',
      'pipeline_mql',
      'pipeline_sql',
      'pipeline_offers',
    ];
    const { result, unmount } = renderHook(() => useLiveKpiActivity(ids, 99));
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!id) throw new Error('ID fehlt');
      await emit(i, makeSnapshot(id, `2026-01-01T10:${String(i).padStart(2, '0')}:00.000Z`, i));
    }
    expect(result.current.items).toHaveLength(10);
    unmount();
  });

  it('Limit-Clamp: 0 → 1 (neuester gewinnt)', async () => {
    const { result, unmount } = renderHook(() => useLiveKpiActivity(['pipeline_won'], 0));
    await emit(0, makeSnapshot('pipeline_won', T1, 1));
    await emit(0, makeSnapshot('pipeline_won', T2, 2));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.value).toBe(2);
    unmount();
  });

  it('aggregierter Status: Priorität live > loading > error > offline', async () => {
    const { result, unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound']),
    );
    expect(result.current.status).toBe('loading');
    await setStatus(0, 'offline');
    await setStatus(1, 'error');
    expect(result.current.status).toBe('error');
    await setStatus(1, 'offline');
    expect(result.current.status).toBe('offline');
    await setStatus(0, 'subscribed');
    expect(result.current.status).toBe('live');
    unmount();
  });

  it('unconfigured-Endzustand ohne Adapter; ingestedAt-Tiebreak', async () => {
    controls.configured = false;
    const { result, unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound']),
    );
    expect(result.current.status).toBe('unconfigured');
    expect(result.current.items).toEqual([]);
    unmount();
    controls.configured = true;
    const second = renderHook(() => useLiveKpiActivity(['pipeline_leads', 'pipeline_mql']));
    const base = '2026-01-01T10:00:00.000Z';
    await emit(0, makeSnapshot('pipeline_leads', base, 1));
    const later = {
      ...makeSnapshot('pipeline_mql', base, 2),
      ingestedAt: '2026-01-02T00:00:00.000Z',
    };
    await emit(1, later);
    expect(second.result.current.items.map((i) => i.value)).toEqual([2, 1]);
    second.unmount();
  });

  it('Unmount bestellt alle Subscriptions ab', () => {
    const { unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound']),
    );
    unmount();
    expect(controls.subs[0]?.unsubscribe).toHaveBeenCalledTimes(1);
    expect(controls.subs[1]?.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
