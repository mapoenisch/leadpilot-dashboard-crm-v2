// Executive Dashboard V2 (Auftrag 173 / P16a §2.1):
// Abgleich V1 <-> V2 vor der Umstellung. Reine Logik ohne Netzwerk:
// Klassen, inhaltlicher Vergleich (Diff aus 165) und Aufbau der Übernahmekonfiguration.

import type { DashboardConfigV2 } from './dashboardConfigV2';
import { validateDashboardConfigV2 } from './dashboardConfigV2';
import { validateDashboardConfig } from './dashboardValidation';
import { migrateV1ToV2 } from './dashboardMigrationV1V2';
import { diffDashboardConfigsV2, type ConfigDiffEntry } from './dashboardConfigDiff';

export type RolloutClass = 'gleich' | 'v1_geaendert' | 'beide_geaendert' | 'keine_kopie' | 'nur_v2';
export type RolloutDecision = 'v1_uebernehmen' | 'v2_behalten' | 'spaeter';

export interface RolloutReconciliationRow {
  userId: string;
  email: string | null;
  orgRole: string | null;
  orgStatus: string | null;
  v1Revision: number | null;
  v1UpdatedAt: string | null;
  v1Config: unknown;
  v2DashboardId: string | null;
  v2Revision: number | null;
  v2UpdatedAt: string | null;
  v2Config: unknown;
  lastMigratedRevision: number | null;
  v2BaseRevision: number;
  klasse: RolloutClass;
  entscheidung: RolloutDecision | null;
  entscheidungV1Revision: number | null;
  entscheidungV2Revision: number | null;
  entschiedenAt: string | null;
  entschiedenVonEmail: string | null;
  /** null = keine Entscheidung; false = Revision hat sich seitdem geändert (verfallen). */
  entscheidungGueltig: boolean | null;
  /** Nur In-Memory-Dienst: Pilotkopie, für die entschieden wurde (Server prüft selbst). */
  entscheidungDashboardId?: string | null;
}

export const ROLLOUT_CLASS_LABEL: Record<RolloutClass, string> = {
  gleich: 'Gleich',
  v1_geaendert: 'Alter Editor geändert',
  beide_geaendert: 'Beide geändert',
  keine_kopie: 'Noch keine Pilotkopie',
  nur_v2: 'Nur neuer Editor',
};

export const ROLLOUT_CLASS_HINT: Record<RolloutClass, string> = {
  gleich: 'Der alte Stand ist seit der Kopie unverändert. Nichts zu entscheiden.',
  v1_geaendert:
    'Im alten Editor wurde nach dem Kopieren weitergearbeitet, der Pilot ist unbearbeitet.',
  beide_geaendert:
    'Alter Editor und Pilot wurden beide bearbeitet. Bitte bewusst entscheiden, welcher Stand gilt.',
  keine_kopie:
    'Die Pilotkopie entsteht beim ersten Öffnen des neuen Editors mit dem dann aktuellen alten Stand.',
  nur_v2: 'Es gibt keinen alten Stand. Der neue Editor ist die einzige Fassung.',
};

export const ROLLOUT_DECISION_LABEL: Record<RolloutDecision, string> = {
  v1_uebernehmen: 'Alten Stand übernommen',
  v2_behalten: 'Pilot behalten',
  spaeter: 'Später entscheiden',
};

/** Klassen, für die eine Entscheidung nötig ist, bevor umgestellt werden darf. */
export function needsDecision(row: RolloutReconciliationRow): boolean {
  // Verfallene Entscheidung zählt unabhängig von der Klasse als offen (Codex PR #219): z. B.
  // nach „Alten Stand übernehmen“ und anschließender Bearbeitung im Pilot (Klasse „gleich“).
  if (row.klasse === 'gleich')
    return row.entscheidung !== null && row.entscheidungGueltig === false;
  if (row.klasse !== 'v1_geaendert' && row.klasse !== 'beide_geaendert') return false;
  return row.entscheidung === null || row.entscheidung === 'spaeter' || !row.entscheidungGueltig;
}

/** Klassen, für die die Ansicht Entscheidungen anbietet (inkl. verfallener Entscheidung bei „gleich“). */
export function isDecidable(row: RolloutReconciliationRow): boolean {
  if (row.klasse === 'v1_geaendert' || row.klasse === 'beide_geaendert') return true;
  return row.klasse === 'gleich' && row.entscheidung !== null && row.entscheidungGueltig === false;
}

/** Spiegel der Server-Klassifizierung (dashboard_rollout_classify) für Tests und Vorschau. */
export function classifyRollout(input: {
  v1Revision: number | null;
  v2Revision: number | null;
  lastMigratedRevision: number | null;
  v2BaseRevision?: number | null;
}): RolloutClass | null {
  const hasV1 = input.v1Revision !== null;
  const hasV2 = input.v2Revision !== null;
  if (!hasV1 && hasV2) return 'nur_v2';
  if (hasV1 && !hasV2) return 'keine_kopie';
  if (!hasV1 || !hasV2) return null;
  if (input.v1Revision! <= (input.lastMigratedRevision ?? 0)) return 'gleich';
  if (input.v2Revision! <= (input.v2BaseRevision ?? 1)) return 'v1_geaendert';
  return 'beide_geaendert';
}

