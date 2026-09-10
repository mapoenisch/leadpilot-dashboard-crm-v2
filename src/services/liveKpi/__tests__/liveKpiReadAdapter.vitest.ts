// G32-Charakterisierung: liveKpiReadAdapter (echter Code, nur Supabase gemockt).
// vi.mock ausschließlich auf '@/services/db/supabaseClient' — nie auf Store/Adapter.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchLatestLiveKpi,
  fetchLiveKpiHistory,
  isLiveKpiReadConfigured,
  subscribeToLiveKpi,
} from '../liveKpiReadAdapter';

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
  };

  const limitResult = {
    maybeSingle: () => Promise.resolve({ ...state.queryResult }),
    then: (resolve: (value: QueryResult) => void) =>
      Promise.resolve({ ...state.queryResult }).then(resolve),
  };
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: (...args: unknown[]) => {
      state.limitArgs.push(args[0]);
      return limitResult;
    },
    maybeSingle: () => Promise.resolve({ ...state.queryResult }),
  };
  const channelObj = {
    on: (_event: string, _filter: unknown, handler: (payload: { new?: unknown }) => void) => {
      state.payloadHandler = handler;
      return channelObj;
    },
    subscribe: (cb: (status: string) => void) => {
      state.statusHandler = cb;
      return {};
    },
  };
  const client = {
    from: (...args: unknown[]) => {
      state.fromArgs.push(args[0]);
      return chain;
    },
    channel: () => channelObj,
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
});

describe('isLiveKpiReadConfigured', () => {
  it('true mit Client, false ohne', () => {
    expect(isLiveKpiReadConfigured()).toBe(true);
    sb.state.clientExists = false;
    expect(isLiveKpiReadConfigured()).toBe(false);
  });
});

describe('fetchLatestLiveKpi', () => {
  it('null ohne Client', async () => {
    sb.state.clientExists = false;
    await expect(fetchLatestLiveKpi('arr')).resolves.toBeNull();
  });

  it('mappt eine Datenzeile auf Snapshot', async () => {
    sb.state.queryResult = { data: row(), error: null };
    const snap = await fetchLatestLiveKpi('arr');
    expect(snap?.value).toBe(411840);
    expect(snap?.kpiId).toBe('arr');
    expect(sb.state.fromArgs).toEqual(['live_kpi_public_feed']);
  });

  it('null bei leerem Ergebnis', async () => {
    sb.state.queryResult = { data: null, error: null };
    await expect(fetchLatestLiveKpi('arr')).resolves.toBeNull();
  });

  it('wirft bei DB-Fehler mit KPI-ID in Meldung', async () => {
    sb.state.queryResult = { data: null, error: { message: 'db down' } };
    await expect(fetchLatestLiveKpi('arr')).rejects.toThrow('arr');
  });

  it('ungültige Zeile ohne Zahl wird null (mapRowToSnapshot)', async () => {
    sb.state.queryResult = { data: row({ value: 'keine-zahl' }), error: null };
    await expect(fetchLatestLiveKpi('arr')).resolves.toBeNull();
  });
});

