// Auftrag 079 (Gesamtabnahme, Befund beim Bau): Die persönliche Ansicht abonniert Live-Kennzahlen
// erst, wenn ihre Kachel nahe dem Sichtbereich ist (Lazy Loading). Der Kanal ist dann oft schon
// verbunden. Der Statuswechsel auf „live“ samt Nachladen des letzten Werts geschah aber nur beim
// Verbinden, für die zu diesem Zeitpunkt abonnierten Kennzahlen. Spät abonnierte blieben ohne
// Werte der letzten 30 Minuten dauerhaft auf „loading“, ein älterer letzter Wert kam nie an.
import { describe, it, expect } from 'vitest';
import { createLiveKpiStreamStore } from '../liveKpiStreamStore';
import type { LiveKpiSnapshot } from '../liveKpiReadAdapter';
import {
  createFakeAdapter,
  flushMicrotasks,
  liveFeed,
  makeSnapshot,
  type FakeAdapterControls,
} from './fakes';

const OLD = '2026-01-01T08:00:00.000Z';

function resolveLastHistory(controls: FakeAdapterControls, items: LiveKpiSnapshot[]) {
  const pending = controls.pendingHistory[controls.pendingHistory.length - 1];
  if (!pending) throw new Error('kein History-Promise registriert');
  pending.resolve(items);
}

function storeWithLiveFeed() {
  const { adapter, controls } = createFakeAdapter();
  const store = createLiveKpiStreamStore(adapter);
  store.acquire('arr');
  liveFeed(controls).onStatus('live');
  return { store, controls };
}

describe('Spätes Abonnement bei bereits verbundenem Kanal', () => {
  it('verlässt „loading“, auch ohne Werte der letzten 30 Minuten', async () => {
    const { store, controls } = storeWithLiveFeed();
    store.acquire('mrr');
    resolveLastHistory(controls, []);
    await flushMicrotasks();
    expect(store.getState('mrr').status).toBe('live');
    expect(store.getState('mrr').snapshot).toBeNull();
  });

  it('lädt den letzten Wert nach, auch wenn er älter als 30 Minuten ist', async () => {
    const { store, controls } = storeWithLiveFeed();
    controls.latestImpl = (kpiId) => Promise.resolve(makeSnapshot(kpiId, OLD, 42));
    store.acquire('mrr');
    resolveLastHistory(controls, []);
    await flushMicrotasks();
    expect(controls.latestCalls).toContain('mrr');
    expect(store.getState('mrr').snapshot?.value).toBe(42);
    expect(store.getState('mrr').status).toBe('live');
  });

  it('bleibt vor dem Verbinden wie bisher auf „loading“ (kein vorzeitiges „live“)', async () => {
    const { adapter, controls } = createFakeAdapter();
    const store = createLiveKpiStreamStore(adapter);
    store.acquire('mrr');
    resolveLastHistory(controls, []);
    await flushMicrotasks();
    expect(store.getState('mrr').status).toBe('loading');
    expect(controls.latestCalls).not.toContain('mrr');
  });
});
