// G32-Charakterisierung: liveKpiStreamStore (Ist-Verhalten, Fake-Adapter injiziert).
// Nutzt createLiveKpiStreamStore(fake) — nie den Singleton, nie vi.mock auf den Store.
import { describe, it, expect } from 'vitest';
import { createLiveKpiStreamStore } from '../liveKpiStreamStore';
import {
  createFakeAdapter,
  flushMicrotasks,
  liveFeed,
  makeSnapshot,
  type FakeAdapterControls,
} from './fakes';

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-01T10:01:00.000Z';
const T3 = '2026-01-01T10:02:00.000Z';

let controls: FakeAdapterControls;

function freshStore() {
  const { adapter, controls: c } = createFakeAdapter();
  controls = c;
  return createLiveKpiStreamStore(adapter);
}

describe('acquire / Initialzustand', () => {
  it('nicht unterstützte kpiId: unconfigured, kein Adapter-Kontakt', () => {
    const store = freshStore();
    const release = store.acquire('nope-unknown-id');
    const state = store.getState('nope-unknown-id');
    expect(state.status).toBe('unconfigured');
    expect(state.history).toEqual([]);
    expect(state.snapshot).toBeNull();
    expect(controls.historyCalls).toEqual([]);
    expect(controls.feed).toBeNull();
    release();
  });

  it('unkonfiguriert: status unconfigured, kein Fetch, keine Subscription', () => {
    const store = freshStore();
    controls.configured = false;
    const release = store.acquire('arr');
    expect(store.getState('arr').status).toBe('unconfigured');
    expect(controls.historyCalls).toEqual([]);
    expect(controls.feed).toBeNull();
    release();
  });

  it('konfiguriert: status loading, History-Fetch mit Limit 30', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    expect(store.getState('arr').status).toBe('loading');
    expect(controls.historyCalls).toHaveLength(1);
    expect(controls.historyCalls[0]?.kpiId).toBe('arr');
    expect(controls.historyCalls[0]?.limit).toBe(30);
    expect(typeof controls.historyCalls[0]?.sinceIso).toBe('string');
    expect(controls.feedSubscribeCalls).toBe(1);
    release();
  });
});

describe('History-Auflösung', () => {
  it('Punkte landen sortiert in history, snapshot ist der neueste, status live', async () => {
    const store = freshStore();
    const release = store.acquire('mrr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    pending.resolve([
      makeSnapshot('mrr', T3, 300),
      makeSnapshot('mrr', T1, 100),
      makeSnapshot('mrr', T2, 200),
    ]);
    await flushMicrotasks();
    const state = store.getState('mrr');
    expect(state.history.map((s) => s.value)).toEqual([100, 200, 300]);
    expect(state.snapshot?.value).toBe(300);
    expect(state.status).toBe('live');
    release();
  });

  it('leere History: status bleibt loading bis Kanal (Fix-A-Regel)', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    pending.resolve([]);
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.history).toEqual([]);
    expect(state.snapshot).toBeNull();
    expect(state.status).toBe('loading');
    release();
  });

  it('Duplikate werden entfernt, Cap bei 30 (älteste fallen raus)', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    const points = Array.from({ length: 35 }, (_, i) =>
      makeSnapshot('arr', `2026-01-01T10:${String(i).padStart(2, '0')}:00.000Z`, i),
    );
    points.push(makeSnapshot('arr', '2026-01-01T10:00:00.000Z', 0));
    pending.resolve(points);
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.history).toHaveLength(30);
    expect(state.history[0]?.value).toBe(5);
    expect(state.history[29]?.value).toBe(34);
    release();
  });

  it('History-Reject: status error mit Fehlerobjekt', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    pending.reject(new Error('history boom'));
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.status).toBe('error');
    expect(state.error?.message).toBe('history boom');
    release();
  });
});

