// G32-Charakterisierung: liveKpiStreamStore (Ist-Verhalten, Fake-Adapter injiziert).
// Nutzt createLiveKpiStreamStore(fake) — nie den Singleton, nie vi.mock auf den Store.
import { describe, it, expect } from 'vitest';
import { createLiveKpiStreamStore } from '../liveKpiStreamStore';
import {
  createFakeAdapter,
  flushMicrotasks,
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
    expect(controls.subscriptions).toEqual([]);
    release();
  });

  it('unkonfiguriert: status unconfigured, kein Fetch, keine Subscription', () => {
    const store = freshStore();
    controls.configured = false;
    const release = store.acquire('arr');
    expect(store.getState('arr').status).toBe('unconfigured');
    expect(controls.historyCalls).toEqual([]);
    expect(controls.subscriptions).toEqual([]);
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
    expect(controls.subscriptions).toHaveLength(1);
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
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus('subscribed');
    await flushMicrotasks();
    expect(store.getState('arr').status).toBe('live');
    expect(controls.latestCalls).toEqual(['arr']);
    release();
  });

  it('fetchLatest liefert neueren Snapshot: snapshot + history aktualisiert', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    controls.latestImpl = () => Promise.resolve(makeSnapshot('arr', T2, 222));
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus('subscribed');
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.snapshot?.value).toBe(222);
    expect(state.history.map((s) => s.value)).toEqual([222]);
    release();
  });

  it('fetchLatest null: status live ohne Snapshot', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus('subscribed');
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
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus('subscribed');
    await flushMicrotasks();
    expect(store.getState('arr').status).toBe('error');
    release();
  });

  it('offline: status offline; error: status error mit Kanal-Meldung', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus('offline');
    expect(store.getState('arr').status).toBe('offline');
    sub.onStatus('error');
    const state = store.getState('arr');
    expect(state.status).toBe('error');
    expect(state.error?.message).toContain('arr');
    release();
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
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(makeSnapshot('arr', T1, 111));
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
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    const first = makeSnapshot('arr', T2, 200);
    sub.onEvent(first);
    expect(calls).toBe(1);
    sub.onEvent(makeSnapshot('arr', T1, 100));
    expect(store.getState('arr').snapshot?.value).toBe(200);
    expect(store.getState('arr').history.map((s) => s.value)).toEqual([100, 200]);
    calls = 0;
    sub.onEvent(first);
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
    expect(controls.subscriptions).toHaveLength(1);
    release1();
    expect(controls.subscriptions[0]?.unsubscribeCalls).toBe(0);
    expect(store.getState('arr').status).toBe('loading');
    release2();
    expect(controls.subscriptions[0]?.unsubscribeCalls).toBe(1);
    expect(store.getState('arr').status).toBe('loading');
    expect(store.getState('arr').history).toEqual([]);
  });

  it('doppeltes release ist wirkungslos (idempotent)', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    release();
    release();
    expect(controls.subscriptions[0]?.unsubscribeCalls).toBe(1);
  });

  it('Listener-Abo endet mit unsubscribe, danach keine Benachrichtigung', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    let calls = 0;
    const unsub = store.subscribe('arr', () => {
      calls += 1;
    });
    unsub();
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(makeSnapshot('arr', T1, 5));
    expect(calls).toBe(0);
    release();
  });
});

describe('refresh', () => {  it('neuerer Wert: live + snapshot; null: live ohne Snapshot; reject: error', async () => {
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
  const subsBefore = controls.subscriptions.length;
  release1();
  store.acquire('arr');
  expect(controls.historyCalls.length).toBe(fetchesBefore);
  expect(store.getState('arr').history.length).toBeGreaterThan(0);
  expect(controls.subscriptions.length).toBe(subsBefore + 1);
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
  const sub = controls.subscriptions[0];
  if (!sub) throw new Error('keine Subscription registriert');
  sub.onEvent(makeSnapshot('mrr', T1, 1));
  const after = store.getSnapshot('mrr');
  expect(after).not.toBe(before);
  expect(store.getSnapshot('mrr')).toBe(after);
  expect(store.getEntryVersion('mrr')).toBeGreaterThan(0);
  expect(store.getEntryVersion('pipeline_sql')).toBe(0);
  release();
});
