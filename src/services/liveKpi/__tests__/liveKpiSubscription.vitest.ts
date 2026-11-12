// G34-Charakterisierung: liveKpiReadAdapter Feed-Kanal & Backoff
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeBackoffDelay, subscribeToLiveKpiFeed } from '../liveKpiReadAdapter';
import { setLiveKpiOrganization, resetLiveKpiTenantScopeForTesting } from '../liveKpiTenantScope';

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

const sb = vi.hoisted(() => {
  const state = {
    clientExists: true,
    queryResult: { data: null, error: null } as QueryResult,
    payloadHandler: null as null | ((payload: { new?: unknown }) => void),
    statusHandler: null as null | ((status: string) => void),
    removedChannels: [] as unknown[],
    removeChannelThrows: false,
    limitArgs: [] as unknown[],
    fromArgs: [] as unknown[],
    eqCalls: [] as Array<[string, unknown]>,
    channelIds: [] as unknown[],
    onCalls: [] as Array<{ event: string; filter: unknown }>,
  };

  const channelObj = {
    on: (event: string, filter: unknown, handler: (payload: { new?: unknown }) => void) => {
      state.payloadHandler = handler;
      state.onCalls.push({ event, filter });
      return channelObj;
    },
    subscribe: (cb: (status: string) => void) => {
      state.statusHandler = cb;
      return {};
    },
  };
  const client = {
    channel: (...args: unknown[]) => {
      state.channelIds.push(args[0]);
      return channelObj;
    },
    removeChannel: (...args: unknown[]) => {
      if (state.removeChannelThrows) throw new Error('remove boom');
      state.removedChannels.push(args[0]);
    },
  };
  return { state, client };
});

vi.mock('@/services/db/supabaseClient', () => ({
  get supabase() {
    return sb.state.clientExists ? sb.client : null;
  },
}));

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    kpi_id: 'arr',
    value: 411840,
    unit: 'EUR',
    occurred_at: '2026-01-01T10:00:00.000Z',
    quality_status: 'valid',
    source_system: 'hubspot',
    ingested_at: '2026-01-01T10:00:05.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  sb.state.clientExists = true;
  sb.state.queryResult = { data: null, error: null };
  sb.state.payloadHandler = null;
  sb.state.statusHandler = null;
  sb.state.removedChannels = [];
  sb.state.removeChannelThrows = false;
  sb.state.limitArgs = [];
  sb.state.fromArgs = [];
  sb.state.eqCalls = [];
  sb.state.channelIds = [];
  sb.state.onCalls = [];
  setLiveKpiOrganization('00000000-0000-0000-0000-000000000001');
});

afterEach(() => {
  resetLiveKpiTenantScopeForTesting();
});

