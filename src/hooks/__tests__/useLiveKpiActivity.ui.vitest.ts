// G32-Charakterisierung: useLiveKpiActivity (jsdom, Testing Library).
// vi.mock ausschließlich auf den ReadAdapter — nie auf den Store.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LiveKpiSnapshot } from '@/services/liveKpi/liveKpiReadAdapter';
import { RETENTION_MS } from '@/services/liveKpi/liveKpiStreamStore';
import { useLiveKpiActivity } from '../useLiveKpiActivity';
import {
  makeSnapshot,
  flushMicrotasks,
} from '../../services/liveKpi/__tests__/fakes';

type FeedStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

const controls = vi.hoisted(() => ({
  configured: true,
  historyCalls: [] as string[],
  historyResolvers: [] as Array<(v: LiveKpiSnapshot[]) => void>,
  feed: null as null | {
    onEvent: (s: LiveKpiSnapshot) => void;
    onStatus: (s: FeedStatus) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  },
}));

vi.mock('@/services/liveKpi/liveKpiReadAdapter', () => ({
  isLiveKpiReadConfigured: () => controls.configured,
  fetchLatestLiveKpi: () => Promise.resolve(null),
  fetchLiveKpiHistory: (id: string) => {
    controls.historyCalls.push(id);
    return new Promise<LiveKpiSnapshot[]>((resolve) => {
      controls.historyResolvers.push(resolve);
    });
  },
  subscribeToLiveKpiFeed: (
    onEvent: (s: LiveKpiSnapshot) => void,
    onStatus: (s: FeedStatus) => void,
  ) => {
    const unsubscribe = vi.fn();
    controls.feed = { onEvent, onStatus, unsubscribe };
    return { unsubscribe };
  },
}));

beforeEach(() => {
  // Fake-Timer für die 60-s-Retention (G33 Fix B): afterEach lässt alle
  // Lösch-Timer ablaufen → Singleton-Isolation zwischen Tests.
  vi.useFakeTimers();
  controls.configured = true;
  controls.historyCalls = [];
  controls.historyResolvers = [];
  controls.feed = null;
});

afterEach(() => {
  vi.advanceTimersByTime(RETENTION_MS);
  vi.useRealTimers();
});

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-01T10:01:00.000Z';
const T3 = '2026-01-01T10:02:00.000Z';

async function emit(snap: LiveKpiSnapshot): Promise<void> {
  await act(async () => {
    const feed = controls.feed;
    if (!feed) throw new Error('kein Feed abonniert');
    feed.onEvent(snap);
    await flushMicrotasks();
  });
}

async function setStatus(status: FeedStatus): Promise<void> {
  await act(async () => {
    const feed = controls.feed;
    if (!feed) throw new Error('kein Feed abonniert');
    feed.onStatus(status);
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
    expect(controls.feed).toBeNull();
    unmount();
  });

  it('Duplikate werden einmal abonniert, Reihenfolge bleibt', () => {
    const { unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_partner', 'arr_outbound']),
    );
    expect(controls.historyCalls).toEqual(['arr_partner', 'arr_outbound']);
    unmount();
  });

  it('Snapshots: exakt 5 Felder, absteigend sortiert, Limit greift', async () => {
    const { result, unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound', 'arr_other'], 2),
    );
    await emit(makeSnapshot('arr_partner', T1, 10));
    await emit(makeSnapshot('arr_outbound', T3, 30));
    await emit(makeSnapshot('arr_other', T2, 20));
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
      await emit(makeSnapshot(id, `2026-01-01T10:${String(i).padStart(2, '0')}:00.000Z`, i));
    }
    expect(result.current.items).toHaveLength(10);
    unmount();
  });

  it('Limit-Clamp: 0 → 1 (neuester gewinnt)', async () => {
    const { result, unmount } = renderHook(() => useLiveKpiActivity(['pipeline_won'], 0));
    await emit(makeSnapshot('pipeline_won', T1, 1));
    await emit(makeSnapshot('pipeline_won', T2, 2));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.value).toBe(2);
    unmount();
  });

  it('aggregierter Status: Priorität live > loading > error > offline', async () => {
    const { result, unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound']),
    );
    expect(result.current.status).toBe('loading');
    await setStatus('offline');
    expect(result.current.status).toBe('offline');
    await setStatus('reconnecting');
    expect(result.current.status).toBe('loading');
    await setStatus('live');
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
    await emit(makeSnapshot('pipeline_leads', base, 1));
    const later = {
      ...makeSnapshot('pipeline_mql', base, 2),
      ingestedAt: '2026-01-02T00:00:00.000Z',
    };
    await emit(later);
    expect(second.result.current.items.map((i) => i.value)).toEqual([2, 1]);
    second.unmount();
  });

  it('Unmount bestellt alle Subscriptions ab', () => {
    const { unmount } = renderHook(() =>
      useLiveKpiActivity(['arr_partner', 'arr_outbound']),
    );
    const unsub = controls.feed?.unsubscribe;
    if (!unsub) throw new Error('kein Feed abonniert');
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