describe('fetchLiveKpiHistory', () => {
  it('wirft bei ungültigem Limit (NaN)', async () => {
    await expect(fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', NaN)).rejects.toThrow(
      'Invalid limit',
    );
  });

  it('leeres Array ohne Client', async () => {
    sb.state.clientExists = false;
    await expect(fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 30)).resolves.toEqual([]);
  });

  it('clamppt Limit auf 1..30 (99 → 30, 0 → 1)', async () => {
    sb.state.queryResult = { data: [], error: null };
    await fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 99);
    await fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 0);
    expect(sb.state.limitArgs).toEqual([30, 1]);
  });

  it('sortiert aufsteigend, filtert Müllzeilen', async () => {
    sb.state.queryResult = {
      data: [
        row({ id: 'b', occurred_at: '2026-01-01T10:02:00.000Z', value: 3 }),
        row({ id: 'müll', value: 'kaputt' }),
        row({ id: 'a', occurred_at: '2026-01-01T10:01:00.000Z', value: 1 }),
      ],
      error: null,
    };
    const res = await fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 30);
    expect(res.map((s) => s.value)).toEqual([1, 3]);
  });

  it('wirft bei DB-Fehler', async () => {
    sb.state.queryResult = { data: null, error: { message: 'history down' } };
    await expect(fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 30)).rejects.toThrow(
      'history down',
    );
  });

  it('leeres Array bei data null', async () => {
    sb.state.queryResult = { data: null, error: null };
    await expect(fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 30)).resolves.toEqual([]);
  });

  it('null-Zeilen und Objekte ohne Row-Form werden übersprungen', async () => {
    sb.state.queryResult = {
      data: [null, 42, { id: 'x' }, row({ id: 'ok', value: 5 })],
      error: null,
    };
    const res = await fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 30);
    expect(res.map((s) => s.id)).toEqual(['ok']);
  });

  it('Defaults: fehlende Felder, degraded-Status', async () => {
    sb.state.queryResult = {
      data: [{ kpi_id: 'mrr', value: 9, quality_status: 'degraded' }],
      error: null,
    };
    const res = await fetchLiveKpiHistory('mrr', '2026-01-01T00:00:00.000Z', 30);
    expect(res).toHaveLength(1);
    expect(res[0]?.id).toBe('');
    expect(res[0]?.unit).toBe('');
    expect(res[0]?.qualityStatus).toBe('degraded');
    expect(res[0]?.occurredAt).toBe('');
  });

  it('Tiebreak ingestedAt bei gleicher occurredAt', async () => {
    sb.state.queryResult = {
      data: [
        row({ id: 'neu', occurred_at: '2026-01-01T10:00:00.000Z', ingested_at: '2026-01-01T10:05:00.000Z', value: 2 }),
        row({ id: 'alt', occurred_at: '2026-01-01T10:00:00.000Z', ingested_at: '2026-01-01T10:01:00.000Z', value: 1 }),
      ],
      error: null,
    };
    const res = await fetchLiveKpiHistory('arr', '2026-01-01T00:00:00.000Z', 30);
    expect(res.map((s) => s.id)).toEqual(['alt', 'neu']);
  });
});

describe('subscribeToLiveKpi', () => {
  it('ohne Client: offline + Noop-Unsubscribe', () => {
    sb.state.clientExists = false;
    const seen: string[] = [];
    const sub = subscribeToLiveKpi('arr', () => {}, (s) => {
      seen.push(s);
    });
    expect(seen).toEqual(['offline']);
    expect(() => sub.unsubscribe()).not.toThrow();
  });

  it('INSERT-Payload wird als Event gemappt und zugestellt', () => {
    const seen: { value: number }[] = [];
    subscribeToLiveKpi(
      'arr',
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
    subscribeToLiveKpi(
      'arr',
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

  it('Kanal-Stati werden übersetzt (SUBSCRIBED/ERROR/TIMED_OUT/CLOSED)', () => {
    const seen: string[] = [];
    subscribeToLiveKpi('arr', () => {}, (s) => {
      seen.push(s);
    });
    if (!sb.state.statusHandler) throw new Error('kein Status-Handler registriert');
    sb.state.statusHandler('SUBSCRIBED');
    sb.state.statusHandler('CHANNEL_ERROR');
    sb.state.statusHandler('TIMED_OUT');
    sb.state.statusHandler('CLOSED');
    expect(seen).toEqual(['subscribed', 'error', 'error', 'offline']);
  });

  it('unsubscribe entfernt Channel genau einmal, Fehler wird gewarnt', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const sub = subscribeToLiveKpi('arr', () => {}, () => {});
      sub.unsubscribe();
      sub.unsubscribe();
      expect(sb.state.removedChannels).toHaveLength(1);
      sb.state.removeChannelThrows = true;
      const sub2 = subscribeToLiveKpi('arr', () => {}, () => {});
      sub2.unsubscribe();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
