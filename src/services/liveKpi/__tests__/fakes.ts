// G32-Charakterisierung: Test-Helfer (kein Produktcode).
// G34: Fake-Adapter mit EINEM Feed-Handle (statt pro-KPI-Subscriptions).
// Deterministisch, keine Timer, kein Netzwerk.
import type {
  LiveKpiFeedConnectionState,
  LiveKpiSnapshot,
} from '../liveKpiReadAdapter';
import type {
  LiveKpiStreamAdapter,
  LiveKpiSubscription,
} from '../liveKpiStreamStore';

let snapshotSeq = 0;

export function makeSnapshot(
  kpiId: string,
  occurredAt: string,
  value = 100,
): LiveKpiSnapshot {
  snapshotSeq += 1;
  return {
    id: `snap-test-${snapshotSeq}`,
    kpiId,
    value,
    unit: 'EUR',
    occurredAt,
    qualityStatus: 'valid',
    sourceSystem: 'test',
    ingestedAt: `${occurredAt.slice(0, 10)}T00:00:00.000Z`,
  };
}

export interface FakeFeedHandle {
  onEvent: (snapshot: LiveKpiSnapshot) => void;
  onStatus: (status: LiveKpiFeedConnectionState) => void;
  unsubscribeCalls: number;
}

export interface FakeAdapterControls {
  configured: boolean;
  historyCalls: Array<{ kpiId: string; sinceIso: string; limit: number }>;
  pendingHistory: Array<{
    resolve: (value: LiveKpiSnapshot[]) => void;
    reject: (err: unknown) => void;
  }>;
  latestCalls: string[];
  latestImpl: (kpiId: string) => Promise<LiveKpiSnapshot | null>;
  feedSubscribeCalls: number;
  feed: FakeFeedHandle | null;
}

export function createFakeAdapter(): {
  adapter: LiveKpiStreamAdapter;
  controls: FakeAdapterControls;
} {
  const controls: FakeAdapterControls = {
    configured: true,
    historyCalls: [],
    pendingHistory: [],
    latestCalls: [],
    latestImpl: () => Promise.resolve(null),
    feedSubscribeCalls: 0,
    feed: null,
  };

  const adapter: LiveKpiStreamAdapter = {
    isLiveKpiReadConfigured: () => controls.configured,
    fetchLatestLiveKpi: (kpiId: string) => {
      controls.latestCalls.push(kpiId);
      return controls.latestImpl(kpiId);
    },
    fetchLiveKpiHistory: (kpiId: string, sinceIso: string, limit: number) => {
      controls.historyCalls.push({ kpiId, sinceIso, limit });
      return new Promise<LiveKpiSnapshot[]>((resolve, reject) => {
        controls.pendingHistory.push({ resolve, reject });
      });
    },
    subscribeToLiveKpiFeed: (
      onEvent: (snapshot: LiveKpiSnapshot) => void,
      onStatus: (status: LiveKpiFeedConnectionState) => void,
    ): LiveKpiSubscription => {
      controls.feedSubscribeCalls += 1;
      const handle: FakeFeedHandle = {
        onEvent,
        onStatus,
        unsubscribeCalls: 0,
      };
      controls.feed = handle;
      return {
        unsubscribe: () => {
          handle.unsubscribeCalls += 1;
        },
      };
    },
  };

  return { adapter, controls };
}

/** Feed-Handle holen (wirft, wenn kein Feed abonniert). */
export function liveFeed(controls: FakeAdapterControls): FakeFeedHandle {
  const feed = controls.feed;
  if (!feed) throw new Error('kein Feed abonniert');
  return feed;
}

/** Lässt ausstehende Promise-Ketten (Store-.then) ablaufen. */
export async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
  }
}