describe('Kanal-Status', () => {
  it('subscribed: status live, fetchLatest wird nachgeladen', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const feed = liveFeed(controls);
    feed.onStatus('live');
    await flushMicrotasks();
    expect(store.getState('arr').status).toBe('live');
    expect(controls.latestCalls).toEqual(['arr']);
    release();
  });

  it('fetchLatest liefert neueren Snapshot: snapshot + history aktualisiert', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    controls.latestImpl = () => Promise.resolve(makeSnapshot('arr', T2, 222));
    const feed = liveFeed(controls);
    feed.onStatus('live');
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.snapshot?.value).toBe(222);
    expect(state.history.map((s) => s.value)).toEqual([222]);
    release();
  });

  it('fetchLatest null: status live ohne Snapshot', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const feed = liveFeed(controls);
    feed.onStatus('live');
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.status).toBe('live');
    expect(state.snapshot).toBeNull();
    release();
  });

  it('fetchLatest-Reject: status error', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    controls.latestImpl = () => Promise.reject(new Error('latest boom'));
    const feed = liveFeed(controls);
    feed.onStatus('live');
    await flushMicrotasks();
    expect(store.getState('arr').status).toBe('error');
    release();
  });

  it('Feed-Status: offline → offline; reconnecting → loading ohne Daten, sonst unverändert', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const feed = liveFeed(controls);
    feed.onStatus('offline');
    expect(store.getState('arr').status).toBe('offline');
    expect(store.getFeedConnectionState()).toBe('offline');
    feed.onEvent(makeSnapshot('arr', T1, 100));
    feed.onStatus('reconnecting');
    expect(store.getState('arr').status).toBe('live');
    expect(store.getFeedConnectionState()).toBe('reconnecting');
    release();
    const store2 = freshStore();
    const release2 = store2.acquire('mrr');
    const feed2 = liveFeed(controls);
    feed2.onStatus('reconnecting');
    expect(store2.getState('mrr').status).toBe('loading');
    release2();
  });
});

describe('Realtime-Events', () => {
  it('neueres Event: snapshot gesetzt, Listener benachrichtigt', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    let calls = 0;
    const unsub = store.subscribe('arr', () => {
      calls += 1;
    });
    const feed = liveFeed(controls);
    feed.onEvent(makeSnapshot('arr', T1, 111));
    const state = store.getState('arr');
    expect(state.snapshot?.value).toBe(111);
    expect(state.status).toBe('live');
    expect(calls).toBe(1);
    unsub();
    release();
  });

  it('älteres Event: snapshot bleibt, kein Listener-Aufruf bei Duplikat', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    let calls = 0;
    const unsub = store.subscribe('arr', () => {
      calls += 1;
    });
    const feed = liveFeed(controls);
    const first = makeSnapshot('arr', T2, 200);
    feed.onEvent(first);
    expect(calls).toBe(1);
    feed.onEvent(makeSnapshot('arr', T1, 100));
    expect(store.getState('arr').snapshot?.value).toBe(200);
    expect(store.getState('arr').history.map((s) => s.value)).toEqual([100, 200]);
    calls = 0;
    feed.onEvent(first);
    expect(calls).toBe(0);
    unsub();
    release();
  });
});

describe('Ref-Counting und Release', () => {
  it('zwei acquire teilen einen Entry; erst zweites release räumt auf', () => {
    const store = freshStore();
    const release1 = store.acquire('arr');
    const release2 = store.acquire('arr');
    expect(controls.feedSubscribeCalls).toBe(1);
    release1();
    expect(controls.feed?.unsubscribeCalls ?? -1).toBe(0);
    expect(store.getState('arr').status).toBe('loading');
    release2();
    expect(controls.feed?.unsubscribeCalls ?? -1).toBe(1);
    expect(store.getState('arr').status).toBe('loading');
    expect(store.getState('arr').history).toEqual([]);
  });

  it('doppeltes release ist wirkungslos (idempotent)', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    release();
    release();
    expect(controls.feed?.unsubscribeCalls ?? -1).toBe(1);
  });

  it('Listener-Abo endet mit unsubscribe, danach keine Benachrichtigung', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    let calls = 0;
    const unsub = store.subscribe('arr', () => {
      calls += 1;
    });
    unsub();
    const feed = liveFeed(controls);
    feed.onEvent(makeSnapshot('arr', T1, 5));
    expect(calls).toBe(0);
    release();
  });
});

describe('refresh', () => {
  it('neuerer Wert: live + snapshot; null: live ohne Snapshot; reject: error', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    controls.latestImpl = () => Promise.resolve(makeSnapshot('arr', T1, 77));
    await store.refresh('arr');
    expect(store.getState('arr').snapshot?.value).toBe(77);
    expect(store.getState('arr').status).toBe('live');
    controls.latestImpl = () => Promise.resolve(null);
    await store.refresh('arr');
    expect(store.getState('arr').status).toBe('live');
    controls.latestImpl = () => Promise.reject(new Error('refresh boom'));
    await store.refresh('arr');
    expect(store.getState('arr').status).toBe('error');
    release();
  });

  it('Noops: unbekannte ID, fehlender Entry, unkonfiguriert', async () => {
    const store = freshStore();
    await store.refresh('nope-unknown-id');
    await store.refresh('arr');
    controls.configured = false;
    const release = store.acquire('mrr');
    await store.refresh('mrr');
    expect(store.getState('mrr').status).toBe('unconfigured');
    expect(controls.latestCalls).toEqual([]);
    release();
  });
});

