// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Einstieg unter `/dashboard` nach Rollout-Schalter.
// Beide Ansichten bleiben eigene Lazy-Chunks; mit ausgeschaltetem Schalter wird der Chunk der neuen
// Ansicht nie angefordert, und die bisherige Ansicht bleibt bis zur Gesamtabnahme erhalten.
import type { ComponentType } from 'react';
import { isPersonalDashboardEnabled } from '../model/dashboardRollout';
import { DashboardChunkError, DetailChunkError } from './DetailChunkError';

type PageModule = { default: ComponentType };

export const loadLegacyExecutiveDashboard = (): Promise<PageModule> =>
  import('@/features/overview/pages/ExecutiveDashboardPage').then((m) => ({
    default: m.ExecutiveDashboardPage,
  }));

export const loadPersonalExecutiveDashboard = (): Promise<PageModule> =>
  import('./PersonalExecutiveDashboard').then((m) => ({ default: m.PersonalExecutiveDashboard }));

/**
 * Fehlgeschlagenes Nachladen: Ersatzseite mit „Erneut laden“ statt einer festhängenden Route.
 * `React.lazy` hält eine abgelehnte Promise fest; nur ein Neuladen der Seite holt den Chunk erneut.
 */
export function withChunkFallback(
  load: () => Promise<PageModule>,
  fallback: ComponentType = DetailChunkError,
): () => Promise<PageModule> {
  return () => load().catch(() => ({ default: fallback }));
}

/** Persönliche Ansicht mit derselben Absicherung wie die Detailseite (Codex PR #61). */
export const loadPersonalWithFallback = withChunkFallback(
  loadPersonalExecutiveDashboard,
  DashboardChunkError,
);

export const loadTileDetailPage = withChunkFallback(() =>
  import('./DashboardTileDetailPage').then((m) => ({ default: m.DashboardTileDetailPage })),
);

export function executiveDashboardLoader(
  enabled: boolean = isPersonalDashboardEnabled(),
): () => Promise<PageModule> {
  return enabled ? loadPersonalWithFallback : loadLegacyExecutiveDashboard;
}
