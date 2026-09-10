// G32-Charakterisierung: useLiveKpi + useLiveKpiHistory (jsdom, Testing Library).
// vi.mock ausschließlich auf den ReadAdapter — nie auf den Store. Die Hooks
// binden an den Singleton; Isolation über eigene KPI-IDs je Test.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LiveKpiSnapshot } from '@/services/liveKpi/liveKpiReadAdapter';
import { RETENTION_MS } from '@/services/liveKpi/liveKpiStreamStore';
import { useLiveKpi } from '../useLiveKpi';
import { useLiveKpiHistory } from '../useLiveKpiHistory';
import {
  makeSnapshot,
  flushMicrotasks,
} from '../../services/liveKpi/__tests__/fakes';

type ConnStatus = 'subscribed' | 'offline' | 'error';

const controls = vi.hoisted(() => ({
  configured: true,
  historyCalls: [] as string[],
  historyResolvers: [] as Array<(v: LiveKpiSnapshot[]) => void>,
  latestCalls: [] as string[],
  latestValue: null as LiveKpiSnapshot | null,
  subs: [] as Array<{
    id: string;
    onEvent: (s: LiveKpiSnapshot) => void;
    onStatus: (s: ConnStatus) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('@/services/liveKpi/liveKpiReadAdapter', () => ({
  isLiveKpiReadConfigured: () => controls.configured,
  fetchLatestLiveKpi: (id: string) => {
    controls.latestCalls.push(id);
    return Promise.resolve(controls.latestValue);
  },
  fetchLiveKpiHistory: (id: string) => {
    controls.historyCalls.push(id);
    return new Promise<LiveKpiSnapshot[]>((resolve) => {
      controls.historyResolvers.push(resolve);
    });
  },
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
  // Fake-Timer für die 60-s-Retention des Singleton-Stores (G33 Fix B):
  // afterEach lässt alle Lösch-Timer ablaufen → jeder Test startet mit
  // leerem Store. Microtasks (flushMicrotasks) bleiben echt.
  vi.useFakeTimers();
  controls.configured = true;
  controls.historyCalls = [];
  controls.historyResolvers = [];
  controls.latestCalls = [];
  controls.latestValue = null;
  controls.subs = [];
});

afterEach(() => {
  vi.advanceTimersByTime(RETENTION_MS);
  vi.useRealTimers();
});

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-01T10:01:00.000Z';

async function resolveHistory(points: LiveKpiSnapshot[]): Promise<void> {
  await act(async () => {
    const resolve = controls.historyResolvers.shift();
    if (!resolve) throw new Error('kein History-Promise offen');
    resolve(points);
    await flushMicrotasks();
  });
}

async function fireStatus(index: number, status: ConnStatus): Promise<void> {
  await act(async () => {
    const sub = controls.subs[index];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus(status);
    await flushMicrotasks();
  });
}

describe('useLiveKpi', () => {
  it('Mount: initial loading; subscribed + latest: live mit Snapshot', async () => {
    const { result, unmount } = renderHook(() => useLiveKpi('arr'));
    expect(result.current.status).toBe('loading');
    expect(result.current.snapshot).toBeNull();
    controls.latestValue = makeSnapshot('arr', T1, 500);
    await fireStatus(0, 'subscribed');
    expect(result.current.status).toBe('live');
    expect(result.current.snapshot?.value).toBe(500);
    expect(controls.latestCalls).toEqual(['arr']);
    unmount();
  });

  it('Store-Update re-rendert den Hook mit neuem Snapshot', async () => {
    const { result, unmount } = renderHook(() => useLiveKpi('mrr'));
    await act(async () => {
      const sub = controls.subs[0];
      if (!sub) throw new Error('keine Subscription registriert');
      sub.onEvent(makeSnapshot('mrr', T2, 999));
      await flushMicrotasks();
    });
    expect(result.current.snapshot?.value).toBe(999);
    expect(result.current.status).toBe('live');
    unmount();
  });

  it('Unmount ruft release auf: Subscription wird abbestellt', () => {
    const { unmount } = renderHook(() => useLiveKpi('arr'));
    const unsub = controls.subs[0]?.unsubscribe;
    if (!unsub) throw new Error('keine Subscription registriert');
    expect(unsub).not.toHaveBeenCalled();
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('refresh lädt latest nach (Store-Delegation)', async () => {
    const { result, unmount } = renderHook(() => useLiveKpi('arr'));
    controls.latestValue = makeSnapshot('arr', T2, 123);
    await act(async () => {
      await result.current.refresh();
      await flushMicrotasks();
    });
    expect(result.current.snapshot?.value).toBe(123);
    unmount();
  });

  it('Kanalfehler spiegelt error in den Hook', async () => {
    const { result, unmount } = renderHook(() => useLiveKpi('arr'));
    await fireStatus(0, 'error');
    expect(result.current.status).toBe('error');
    expect(result.current.error).not.toBeNull();
    unmount();
  });
});

describe('useLiveKpiHistory', () => {
  it('liefert History nach Resolve, Status folgt Kanal', async () => {
    const { result, unmount } = renderHook(() => useLiveKpiHistory('pipeline_coverage'));
    expect(result.current.history).toEqual([]);
    await resolveHistory([makeSnapshot('pipeline_coverage', T1, 10)]);
    expect(result.current.history.map((s) => s.value)).toEqual([10]);
    await fireStatus(0, 'subscribed');
    expect(result.current.status).toBe('live');
    unmount();
  });

  it('Remount im Fenster: behält history + live ohne Refetch (Retention)', async () => {
    const first = renderHook(() => useLiveKpiHistory('pipeline_mql'));
    await resolveHistory([makeSnapshot('pipeline_mql', T1, 42)]);
    await fireStatus(0, 'subscribed');
    expect(first.result.current.history).toHaveLength(1);
    expect(first.result.current.status).toBe('live');
    const fetchesBefore = controls.historyCalls.length;
    first.unmount();
    const second = renderHook(() => useLiveKpiHistory('pipeline_mql'));
    expect(controls.historyCalls.length).toBe(fetchesBefore);
    expect(second.result.current.history).toHaveLength(1);
    expect(second.result.current.status).toBe('live');
    second.unmount();
  });
});