describe('subscribeToLiveKpiFeed (G34: ein Kanal)', () => {
  it('ohne Client: offline + Noop-Unsubscribe', () => {
    sb.state.clientExists = false;
    const seen: string[] = [];
    const sub = subscribeToLiveKpiFeed(
      () => {},
      (s) => {
        seen.push(s);
      },
    );
    expect(seen).toEqual(['offline']);
    expect(() => sub.unsubscribe()).not.toThrow();
    expect(sb.state.channelIds).toEqual([]);
  });

  it('ohne Organisation: offline + Noop-Unsubscribe und kein channel()', () => {
    resetLiveKpiTenantScopeForTesting();
    const seen: string[] = [];
    const sub = subscribeToLiveKpiFeed(
      () => {},
      (s) => {
        seen.push(s);
      },
    );
    expect(seen).toEqual(['offline']);
    expect(() => sub.unsubscribe()).not.toThrow();
    expect(sb.state.channelIds).toEqual([]);
  });

  it('ein Kanal live-kpi-feed:<org> mit organization_id-Filter', () => {
    const seen: string[] = [];
    subscribeToLiveKpiFeed(
      () => {},
      (s) => {
        seen.push(s);
      },
    );
    expect(seen).toEqual(['connecting']);
    expect(sb.state.channelIds).toEqual(['live-kpi-feed:00000000-0000-0000-0000-000000000001']);
    expect(sb.state.onCalls).toHaveLength(1);
    expect(sb.state.onCalls[0]?.event).toBe('postgres_changes');
    const filter = sb.state.onCalls[0]?.filter as Record<string, unknown>;
    expect(filter.table).toBe('live_kpi_public_feed');
    expect(filter.filter).toBe('organization_id=eq.00000000-0000-0000-0000-000000000001');
  });

  it('INSERT-Payload wird als Event gemappt und zugestellt', () => {
    const seen: { value: number }[] = [];
    subscribeToLiveKpiFeed(
      (s) => {
        seen.push({ value: s.value });
      },
      () => {},
    );
    if (!sb.state.payloadHandler) throw new Error('kein Payload-Handler registriert');
    sb.state.payloadHandler({ new: row({ value: 777 }) });
    expect(seen).toEqual([{ value: 777 }]);
  });

  it('Payload ohne .new und Müllzeilen werden ignoriert', () => {
    let calls = 0;
    subscribeToLiveKpiFeed(
      () => {
        calls += 1;
      },
      () => {},
    );
    if (!sb.state.payloadHandler) throw new Error('kein Payload-Handler registriert');
    sb.state.payloadHandler({});
    sb.state.payloadHandler({ new: row({ value: 'müll' }) });
    sb.state.payloadHandler(null as unknown as { new?: unknown });
    expect(calls).toBe(0);
  });

  it('SUBSCRIBED → live; CLOSED unerwartet → reconnecting', () => {
    const seen: string[] = [];
    subscribeToLiveKpiFeed(
      () => {},
      (s) => {
        seen.push(s);
      },
    );
    if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
    sb.state.statusHandler('SUBSCRIBED');
    sb.state.statusHandler('CLOSED');
    expect(seen).toEqual(['connecting', 'live', 'reconnecting']);
  });

  it('Backoff-Ablauf: Fehler → Retry mit wachsendem Delay, Reset bei live', async () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const seen: string[] = [];
      const sub = subscribeToLiveKpiFeed(
        () => {},
        (s) => {
          seen.push(s);
        },
      );
      expect(sb.state.channelIds).toHaveLength(1);
      if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
      sb.state.statusHandler('CHANNEL_ERROR');
      expect(seen).toEqual(['connecting', 'reconnecting']);
      expect(sb.state.removedChannels).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(499);
      expect(sb.state.channelIds).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(sb.state.channelIds).toHaveLength(2);
      if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
      sb.state.statusHandler('TIMED_OUT');
      await vi.advanceTimersByTimeAsync(999);
      expect(sb.state.channelIds).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(sb.state.channelIds).toHaveLength(3);
      if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
      sb.state.statusHandler('SUBSCRIBED');
      expect(seen).toContain('live');
      if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
      sb.state.statusHandler('CHANNEL_ERROR');
      await vi.advanceTimersByTimeAsync(500);
      expect(sb.state.channelIds).toHaveLength(4);
      sub.unsubscribe();
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('unsubscribe bricht Backoff-Timer ab, doppelt ist Noop', async () => {
    vi.useFakeTimers();
    try {
      const sub = subscribeToLiveKpiFeed(
        () => {},
        () => {},
      );
      if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
      sb.state.statusHandler('CHANNEL_ERROR');
      sub.unsubscribe();
      sub.unsubscribe();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(sb.state.channelIds).toHaveLength(1);
      expect(sb.state.removedChannels).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('removeChannel-Fehler wird geschluckt (kein Throw, Kanal trotzdem weg)', () => {
    const sub = subscribeToLiveKpiFeed(
      () => {},
      () => {},
    );
    sb.state.removeChannelThrows = true;
    expect(() => sub.unsubscribe()).not.toThrow();
    expect(sb.state.removedChannels).toEqual([]);
  });
});

describe('computeBackoffDelay (G34)', () => {
  it('Untergrenzen (Jitter 0), Obergrenzen, 30-s-Deckel, monoton', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const lowers = [0, 1, 2, 3, 4, 5, 6, 7].map((a) => computeBackoffDelay(a));
      expect(lowers).toEqual([500, 1000, 2000, 4000, 8000, 15000, 15000, 15000]);
    } finally {
      randomSpy.mockRestore();
    }
    const randomHigh = vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    try {
      const uppers = [0, 1, 2, 3, 4, 5, 6, 7].map((a) => computeBackoffDelay(a));
      const caps = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000];
      uppers.forEach((u, i) => {
        expect(u).toBeLessThanOrEqual(caps[i] ?? 0);
        expect(u).toBeGreaterThan((caps[i] ?? 0) / 2);
      });
    } finally {
      randomHigh.mockRestore();
    }
    expect(computeBackoffDelay(100)).toBeLessThanOrEqual(30000);
    expect(computeBackoffDelay(-1)).toBeGreaterThanOrEqual(0);
  });
});
