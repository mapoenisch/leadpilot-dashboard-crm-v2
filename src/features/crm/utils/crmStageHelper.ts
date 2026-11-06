/**
 * crmStageHelper.ts
 * Zentrale Phasen-Definitionen, kanonische Mappings und Status-Helfer
 * für das LeadPilot CRM (Auftrag 129 / Codex-Review Runde 9).
 */

export const KANBAN_STAGES: readonly string[] = [
  'Lead eingegangen',
  'Erstgespräch geführt',
  'Bedarfsanalyse',
  'Angebot erstellt',
  'Verhandlung',
  'Deal gewonnen',
  'Deal verloren',
];

/**
 * Mapping kanonischer CRM-Deal-Stages (z. B. aus hubSpotStageMapper: KnownDealStage)
 * und geläufiger Import-Identifier auf die deutschen Standard-Labels.
 */
export const CANONICAL_STAGE_TO_LABEL: Record<string, string> = {
  LEAD: 'Lead eingegangen',
  QUALIFIED_LEAD: 'Erstgespräch geführt',
  PITCH_DEMO: 'Bedarfsanalyse',
  PROPOSAL: 'Angebot erstellt',
  CLOSING: 'Verhandlung',
  WON: 'Deal gewonnen',
  LOST: 'Deal verloren',
  // HubSpot & System-Identifier
  APPOINTMENTSCHEDULED: 'Lead eingegangen',
  QUALIFIEDTOBUY: 'Erstgespräch geführt',
  PRESENTATIONSCHEDULED: 'Bedarfsanalyse',
  DECISIONMAKERBOUGHTIN: 'Angebot erstellt',
  CONTRACTSENT: 'Verhandlung',
  CLOSEDWON: 'Deal gewonnen',
  CLOSEDLOST: 'Deal verloren',
};

/**
 * Normalisiert eine Phase. Falls ein kanonischer Identifier (z. B. WON, LOST, LEAD)
 * vorliegt, wird das deutsche Standard-Label zurückgegeben.
 * Andernfalls bleibt der Wert unverändert.
 */
export function normalizeCanonicalStageLabel(stage?: string): string {
  if (!stage) return '';
  const trimmed = stage.trim();
  const upper = trimmed.toUpperCase();
  return CANONICAL_STAGE_TO_LABEL[upper] ?? trimmed;
}

/**
 * Prüft, ob eine Phase einem gewonnenen Abschluss entspricht (z. B. 'Deal gewonnen', 'WON', 'closedwon').
 */
export function isWonStage(stage?: string): boolean {
  if (!stage) return false;
  const normalized = normalizeCanonicalStageLabel(stage).toLowerCase();
  const raw = stage.trim().toLowerCase();
  return (
    normalized.includes('gewonnen') ||
    raw === 'won' ||
    raw === 'closedwon' ||
    raw.includes('gewonnen')
  );
}

/**
 * Prüft, ob eine Phase einem verlorenen Abschluss entspricht (z. B. 'Deal verloren', 'LOST', 'closedlost').
 */
export function isLostStage(stage?: string): boolean {
  if (!stage) return false;
  const normalized = normalizeCanonicalStageLabel(stage).toLowerCase();
  const raw = stage.trim().toLowerCase();
  return (
    normalized.includes('verloren') ||
    raw === 'lost' ||
    raw === 'closedlost' ||
    raw.includes('verloren')
  );
}

/**
 * Prüft, ob eine Phase abgeschlossen ist (gewonnen oder verloren).
 */
export function isClosedStage(stage?: string): boolean {
  return isWonStage(stage) || isLostStage(stage);
}

/**
 * Erzeugt einen benutzer- und organisationsgebundenen Storage-Key für lokale Deal-Stage-Overrides.
 */
export function getDealStageOverridesStorageKey(
  organizationId?: string,
  userId?: string,
): string | null {
  if (!organizationId || !userId) return null;
  return `leadpilot_crm_deal_stage_overrides_${organizationId}_${userId}`;
}

/**
 * Liest gespeicherte Stage-Overrides für den übergebenen Storage-Key aus sessionStorage.
 */
export function readStageOverrides(storageKey: string | null): Record<string, string> {
  if (!storageKey || typeof window === 'undefined') return {};
  try {
    const s = sessionStorage.getItem(storageKey);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

/**
 * Schreibt Stage-Overrides sicher in sessionStorage.
 */
export function writeStageOverrides(
  storageKey: string | null,
  overrides: Record<string, string>,
): void {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(overrides));
  } catch {
    // SessionStorage nicht verfügbar / voll
  }
}
