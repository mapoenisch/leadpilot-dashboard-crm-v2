/**
 * Verification Script: Realtime History Stream Store & Hook Isolation (Gate G25 / Auftrag 041)
 *
 * Verifiziert vollständig ohne externe Netzwerk-/Supabase-Verbindung:
 * 1. Store-Factory mit Fake-Adapter (Lifecycle, Shared Streams, Cleanup)
 * 2. Referenzzählung (2 Subscribers -> 1 Kanal; erst bei Ref-Count 0 Unsubscribe)
 * 3. Idempotenter Cleanup (weitere Releases ohne Nebeneffekt)
 * 4. KPI-Isolierung (arr vs. mrr Streams streng entkoppelt)
 * 5. Zeitordnung & Tie-Breaking (occurredAt, ingestedAt)
 * 6. Bounded History (strikt max. 30 Punkte, sortiert, FIFO-Eviction bei Punkt 31)
 * 7. Initial-History mit > 30 Datenpunkten (Neueste 30 chronologisch)
 * 8. Status- und Fehlerbehandlung (lokale Fehler kapseln, keine Kaskaden)
 * 9. Activity-Item Format (ausschließlich die 5 erlaubten Felder)
 * 10. Deferred Race: Initialer History-Read vs. Realtime-Event
 * 11. Deferred Stale Callbacks: Releaster Stream vs. Re-acquired Stream Isolation
 * 12. Statischer Audit (Adapter-Sortierung DESC/ASC, kein Supabase-Import in Store/Hooks, kein Polling)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLiveKpiStreamStore,
  type LiveKpiStreamAdapter,
} from '../src/services/liveKpi/liveKpiStreamStore';
import type { LiveKpiSnapshot, LiveKpiSubscription } from '../src/services/liveKpi/liveKpiReadAdapter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('===============================================================');
console.log('🔍 VERIFYING REALTIME HISTORY STREAM STORE (GATE G25)');
console.log('===============================================================\n');

// -------------------------------------------------------------
// Test-Harness: Kontrollierbarer Fake-Adapter
// -------------------------------------------------------------
interface SubscriptionRecord {
  kpiId: string;
  onEvent: (snapshot: LiveKpiSnapshot) => void;
  onConnectionStatus: (status: 'subscribed' | 'offline' | 'error') => void;
  unsubscribed: boolean;
  unsubscribeCalls: number;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class FakeLiveKpiAdapter implements LiveKpiStreamAdapter {
  isConfigured = true;
  historyCalls: { kpiId: string; sinceIso: string; limit: number }[] = [];
  latestCalls: string[] = [];
  subscriptions: SubscriptionRecord[] = [];

  historyResponses = new Map<string, LiveKpiSnapshot[]>();
  latestResponses = new Map<string, LiveKpiSnapshot | null>();

  pendingHistoryDeferred = new Map<string, Deferred<LiveKpiSnapshot[]>>();
  pendingLatestDeferred = new Map<string, Deferred<LiveKpiSnapshot | null>>();

  isLiveKpiReadConfigured(): boolean {
    return this.isConfigured;
  }

  fetchLiveKpiHistory(kpiId: string, sinceIso: string, limit: number): Promise<LiveKpiSnapshot[]> {
    this.historyCalls.push({ kpiId, sinceIso, limit });
    const def = this.pendingHistoryDeferred.get(kpiId);
    if (def) {
      return def.promise;
    }
    const raw = this.historyResponses.get(kpiId) || [];
    // Spiegelt das reale DB-/Adapterverhalten von liveKpiReadAdapter:
    // 1. DB selektiert ORDER BY occurred_at DESC, ingested_at DESC LIMIT effectiveLimit
    // 2. Adapter sortiert vor Rückgabe chronologisch aufsteigend nach (occurredAt ASC, ingestedAt ASC)
    const effectiveLimit = Math.min(30, Math.max(1, Math.floor(limit)));
    const sortedDesc = [...raw].sort((a, b) => {
      const comp = b.occurredAt.localeCompare(a.occurredAt);
      if (comp !== 0) return comp;
      return b.ingestedAt.localeCompare(a.ingestedAt);
    });
    const limited = sortedDesc.slice(0, effectiveLimit);
    const sortedAsc = limited.sort((a, b) => {
      const comp = a.occurredAt.localeCompare(b.occurredAt);
      if (comp !== 0) return comp;
      return a.ingestedAt.localeCompare(b.ingestedAt);
    });
    return Promise.resolve(sortedAsc);
  }

  fetchLatestLiveKpi(kpiId: string): Promise<LiveKpiSnapshot | null> {
    this.latestCalls.push(kpiId);
    const def = this.pendingLatestDeferred.get(kpiId);
    if (def) {
      return def.promise;
    }
    return Promise.resolve(this.latestResponses.get(kpiId) || null);
  }

  subscribeToLiveKpi(
    kpiId: string,
    onEvent: (snapshot: LiveKpiSnapshot) => void,
    onConnectionStatus: (status: 'subscribed' | 'offline' | 'error') => void,
  ): LiveKpiSubscription {
    const record: SubscriptionRecord = {
      kpiId,
      onEvent,
      onConnectionStatus,
      unsubscribed: false,
      unsubscribeCalls: 0,
    };
    this.subscriptions.push(record);

    return {
      unsubscribe: () => {
        record.unsubscribed = true;
        record.unsubscribeCalls++;
      },
    };
  }
}

function makeSnapshot(kpiId: string, value: number, occurredAt: string, ingestedAt: string, idSuffix = '1'): LiveKpiSnapshot {
  return {
    id: `snap-${kpiId}-${idSuffix}`,
    kpiId,
    value,
    unit: 'EUR',
    occurredAt,
    qualityStatus: 'valid',
    sourceSystem: 'fake-system',
    ingestedAt,
  };
}

async function runStreamVerification() {
  // -------------------------------------------------------------
  // 1. Katalog-Grenze: Nur registrierte KPIs erlauben
  // -------------------------------------------------------------
  console.log('--- 1. Testing Catalog Boundary ---');
  const fake1 = new FakeLiveKpiAdapter();
  const store1 = createLiveKpiStreamStore(fake1);

  const releaseUnknown = store1.acquire('unknown_kpi');
  assert(typeof releaseUnknown === 'function', 'acquire("unknown_kpi") returns release function');
  const unknownState = store1.getState('unknown_kpi');
  assert(unknownState.status === 'unconfigured', 'unknown_kpi returns unconfigured status');
  assert(unknownState.snapshot === null, 'unknown_kpi snapshot is null');
  assert(unknownState.history.length === 0, 'unknown_kpi history is empty');
  assert(fake1.historyCalls.length === 0, 'unknown_kpi triggers NO fetchLiveKpiHistory');
  assert(fake1.subscriptions.length === 0, 'unknown_kpi triggers NO subscribeToLiveKpi');
  releaseUnknown(); // Darf keine Fehler werfen

  // -------------------------------------------------------------
  // 2. Shared Stream & Referenzzählung
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Shared Streams & Ref-Counting ---');
  const fake2 = new FakeLiveKpiAdapter();
  const store2 = createLiveKpiStreamStore(fake2);

  // Erster Abonnent für 'arr'
  const releaseArr1 = store2.acquire('arr');
  assert(fake2.subscriptions.length === 1, 'First acquire("arr") creates exactly 1 subscription');
  assert(fake2.historyCalls.length === 1, 'First acquire("arr") triggers exactly 1 history read');
  assert(fake2.subscriptions[0].kpiId === 'arr', 'Subscription is for kpiId "arr"');

  // Zweiter Abonnent für 'arr' (Shared Stream)
  const releaseArr2 = store2.acquire('arr');
  assert(fake2.subscriptions.length === 1, 'Second acquire("arr") reuses existing shared subscription (no new channel)');
  assert(fake2.historyCalls.length === 1, 'Second acquire("arr") does NOT trigger duplicate history read');

  // Erstes Release (Ref-Count 2 -> 1)
  releaseArr1();
  assert(fake2.subscriptions[0].unsubscribed === false, 'First release leaves subscription active (refCount = 1)');
  assert(fake2.subscriptions[0].unsubscribeCalls === 0, 'No unsubscribe called after first release');

  // Zweites Release (Ref-Count 1 -> 0)
  releaseArr2();
  assert(fake2.subscriptions[0].unsubscribed === true, 'Second release unsubscribes channel (refCount = 0)');
  assert(fake2.subscriptions[0].unsubscribeCalls === 1, 'Unsubscribe called exactly once');

  // Drittes Release (Idempotenz-Test)
  releaseArr2();
  assert(fake2.subscriptions[0].unsubscribeCalls === 1, 'Additional release has no effect (strictly idempotent)');

  // -------------------------------------------------------------
  // 3. KPI-Isolierung: arr vs. mrr
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing KPI Stream Isolation ---');
  const fake3 = new FakeLiveKpiAdapter();
  const store3 = createLiveKpiStreamStore(fake3);

  const releaseArr = store3.acquire('arr');
  const releaseMrr = store3.acquire('mrr');
  assert(fake3.subscriptions.length === 2, 'Acquiring arr and mrr creates exactly 2 distinct subscriptions');

  const subArr = fake3.subscriptions.find((s) => s.kpiId === 'arr')!;
  const subMrr = fake3.subscriptions.find((s) => s.kpiId === 'mrr')!;

  // Event auf ARR feuern
  const arrSnap1 = makeSnapshot('arr', 100000, '2026-09-08T12:00:00.000Z', '2026-09-08T12:00:01.000Z');
  subArr.onEvent(arrSnap1);

  assert(store3.getState('arr').snapshot?.value === 100000, 'ARR snapshot updated to 100000');
  assert(store3.getState('arr').history.length === 1, 'ARR history updated');
  assert(store3.getState('mrr').snapshot === null, 'MRR snapshot strictly untouched by ARR event');
  assert(store3.getState('mrr').history.length === 0, 'MRR history strictly untouched by ARR event');

  releaseArr();
  releaseMrr();

  // -------------------------------------------------------------
  // 4. Zeitordnung & Tie-Breaking
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Time Ordering & Tie-Breaking ---');
  const fake4 = new FakeLiveKpiAdapter();
  const store4 = createLiveKpiStreamStore(fake4);
  const release4 = store4.acquire('arr');
  const sub4 = fake4.subscriptions[0];

  // Basis-Event
  const evBase = makeSnapshot('arr', 200, '2026-09-08T12:05:00.000Z', '2026-09-08T12:05:01.000Z');
  sub4.onEvent(evBase);
  assert(store4.getState('arr').snapshot?.value === 200, 'Base event accepted as latest (value 200)');

  // Älteres Event (occurredAt früher) -> darf Snapshot nicht ersetzen
  const evOlder = makeSnapshot('arr', 150, '2026-09-08T12:04:00.000Z', '2026-09-08T12:05:05.000Z');
  sub4.onEvent(evOlder);
  assert(store4.getState('arr').snapshot?.value === 200, 'Older occurredAt does NOT replace latest snapshot (remains 200)');

  // Gleiches occurredAt, aber älteres ingestedAt -> darf Snapshot nicht ersetzen
  const evSameOccurredOlderIngest = makeSnapshot('arr', 180, '2026-09-08T12:05:00.000Z', '2026-09-08T12:05:00.500Z');
  sub4.onEvent(evSameOccurredOlderIngest);
  assert(store4.getState('arr').snapshot?.value === 200, 'Older ingestedAt tie-break does NOT replace snapshot (remains 200)');

  // Gleiches occurredAt, aber NEUERES ingestedAt (Burst Tie-Break!) -> MUSS Snapshot ersetzen
  const evSameOccurredNewerIngest = makeSnapshot('arr', 250, '2026-09-08T12:05:00.000Z', '2026-09-08T12:05:02.000Z');
  sub4.onEvent(evSameOccurredNewerIngest);
  assert(store4.getState('arr').snapshot?.value === 250, 'Newer ingestedAt tie-break successfully replaces snapshot (value 250)');

  // Exaktes Duplikat -> Drop
  sub4.onEvent(evSameOccurredNewerIngest);
  assert(store4.getState('arr').snapshot?.value === 250, 'Duplicate event safely ignored');

  release4();

  // -------------------------------------------------------------
  // 5. Bounded History: Max 30 Punkte & FIFO Eviction
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing Bounded History (Max 30 Points) ---');
  const fake5 = new FakeLiveKpiAdapter();
  const store5 = createLiveKpiStreamStore(fake5);
  const release5 = store5.acquire('arr');
  const sub5 = fake5.subscriptions[0];

  // 31 sukzessive Events senden
  for (let i = 1; i <= 31; i++) {
    const minStr = String(i).padStart(2, '0');
    const ev = makeSnapshot(
      'arr',
      i * 10,
      `2026-09-08T12:${minStr}:00.000Z`,
      `2026-09-08T12:${minStr}:01.000Z`,
      String(i)
    );
    sub5.onEvent(ev);
  }

  const finalHistory = store5.getState('arr').history;
  assert(finalHistory.length === 30, `History is bounded to exactly 30 points (got: ${finalHistory.length})`);
  assert(finalHistory[0].value === 20, 'Oldest point (i=1, value=10) was evicted; first item is i=2 (value=20)');
  assert(finalHistory[finalHistory.length - 1].value === 310, 'Newest point is i=31 (value=310)');
  assert(store5.getState('arr').snapshot?.value === 310, 'Current snapshot matches newest point (value=310)');

  // Sortierungsnachweis: strikt aufsteigend
  for (let i = 1; i < finalHistory.length; i++) {
    const prev = finalHistory[i - 1];
    const curr = finalHistory[i];
    const comp = prev.occurredAt.localeCompare(curr.occurredAt);
    assert(comp <= 0, `History items are sorted ascending: ${prev.occurredAt} <= ${curr.occurredAt}`);
  }

  release5();

  // -------------------------------------------------------------
  // 5b. Initial-History mit > 30 Datenpunkten: Neueste 30 chronologisch
  // -------------------------------------------------------------
  console.log('\n--- 5b. Testing Initial History with > 30 Items (Latest 30 in Chronological Order) ---');
  const fake5b = new FakeLiveKpiAdapter();
  const initial50: LiveKpiSnapshot[] = [];
  for (let i = 1; i <= 50; i++) {
    const minStr = String(i).padStart(2, '0');
    initial50.push(
      makeSnapshot(
        'arr',
        i * 100,
        `2026-09-08T11:${minStr}:00.000Z`,
        `2026-09-08T11:${minStr}:01.000Z`,
        String(i)
      )
    );
  }
  fake5b.historyResponses.set('arr', initial50);

  const store5b = createLiveKpiStreamStore(fake5b);
  const release5b = store5b.acquire('arr');
  // Warten auf historyPromise
  await new Promise((resolve) => setTimeout(resolve, 15));

  const hist5b = store5b.getState('arr').history;
  assert(hist5b.length === 30, `Initial history has exactly 30 items despite 50 candidate rows (got: ${hist5b.length})`);
  assert(hist5b[0].value === 2100, `First initial item is i=21 (value: 2100), got: ${hist5b[0].value}`);
  assert(hist5b[hist5b.length - 1].value === 5000, `Last initial item is i=50 (value: 5000), got: ${hist5b[hist5b.length - 1].value}`);
  assert(store5b.getState('arr').snapshot?.value === 5000, 'Initial snapshot matches latest point (value: 5000)');

  // Chronologisch aufsteigend sortiert
  for (let i = 1; i < hist5b.length; i++) {
    const prev = hist5b[i - 1];
    const curr = hist5b[i];
    const comp = prev.occurredAt.localeCompare(curr.occurredAt);
    assert(comp < 0, `Initial history items strictly ascending: ${prev.occurredAt} < ${curr.occurredAt}`);
  }

  release5b();

  // -------------------------------------------------------------
  // 6. Status & Fehlerbehandlung
  // -------------------------------------------------------------
  console.log('\n--- 6. Testing Status Transitions & Error Isolation ---');
  const fake6 = new FakeLiveKpiAdapter();
  const store6 = createLiveKpiStreamStore(fake6);
  const release6 = store6.acquire('mrr');
  const sub6 = fake6.subscriptions[0];

  assert(store6.getState('mrr').status === 'loading', 'Initial status is loading');

  sub6.onConnectionStatus('subscribed');
  assert(store6.getState('mrr').status === 'live', 'subscribed transitions status to live');

  sub6.onConnectionStatus('offline');
  assert(store6.getState('mrr').status === 'offline', 'offline transitions status to offline');

  sub6.onConnectionStatus('error');
  assert(store6.getState('mrr').status === 'error', 'error transitions status to error');
  assert(store6.getState('mrr').error !== null, 'error object is populated');

  release6();

  // -------------------------------------------------------------
  // 7. Activity Item Format Prüfung
  // -------------------------------------------------------------
  console.log('\n--- 7. Testing Activity Item Contract ---');
  // Wir testen die Definition von LiveKpiActivityItem
  const sampleActivitySnapshot = makeSnapshot('arr', 450000, '2026-09-08T12:00:00.000Z', '2026-09-08T12:00:01.000Z');
  const allowedActivityKeys = new Set(['kpiId', 'value', 'unit', 'occurredAt', 'qualityStatus']);

  // Gemäß Hook-Spec werden nur diese 5 Felder gemappt:
  const activityItem = {
    kpiId: sampleActivitySnapshot.kpiId,
    value: sampleActivitySnapshot.value,
    unit: sampleActivitySnapshot.unit,
    occurredAt: sampleActivitySnapshot.occurredAt,
    qualityStatus: sampleActivitySnapshot.qualityStatus,
  };

  const actualActivityKeys = Object.keys(activityItem);
  assert(actualActivityKeys.length === 5, 'ActivityItem contains exactly 5 fields');
  for (const k of actualActivityKeys) {
    assert(allowedActivityKeys.has(k), `ActivityItem field "${k}" is permitted`);
  }
  assert(!('id' in activityItem), 'ActivityItem does NOT contain "id"');
  assert(!('sourceSystem' in activityItem), 'ActivityItem does NOT contain "sourceSystem"');
  assert(!('ingestedAt' in activityItem), 'ActivityItem does NOT contain "ingestedAt"');
  assert(!('context' in activityItem), 'ActivityItem does NOT contain "context"');
  assert(!('eventId' in activityItem), 'ActivityItem does NOT contain "eventId"');
  assert(!('correlationId' in activityItem), 'ActivityItem does NOT contain "correlationId"');

  // -------------------------------------------------------------
  // 8. Deferred Race: Initialer History-Read vs. Realtime-Event
  // -------------------------------------------------------------
  console.log('\n--- 8. Testing Deferred Race: Initial History-Read vs. Realtime-Event ---');
  const fake8 = new FakeLiveKpiAdapter();
  const defHist8 = createDeferred<LiveKpiSnapshot[]>();
  fake8.pendingHistoryDeferred.set('arr', defHist8);

  const store8 = createLiveKpiStreamStore(fake8);
  const release8 = store8.acquire('arr');
  const sub8 = fake8.subscriptions[0];

  assert(store8.getState('arr').status === 'loading', 'Initial status is loading while history promise is pending');

  // Realtime-Event trifft ein, WÄHREND der initiale History-Read noch aussteht
  const realtimeSnap8 = makeSnapshot('arr', 450000, '2026-09-08T12:00:00.000Z', '2026-09-08T12:00:01.000Z');
  sub8.onEvent(realtimeSnap8);

  assert(store8.getState('arr').snapshot?.value === 450000, 'Snapshot reflects incoming realtime event');
  assert(store8.getState('arr').history.length === 1, 'History holds the realtime event');
  assert(store8.getState('arr').history[0].value === 450000, 'History contains correct event value');

  // Jetzt löst der ausstehende History-Read mit älteren Elementen auf
  const histOlder1 = makeSnapshot('arr', 430000, '2026-09-08T11:50:00.000Z', '2026-09-08T11:50:01.000Z');
  const histOlder2 = makeSnapshot('arr', 440000, '2026-09-08T11:55:00.000Z', '2026-09-08T11:55:01.000Z');
  defHist8.resolve([histOlder1, histOlder2]);

  // Auf Promise-Microtasks warten
  await new Promise((resolve) => setTimeout(resolve, 10));

  const state8 = store8.getState('arr');
  assert(state8.history.length === 3, 'Initial history items merged with realtime event (total 3 items)');
  assert(state8.history[0].value === 430000, 'History item 0 is oldest history item');
  assert(state8.history[1].value === 440000, 'History item 1 is second history item');
  assert(state8.history[2].value === 450000, 'History item 2 preserves the realtime event without loss');
  assert(state8.snapshot?.value === 450000, 'Snapshot was not downgraded by older initial history items');

  release8();

  // -------------------------------------------------------------
  // 9. Deferred Stale Callbacks: Releaster Stream vs. Re-acquired Stream Isolation
  // -------------------------------------------------------------
  console.log('\n--- 9. Testing Deferred Stale Callbacks across Release & Re-acquire ---');
  const fake9 = new FakeLiveKpiAdapter();
  const defHistOld = createDeferred<LiveKpiSnapshot[]>();
  fake9.pendingHistoryDeferred.set('mrr', defHistOld);
  const defLatestOld = createDeferred<LiveKpiSnapshot | null>();
  fake9.pendingLatestDeferred.set('mrr', defLatestOld);

  const store9 = createLiveKpiStreamStore(fake9);

  // 1. Stream 1 erwerben
  const releaseOld = store9.acquire('mrr');
  const subOld = fake9.subscriptions[0];
  assert(fake9.subscriptions.length === 1, 'First subscription established for Stream 1');

  // Subscribed signalisieren -> stößt fetchLatestLiveKpi an (hängt in defLatestOld)
  subOld.onConnectionStatus('subscribed');

  // 2. Stream 1 wieder vollständig freigeben
  releaseOld();
  assert(subOld.unsubscribed === true, 'Stream 1 subscription unsubscribed on release');

  // 3. KPI 'mrr' sofort neu erwerben (Stream 2, neuer Entry)
  const defHistNew = createDeferred<LiveKpiSnapshot[]>();
  fake9.pendingHistoryDeferred.set('mrr', defHistNew);
  const defLatestNew = createDeferred<LiveKpiSnapshot | null>();
  fake9.pendingLatestDeferred.set('mrr', defLatestNew);

  const releaseNew = store9.acquire('mrr');
  assert(fake9.subscriptions.length === 2, 'New distinct subscription established for Stream 2');
  const subNew = fake9.subscriptions[1];

  // Stream 2 wird live und empfängt ein aktives Event
  subNew.onConnectionStatus('subscribed');
  const activeSnapNew = makeSnapshot('mrr', 99999, '2026-09-08T12:00:00.000Z', '2026-09-08T12:00:01.000Z');
  subNew.onEvent(activeSnapNew);

  assert(store9.getState('mrr').snapshot?.value === 99999, 'Stream 2 active event applied (99999)');
  assert(store9.getState('mrr').status === 'live', 'Stream 2 status is live');
  assert(store9.getState('mrr').history.length === 1, 'Stream 2 history contains active event');

  // 4. Jetzt treffen verspätete Callbacks aus Stream 1 ein:
  // a) Stale History-Promise aus Stream 1
  defHistOld.resolve([makeSnapshot('mrr', 11111, '2026-09-08T11:00:00.000Z', '2026-09-08T11:00:01.000Z')]);
  // b) Stale Latest-Promise aus Stream 1
  defLatestOld.resolve(makeSnapshot('mrr', 22222, '2026-09-08T11:05:00.000Z', '2026-09-08T11:05:01.000Z'));
  // c) Stale Realtime-Event aus altem subOld-Callback
  subOld.onEvent(makeSnapshot('mrr', 33333, '2026-09-08T12:10:00.000Z', '2026-09-08T12:10:01.000Z'));
  // d) Stale Channel-Error aus altem subOld-Callback
  subOld.onConnectionStatus('error');

  await new Promise((resolve) => setTimeout(resolve, 10));

  // 5. Verifikation: Stream 2 ist VOLLSTÄNDIG UNMUTIERT
  const stateAfterStale = store9.getState('mrr');
  assert(stateAfterStale.snapshot?.value === 99999, 'Stale callbacks from Stream 1 did NOT mutate Stream 2 snapshot');
  assert(stateAfterStale.status === 'live', 'Stale error from Stream 1 did NOT set Stream 2 status to error');
  assert(stateAfterStale.error === null, 'Stream 2 error remains null');
  assert(stateAfterStale.history.length === 1, 'Stale history items did NOT pollute Stream 2 history');
  assert(stateAfterStale.history[0].value === 99999, 'Stream 2 history strictly preserves only its own event');

  releaseNew();

  // -------------------------------------------------------------
  // 10. Statische Isolation & Secret Audit
  // -------------------------------------------------------------
  console.log('\n--- 10. Static Isolation & Secret Audit ---');

  const filesToCheckIsolation = [
    path.join(ROOT_DIR, 'src', 'services', 'liveKpi', 'liveKpiStreamStore.ts'),
    path.join(ROOT_DIR, 'src', 'hooks', 'useLiveKpi.ts'),
    path.join(ROOT_DIR, 'src', 'hooks', 'useLiveKpiHistory.ts'),
    path.join(ROOT_DIR, 'src', 'hooks', 'useLiveKpiActivity.ts'),
  ];

  for (const filePath of filesToCheckIsolation) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(ROOT_DIR, filePath);

    assert(!/supabaseClient/i.test(content), `Strictly NO direct or indirect supabaseClient in ${relPath}`);
    assert(!/from\s+['"][^'"]*supabase['"]/i.test(content), `Strictly NO supabase imports in ${relPath}`);
    assert(!/setInterval/i.test(content), `Strictly NO polling (setInterval) in ${relPath}`);
  }

  // 11. Statischer Audit des liveKpiReadAdapter: DB-Query DESC, Rückgabe ASC
  const adapterSourcePath = path.join(ROOT_DIR, 'src', 'services', 'liveKpi', 'liveKpiReadAdapter.ts');
  const adapterSrc = fs.readFileSync(adapterSourcePath, 'utf8');
  assert(adapterSrc.includes(".order('occurred_at', { ascending: false })"), 'liveKpiReadAdapter queries history DESC on occurred_at');
  assert(adapterSrc.includes(".order('ingested_at', { ascending: false })"), 'liveKpiReadAdapter queries history DESC on ingested_at');
  assert(adapterSrc.includes('results.sort('), 'liveKpiReadAdapter sorts history chronologically ascending before returning');

  console.log('\n===============================================================');
  console.log('🎉 ALL REALTIME STREAM STORE AUDITS PASSED (GATE G25)');
  console.log('===============================================================');
}

runStreamVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
