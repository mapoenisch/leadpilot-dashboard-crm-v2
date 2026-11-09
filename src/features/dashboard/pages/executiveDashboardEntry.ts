// Executive Dashboard, Aufträge 077/079/141: Einstieg unter `/dashboard`.
// Auftrag 141: Die bisherige Ansicht und der Rollout-Schalter sind entfernt;
// die persönliche Ansicht ist die einzige Variante und bleibt lazy.
import type { ComponentType } from 'react';
import { DashboardChunkError, DetailChunkError } from './DetailChunkError';

type PageModule = { default: ComponentType };

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
