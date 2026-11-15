// Auftrag 159 (P10a): kontrollierbarer Live-Zustand für die Vorschau und den Screenshot-Harness.
// Simuliert ausschließlich die Anzeige (verbunden, offline, nicht konfiguriert); es werden keine
// Daten eingespeist und keine echte Verbindung aufgebaut.
import type { LiveKpiSnapshot } from '@/services/liveKpi/liveKpiReadAdapter';
import type { LiveKpiFeedConnectionState } from '@/services/liveKpi/liveKpiReadAdapter';
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import type { LiveKpiStreamState, LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';

export type PreviewLiveScenario = 'verbunden' | 'offline' | 'nicht_konfiguriert';

export function parsePreviewLiveScenario(value: string | null): PreviewLiveScenario {
  if (value === 'offline') return 'offline';
  if (value === 'unconfigured' || value === 'nicht_konfiguriert') return 'nicht_konfiguriert';
  return 'verbunden';
}

export function createPreviewLiveStore(
  scenario: PreviewLiveScenario,
  now: Date = new Date(),
): LiveKpiStreamStore {
  const occurredAt = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const states = new Map<string, LiveKpiStreamState>();
  const feedState: LiveKpiFeedConnectionState =
    scenario === 'verbunden' ? 'live' : scenario === 'offline' ? 'offline' : 'offline';
  const listeners = new Set<() => void>();

  for (const definition of LIVE_KPI_DEFINITIONS) {
    const snapshot: LiveKpiSnapshot = {
      id: `preview-${definition.id}`,
      kpiId: definition.id,
      value: definition.format === 'ratio' ? 3.2 : definition.format === 'count' ? 12 : 250000,
      unit: definition.unit,
      occurredAt,
      qualityStatus: 'valid',
      sourceSystem: 'preview',
      ingestedAt: occurredAt,
    };
    states.set(definition.id, {
      snapshot: scenario === 'nicht_konfiguriert' ? null : snapshot,
      history: Object.freeze([]),
      status:
        scenario === 'nicht_konfiguriert'
          ? 'unconfigured'
          : scenario === 'offline'
            ? 'offline'
            : 'live',
      error: null,
    });
  }

  const emptyState: LiveKpiStreamState = {
    snapshot: null,
    history: Object.freeze([]),
    status: scenario === 'nicht_konfiguriert' ? 'unconfigured' : 'loading',
    error: null,
  };

  return {
    acquire: () => () => {},
    getState: (kpiId) => states.get(kpiId) ?? emptyState,
    getSnapshot: (kpiId) => states.get(kpiId) ?? emptyState,
    getServerSnapshot: () => emptyState,
    getEntryVersion: (kpiId) => (states.has(kpiId) ? 1 : 0),
    getFeedConnectionState: () => feedState,
    subscribeFeedConnection: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribe: () => () => {},
    refresh: async () => {},
    reset: () => {},
  };
}
