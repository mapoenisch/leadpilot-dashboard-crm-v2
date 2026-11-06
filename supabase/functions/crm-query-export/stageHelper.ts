// Kanonische Phasen-Definitionen und Helfer für das CRM im LeadPilot Backend
export const DEAL_STAGE_GROUPS: readonly (readonly string[])[] = [
  [
    'Lead eingegangen',
    'LEAD',
    'lead',
    'appointmentscheduled',
    'APPOINTMENTSCHEDULED',
    'Termin vereinbart',
  ],
  [
    'Erstgespräch geführt',
    'QUALIFIED_LEAD',
    'qualified_lead',
    'qualifiedtobuy',
    'QUALIFIEDTOBUY',
    'Für Kauf qualifiziert',
  ],
  [
    'Bedarfsanalyse',
    'PITCH_DEMO',
    'pitch_demo',
    'presentationscheduled',
    'PRESENTATIONSCHEDULED',
    'Präsentation vereinbart',
  ],
  [
    'Angebot erstellt',
    'PROPOSAL',
    'proposal',
    'decisionmakerboughtin',
    'DECISIONMAKERBOUGHTIN',
    'Entscheidungsträger hat zugestimmt',
  ],
  [
    'Verhandlung',
    'CLOSING',
    'closing',
    'contractsent',
    'CONTRACTSENT',
    'Vertrag gesendet',
  ],
  [
    'Deal gewonnen',
    'WON',
    'won',
    'closedwon',
    'CLOSEDWON',
    'Abgeschlossen und gewonnen',
  ],
  [
    'Deal verloren',
    'LOST',
    'lost',
    'closedlost',
    'CLOSEDLOST',
    'Abgeschlossen und verloren',
  ],
];

/**
 * Liefert alle äquivalenten Phasenwerte für eine gegebene Phase,
 * z. B. für 'Deal gewonnen' -> ['Deal gewonnen', 'WON', 'won', 'closedwon', 'CLOSEDWON', 'Abgeschlossen und gewonnen'].
 * Falls keine Gruppe matcht, wird der ursprüngliche Wert als einziges Element zurückgegeben.
 */
export function getDealStageFilterVariants(val: string): string[] {
  const clean = val.trim().toLowerCase();
  for (const group of DEAL_STAGE_GROUPS) {
    if (group.some((s) => s.toLowerCase() === clean)) {
      return [...group];
    }
  }
  return [val];
}

/**
 * Normalisiert eine Phase auf das deutsche Standard-Label (group[0]), falls bekannt.
 */
export function normalizeCanonicalStage(stage?: string): string {
  if (!stage) return '';
  const clean = stage.trim().toLowerCase();
  for (const group of DEAL_STAGE_GROUPS) {
    if (group.some((s) => s.toLowerCase() === clean)) {
      return group[0];
    }
  }
  return stage;
}

/**
 * Liefert alle Rohwerte der Phasen, deren normalisiertes Label den Suchbegriff enthält.
 * Die Serversuche (ilike auf dem Rohwert) findet kanonische Werte wie 'WON' sonst nicht,
 * obwohl das Frontend sie als 'Deal gewonnen' anzeigt.
 */
export function getDealStageSearchVariants(term: string): string[] {
  const clean = term.trim().toLowerCase();
  if (!clean) return [];
  const out: string[] = [];
  for (const group of DEAL_STAGE_GROUPS) {
    if (group[0].toLowerCase().includes(clean)) out.push(...group);
  }
  return out;
}