export type V1TranslationResult =
  { ok: true; config: DashboardConfigV2 } | { ok: false; reason: string };

/** Übersetzt die aktuelle V1-Konfiguration eines Nutzers für Vergleich und Übernahme. */
export function translateV1ForRow(row: RolloutReconciliationRow): V1TranslationResult {
  if (row.v1Revision === null) return { ok: false, reason: 'Kein alter Stand vorhanden.' };
  const v1 = validateDashboardConfig(row.v1Config);
  if (!v1.ok) return { ok: false, reason: 'Der alte Stand ist nicht lesbar.' };
  const current = readV2(row);
  const config = migrateV1ToV2(v1.config, {
    id: row.v2DashboardId ?? 'personal_dashboard_v2',
    title: current?.title ?? 'Executive Dashboard',
    ownerUserId: row.userId,
    organizationId: current?.organizationId ?? '',
    lastMigratedRevision: row.v1Revision,
  });
  return { ok: true, config };
}

function readV2(row: RolloutReconciliationRow): DashboardConfigV2 | null {
  if (row.v2Config === null || row.v2Config === undefined) return null;
  const checked = validateDashboardConfigV2(row.v2Config);
  return checked.ok ? checked.config : null;
}

export interface RolloutComparison {
  status: 'verglichen' | 'nicht_moeglich';
  reason?: string;
  diff: ConfigDiffEntry[];
  /** Lesbare Liste, z. B. „Kachel Umsatz neu im alten Editor“. */
  items: string[];
}

function tileOrder(config: DashboardConfigV2): string[] {
  return config.tiles.map((t) => t.id);
}

/**
 * Vergleicht die übersetzte V1-Konfiguration mit der V2-Kopie.
 * Richtung: alt = Pilot (V2), neu = alter Editor (V1).
 */
export function compareV1WithV2(row: RolloutReconciliationRow): RolloutComparison {
  const v2 = readV2(row);
  if (!v2) {
    return {
      status: 'nicht_moeglich',
      reason: 'Die Pilotkopie ist nicht lesbar.',
      diff: [],
      items: [],
    };
  }
  const translated = translateV1ForRow(row);
  if (!translated.ok) {
    return { status: 'nicht_moeglich', reason: translated.reason, diff: [], items: [] };
  }
  const v1 = translated.config;
  const diff = diffDashboardConfigsV2(v2, v1);
  const items: string[] = [];
  // Reine Positions-/Größenänderungen entstehen oft nur als Folge einer neuen Reihenfolge oder
  // Kachel; sie werden zu einer Zeile zusammengefasst, damit die inhaltlichen Punkte lesbar bleiben.
  let nurAnordnung = 0;
  for (const entry of diff) {
    const name =
      entry.bereich === 'dashboard' ? entry.label : `${bereichName(entry)} „${entry.label}“`;
    if (entry.art === 'hinzugefuegt') items.push(`${name} neu im alten Editor`);
    else if (entry.art === 'entfernt') items.push(`${name} nur im Pilot`);
    else if (entry.bereich === 'kachel' && entry.pfade.every((p) => p.pfad === 'layouts'))
      nurAnordnung += 1;
    else items.push(`${name} geändert (${entry.pfade.map((p) => pfadName(p.pfad)).join(', ')})`);
  }
  if (nurAnordnung > 0) {
    items.push(
      `Anordnung geändert (${nurAnordnung} ${nurAnordnung === 1 ? 'Kachel verschoben' : 'Kacheln verschoben'})`,
    );
  }
  const shared = tileOrder(v1).filter((id) => tileOrder(v2).includes(id));
  const sharedInV2 = tileOrder(v2).filter((id) => shared.includes(id));
  if (shared.join('|') !== sharedInV2.join('|')) items.push('Reihenfolge der Kacheln geändert');
  return { status: 'verglichen', diff, items };
}

function bereichName(entry: ConfigDiffEntry): string {
  return entry.bereich === 'kachel' ? 'Kachel' : 'Sektion';
}

const PFAD_NAMEN: Record<string, string> = {
  title: 'Titel',
  globalTimeframe: 'Zeitraum',
  globalPipeline: 'Pipeline',
  variables: 'Variablen',
  layouts: 'Position/Größe',
  presentation: 'Darstellung',
  query: 'Abfrage',
  catalogId: 'Kennzahl',
  displayOptions: 'Anzeige',
  threshold: 'Schwellenwert',
  thresholdRules: 'Schwellenwerte',
};

function pfadName(pfad: string): string {
  return PFAD_NAMEN[pfad] ?? pfad;
}
