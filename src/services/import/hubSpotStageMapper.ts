// 067H / G51 — HubSpot-Dealstage-Mapping (Design §10.2): Unbekannte Stages
// landen in Quarantäne und werden NIEMALS automatisch als LOST interpretiert.
// Tabelle als Spiegel von `tools/n8n/hubspot-stage-map.json` (dort liegt die
// n8n-Quellfassung; diese Datei ist die validierte TS-Fassung).

export type KnownDealStage =
  'LEAD' | 'QUALIFIED_LEAD' | 'PITCH_DEMO' | 'PROPOSAL' | 'CLOSING' | 'WON' | 'LOST';

export type MappedDealStage =
  { kind: 'known'; stage: KnownDealStage } | { kind: 'quarantined'; rawStage: string };

const STAGE_MAP: Record<string, KnownDealStage> = {
  appointmentscheduled: 'LEAD',
  qualifiedtobuy: 'QUALIFIED_LEAD',
  presentationscheduled: 'PITCH_DEMO',
  decisionmakerboughtin: 'PROPOSAL',
  contractsent: 'CLOSING',
  closedwon: 'WON',
  closedlost: 'LOST',
  'Termin vereinbart': 'LEAD',
  'Für Kauf qualifiziert': 'QUALIFIED_LEAD',
  'Präsentation vereinbart': 'PITCH_DEMO',
  'Entscheidungsträger hat zugestimmt': 'PROPOSAL',
  'Vertrag gesendet': 'CLOSING',
  'Abgeschlossen und gewonnen': 'WON',
  'Abgeschlossen und verloren': 'LOST',
  // Idempotenz: Bereits gemappte Stages (eingefrorene Dateien) passieren
  // unverändert — erneutes Mappen ist ein No-op, kein Quarantänefall.
  LEAD: 'LEAD',
  QUALIFIED_LEAD: 'QUALIFIED_LEAD',
  PITCH_DEMO: 'PITCH_DEMO',
  PROPOSAL: 'PROPOSAL',
  CLOSING: 'CLOSING',
  WON: 'WON',
  LOST: 'LOST',
};

export function mapDealStage(raw: unknown): MappedDealStage {
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  const known =
    STAGE_MAP[normalized] ?? (normalized ? STAGE_MAP[normalized.toLowerCase()] : undefined);
  if (known) return { kind: 'known', stage: known };
  return { kind: 'quarantined', rawStage: normalized };
}