// G33 FIX B — Rot-Nachweis aufgelöst: 60-s-Fenster, Re-acquire ohne Refetch.
it('B: Re-acquire nach Release — history ohne Refetch da (FIX)', async () => {
  const store = freshStore();
  const release1 = store.acquire('arr');
  const pending = controls.pendingHistory[0];
  if (!pending) throw new Error('kein History-Promise registriert');
  pending.resolve([makeSnapshot('arr', T1, 42)]);
  await flushMicrotasks();
  expect(store.getState('arr').history).toHaveLength(1);
  const fetchesBefore = controls.historyCalls.length;
  const feedSubsBefore = controls.feedSubscribeCalls;
  const feedBefore = liveFeed(controls);
  release1();
  expect(feedBefore.unsubscribeCalls).toBe(1);
  store.acquire('arr');
  expect(controls.feedSubscribeCalls).toBe(feedSubsBefore + 1);
  expect(controls.historyCalls.length).toBe(fetchesBefore);
  expect(store.getState('arr').history.length).toBeGreaterThan(0);
});

// G33 FIX A — Rot-Nachweis aufgelöst: History da → status live.
it('A: History da, Kanal stumm — status ist live (FIX)', async () => {
  const store = freshStore();
  const release = store.acquire('arr');
  const pending = controls.pendingHistory[0];
  if (!pending) throw new Error('kein History-Promise registriert');
  pending.resolve([makeSnapshot('arr', T1, 100)]);
  await flushMicrotasks();
  expect(store.getState('arr').history).toHaveLength(1);
  expect(store.getState('arr').status).toBe('live');
  release();
});

// G33 FIX C — Rot-Nachweis aufgelöst: getSnapshot referenzstabil.
it('C: getSnapshot existiert und ist referenzstabil (FIX)', () => {
  const store = freshStore();
  const release = store.acquire('arr');
  expect(store.getSnapshot).toBeTypeOf('function');
  expect('getSnapshot' in store).toBe(true);
  expect(store.getSnapshot('arr')).toBe(store.getSnapshot('arr'));
  release();
});

it('C: neue Referenz nach Änderung; stabiler Default ohne Entry', () => {
  const store = freshStore();
  expect(store.getSnapshot('mrr')).toBe(store.getSnapshot('mrr'));
  expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  const release = store.acquire('mrr');
  const before = store.getSnapshot('mrr');
  const feed = liveFeed(controls);
  feed.onEvent(makeSnapshot('mrr', T1, 1));
  const after = store.getSnapshot('mrr');
  expect(after).not.toBe(before);
  expect(store.getSnapshot('mrr')).toBe(after);
  expect(store.getEntryVersion('mrr')).toBeGreaterThan(0);
  expect(store.getEntryVersion('pipeline_sql')).toBe(0);
  release();
});

describe('Feed: ein Kanal für alle KPIs (G34)', () => {
  const ALL_IDS = [
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
    'pipeline_won',
  ];

  it('genau 1 Kanal bei 12 KPIs; unsubscribe erst nach letztem release', () => {
    const store = freshStore();
    const releases = ALL_IDS.map((id) => store.acquire(id));
    expect(controls.feedSubscribeCalls).toBe(1);
    expect(controls.feed?.unsubscribeCalls ?? -1).toBe(0);
    expect(controls.historyCalls).toHaveLength(12);
    for (const release of releases.slice(0, 11)) release();
    expect(controls.feed?.unsubscribeCalls ?? -1).toBe(0);
    const last = releases[11];
    if (!last) throw new Error('release fehlt');
    last();
    expect(controls.feed?.unsubscribeCalls).toBe(1);
  });

  it('Routing: nur der passende Entry ändert sich; fremde KPIs verworfen', () => {
    const store = freshStore();
    const releaseArr = store.acquire('arr');
    const releaseMrr = store.acquire('mrr');
    const feed = liveFeed(controls);
    feed.onEvent(makeSnapshot('mrr', T1, 5));
    expect(store.getState('mrr').snapshot?.value).toBe(5);
    expect(store.getState('arr').snapshot).toBeNull();
    expect(store.getState('arr').history).toEqual([]);
    feed.onEvent(makeSnapshot('pipeline_sql', T1, 7));
    expect(store.getState('pipeline_sql').snapshot).toBeNull();
    expect(store.getState('pipeline_sql').history).toEqual([]);
    releaseArr();
    releaseMrr();
  });

  it('getFeedConnectionState: Default offline, folgt dem Feed', () => {
    const store = freshStore();
    expect(store.getFeedConnectionState()).toBe('offline');
    const release = store.acquire('arr');
    const feed = liveFeed(controls);
    feed.onStatus('connecting');
    expect(store.getFeedConnectionState()).toBe('connecting');
    feed.onStatus('live');
    expect(store.getFeedConnectionState()).toBe('live');
    release();
  });
});
