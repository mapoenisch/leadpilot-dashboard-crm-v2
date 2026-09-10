// G32-Charakterisierung: liveKpiStreamStore — Lifecycle/Races/Fehler (Teil 2).
// Gehört zu liveKpiStreamStore.vitest.ts (max-lines-Teilung). Gleicher Fake-Adapter.
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

describe('Race-Schutz: Entry nach Release ist tot', () => {
  it('History-Resolve nach Release wird ignoriert (kein Crash, kein State)', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    release();
    pending.resolve([makeSnapshot('arr', T1, 1)]);
    sub.onEvent(makeSnapshot('arr', T2, 2));
    sub.onStatus('subscribed');
    await flushMicrotasks();
    expect(store.getState('arr').history).toEqual([]);
    expect(store.getState('arr').snapshot).toBeNull();
  });

  it('History-Reject nach Release wird ignoriert', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    release();
    pending.reject(new Error('zu spät'));
    await flushMicrotasks();
    expect(store.getState('arr').status).toBe('loading');
  });

  it('fetchLatest-Resolve nach Release wird ignoriert', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    release();
    controls.latestImpl = () => Promise.resolve(makeSnapshot('arr', T1, 9));
    sub.onStatus('subscribed');
    await flushMicrotasks();
    expect(store.getState('arr').snapshot).toBeNull();
  });

  it('refresh nach Release ist wirkungslos', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    release();
    controls.latestImpl = () => Promise.resolve(makeSnapshot('arr', T1, 9));
    await store.refresh('arr');
    expect(store.getState('arr').snapshot).toBeNull();
  });
});

describe('Fehlerobjekt-Normalisierung (non-Error-Rejections)', () => {
  it('String-Reject in History/fetchLatest/refresh wird zu Error', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    pending.reject('nur ein String');
    await flushMicrotasks();
    expect(store.getState('arr').error).toBeInstanceOf(Error);

    const release2 = store.acquire('mrr');
    controls.latestImpl = () => Promise.reject('string-fehler');
    const sub = controls.subscriptions.find((s) => s.kpiId === 'mrr');
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onStatus('subscribed');
    await flushMicrotasks();
    expect(store.getState('mrr').error).toBeInstanceOf(Error);

    await store.refresh('mrr');
    expect(store.getState('mrr').error).toBeInstanceOf(Error);
    release();
    release2();
  });
});

describe('Sortier- und Merge-Feinheiten', () => {
  it('gleiche occurredAt: ingestedAt entscheidet (compareSnapshots-Tiebreak)', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    const early = makeSnapshot('arr', T1, 1);
    const late = { ...makeSnapshot('arr', T1, 2), ingestedAt: '2026-01-02T00:00:00.000Z' };
    pending.resolve([late, early]);
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.history.map((s) => s.value)).toEqual([1, 2]);
    expect(state.snapshot?.value).toBe(2);
    release();
  });

  it('History-Resolve behält neueren Live-Snapshot (kein Downgrade)', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(makeSnapshot('arr', T3, 300));
    const pending = controls.pendingHistory[0];
    if (!pending) throw new Error('kein History-Promise registriert');
    pending.resolve([makeSnapshot('arr', T1, 100)]);
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.snapshot?.value).toBe(300);
    expect(state.history.map((s) => s.value)).toEqual([100, 300]);
    release();
  });

  it('fetchLatest mit älterem Wert: Snapshot bleibt, History wächst', async () => {
    const store = freshStore();
    const release = store.acquire('arr');
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(makeSnapshot('arr', T3, 300));
    controls.latestImpl = () => Promise.resolve(makeSnapshot('arr', T1, 50));
    sub.onStatus('subscribed');
    await flushMicrotasks();
    const state = store.getState('arr');
    expect(state.snapshot?.value).toBe(300);
    expect(state.history.map((s) => s.value)).toEqual([50, 300]);
    release();
  });

  it('defekter Listener wirft: andere werden trotzdem benachrichtigt', () => {
    const store = freshStore();
    const release = store.acquire('arr');
    let good = 0;
    const unsubs = [
      store.subscribe('arr', () => {
        throw new Error('defekter Listener');
      }),
      store.subscribe('arr', () => {
        good += 1;
      }),
    ];
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(makeSnapshot('arr', T1, 1));
    expect(good).toBe(1);
    for (const u of unsubs) u();
    release();
  });
});

describe('getState/subscribe ohne Entry', () => {
  it('getState ohne acquire: frischer loading-Zustand (konfiguriert)', () => {
    const store = freshStore();
    const state = store.getState('pipeline_sql');
    expect(state.status).toBe('loading');
    expect(state.history).toEqual([]);
  });

  it('subscribe ohne acquire erzeugt Entry ohne Subscription', () => {
    const store = freshStore();
    let calls = 0;
    const unsub = store.subscribe('pipeline_sql', () => {
      calls += 1;
    });
    expect(controls.subscriptions).toEqual([]);
    const release = store.acquire('pipeline_sql');
    expect(calls).toBe(1);
    const sub = controls.subscriptions[0];
    if (!sub) throw new Error('keine Subscription registriert');
    sub.onEvent(makeSnapshot('pipeline_sql', T1, 7));
    expect(calls).toBe(2);
    unsub();
    release();
  });

  it('subscribe auf unbekannte ID ist Noop', () => {
    const store = freshStore();
    let calls = 0;
    const unsub = store.subscribe('nope-unknown-id', () => {
      calls += 1;
    });
    unsub();
    expect(calls).toBe(0);
  });

});
