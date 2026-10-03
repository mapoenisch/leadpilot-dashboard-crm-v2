// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Leseschicht und Datentypen.
// Einheitliche Typen für den Datenzustand jeder Kachel. Keine Oberfläche, keine Speicherung.
import type { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import type { LiveKpiActivityItem } from '@/hooks/useLiveKpiActivity';
import type { CatalogEntry, SourceLayer } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';

export type TileDataState =
  | 'laden'
  | 'bereit'
  | 'keine_daten'
  | 'fehler'
  | 'offline'
  | 'veraltet'
  | 'nicht_konfiguriert'
  | 'nicht_verfuegbar';

export type TileOverview =
  | { kind: 'team_hr'; data: ReturnType<typeof getTeamHrSnapshot> }
  | { kind: 'roadmap'; data: ReturnType<typeof getRoadmapSnapshot> }
  | { kind: 'live_aktivitaet'; data: readonly LiveKpiActivityItem[] };

/** Kachel ohne aktiven Katalogeintrag: keine Metadaten erfinden. */
export interface UnavailableTileData {
  catalogId: string;
  state: 'nicht_verfuegbar';
  reason: 'katalog_unbekannt' | 'katalog_inaktiv';
  message: string;
}

export interface ResolvedTileData {
  catalogId: string;
  state: Exclude<TileDataState, 'nicht_verfuegbar'>;
  value: number | null; // Einzelwert/Verhältnis; null, wenn nicht vorhanden
  series: readonly { label: string; value: number }[] | null; // Kategorien, Anteile, Zeitreihe
  overview: TileOverview | null; // nur Übersichtskacheln (kind 'uebersicht')
  unit: string; // aus dem Katalog
  timeBasis: string; // aus dem Katalog; bei Live zusätzlich asOf
  asOf: string | null; // ISO-Zeitpunkt der Messung (Live: occurredAt), sonst null
  origin: { layer: SourceLayer; module: string; exportName: string; liveKpiId?: string };
  scope: 'stammdaten' | 'organisation' | 'organisationsuebergreifend';
  effectiveFilter: EffectiveTileFilter;
  quality?: 'degradiert'; // Live-Snapshot mit qualityStatus 'degraded'
  message?: string; // verständlicher Hinweis, keine technische Fehlermeldung
}

export type TileData = ResolvedTileData | UnavailableTileData;

export function resolveUnavailableTile(
  catalogId: string,
  entry?: CatalogEntry,
): UnavailableTileData {
  if (!entry) {
    return {
      catalogId,
      state: 'nicht_verfuegbar',
      reason: 'katalog_unbekannt',
      message: `Katalogeintrag "${catalogId}" ist unbekannt.`,
    };
  }
  return {
    catalogId,
    state: 'nicht_verfuegbar',
    reason: 'katalog_inaktiv',
    message: `Katalogeintrag "${catalogId}" ist nicht aktiv.`,
  };
}

export function getScopeForLayer(
  layer: SourceLayer,
): 'stammdaten' | 'organisation' | 'organisationsuebergreifend' {
  switch (layer) {
    case 'baseline':
      return 'stammdaten';
    case 'crm':
      return 'organisation';
    case 'live':
      return 'organisationsuebergreifend';
  }
}
