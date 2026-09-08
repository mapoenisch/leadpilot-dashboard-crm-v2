import { LeadStatus } from '../types/crm';
import { DeterministicRNG } from './prng';

export interface AIDecision {
  recommendedStatus: LeadStatus;
  scoreDelta: number;
  reason: string;
  suggestedAction: string;
}

const SAMPLE_REASONS = [
  { status: 'MQL' as LeadStatus, delta: 15, reason: 'ICP-Fit identifiziert: Maschinenbau-KMU mit 85 MA & Tabellen-Chaos.', action: 'Nurturing-Sequenz "Vertriebsleiter Volker" starten' },
  { status: 'Hot' as LeadStatus, delta: 25, reason: 'Testversion gestartet & Onboarding-Schritt 2 (Import) abgeschlossen.', action: 'Vertriebs-Call innerhalb von 24h anfordern' },
  { status: 'Won' as LeadStatus, delta: 30, reason: 'Vertragsangebot für Growth-Paket (89 €/Nutzer) akzeptiert.', action: 'Customer Success Onboarding initiieren' },
  { status: 'Disqualified' as LeadStatus, delta: -20, reason: 'Großkonzern mit > 500 MA — erfordert TISAX-Zertifizierung (Negative Fit).', action: 'Lead archivieren & Marketing-Nutzen dokumentieren' },
];

export class AIDecisionMaker {
  static evaluateLead(lead: { status: string; name?: string }, rng?: DeterministicRNG): AIDecision {
    const effectiveRng = rng ?? new DeterministicRNG(42);

    if (lead.status === 'New') {
      return {
        recommendedStatus: 'MQL',
        scoreDelta: 15,
        reason: 'Automatischer ICP-Match: Passt zu 94% auf Buyer Persona Volker (Mittelstand, DACH).',
        suggestedAction: 'Lead an Marc Pönisch zur Qualifizierung übergeben',
      };
    } else if (lead.status === 'MQL') {
      return {
        recommendedStatus: 'Hot',
        scoreDelta: 20,
        reason: 'Aktivitätssignal: Lead hat die LeadPilot Demo-Webseite 3x besucht & Whitepaper heruntergeladen.',
        suggestedAction: 'Prioritären Rückruf im Dashboard markieren',
      };
    } else if (lead.status === 'Hot') {
      return {
        recommendedStatus: 'Won',
        scoreDelta: 25,
        reason: 'Entscheider-Meeting mit Head of Sales erfolgreich. Budget genehmigt.',
        suggestedAction: 'Abschluss in CRM eintragen & Deal generieren',
      };
    }

    const random = effectiveRng.pick(SAMPLE_REASONS);
    return {
      recommendedStatus: random.status,
      scoreDelta: random.delta,
      reason: random.reason,
      suggestedAction: random.action,
    };
  }
}
