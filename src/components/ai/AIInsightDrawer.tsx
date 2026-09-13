import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Alert } from '../ui/Alert';
import { simulationService } from '../../simulation/simulationService';

export interface AIInsightDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AIInsightDrawer({ open, onClose }: AIInsightDrawerProps) {
  const [loading, setLoading] = React.useState(false);
  const [analysisText, setAnalysisText] = React.useState<string | null>(null);

  if (!open) return null;

  const handleRunAnalysis = () => {
    setLoading(true);
    setAnalysisText(null);

    const leads = simulationService.getSimulationLeads();
    const deals = simulationService.getSimulationDeals();
    const simState = simulationService.getState();

    setTimeout(() => {
      setLoading(false);
      setAnalysisText(`
### 🤖 LeadPilot KI-Systemanalyse (Stand: ${new Date().toLocaleTimeString('de-DE')})

**1. Dashboard & Pipeline Status:**
- Aktuell befinden sich **${leads.length} Leads** in der Pipeline.
- **${leads.filter((l) => l.status === 'Hot').length} Leads** haben die Einstufung „Hot" erreicht und erfordern unverzügliche Kontaktaufnahme (SLA < 24h).
- Der aktuelle Jahresumsatz (ARR) liegt bei **${(simState.metrics?.liveARR ?? 43880).toLocaleString('de-DE')} €** über **${deals.length} aktive Abschlüsse**.

**2. Erkannten Muster & Anomalien:**
- **Kanal-Effizienz**: Der Kanal „Partner & Empfehlung" liefert die höchste Conversion-Rate bei minimalem CAC (492 €). Es wird empfohlen, Budget von Outbound E-Mail hierher umzuschichten.
- **Trial-to-Paid Bottleneck**: 26% der Nutzer brechen beim Onboarding-Schritt 2 ab. Ein automatisierter geführter Trial-Flow in n8n kann den ARR um ca. +90.000 € steigern.

**3. Handlungsempfehlungen:**
- [ ] Kontaktieren Sie **${leads.find((l) => l.status === 'Hot')?.contactName || 'Ari Chen'}** (${leads.find((l) => l.status === 'Hot')?.companyName || 'Northwind GmbH'}) — KI-Match mit Buyer Persona Volker liegt bei 96%.
- [ ] Aktivieren Sie die n8n-Automatisierung für automatische Erinnerungen nach 3 Tagen Inaktivität.
      `);
    }, 1200);
  };

  return (
    <div className="border-0 fixed top-0 right-0 bottom-0 w-[440px] flex flex-col border-l border-solid border-border bg-surface shadow-modal z-[900] p-[var(--space-5)]">
      <div className="border-0 flex items-center justify-between border-b border-solid border-border-soft mb-[var(--space-4)] pb-[12px]">
        <div className="flex items-center gap-[8px]">
          <Icon name="zap" size={20} color="var(--color-primary)" />
          <h3 className="m-0 font-display text-[18px] text-text">KI Dashboard-Assistent</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="bg-transparent border-0 text-[20px] cursor-pointer text-[var(--color-text-muted)]"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-[var(--space-4)]">
        <Alert variant="info" title="Echtzeit-KI Integration">
          Der KI-Assistent analysiert die Live-CRM-Datenbank und die Simulationsergebnisse, um
          Anomalien und Verkaufschancen zu identifizieren.
        </Alert>

        <Button variant="primary" fullWidth onClick={handleRunAnalysis} disabled={loading}>
          {loading ? 'KI analysiert Live-Daten...' : 'Analyse jetzt starten'}
        </Button>

        {analysisText && (
          <Card padding="var(--space-4)" style={{ background: 'var(--color-bg-deep)' }}>
            <div className="text-[13px] leading-[1.6] whitespace-pre-wrap text-text">
              {analysisText}
            </div>
          </Card>
        )}
      </div>

      <div className="border-0 text-center text-[11px] pt-[12px] border-t border-solid border-border-soft text-[var(--color-text-muted)]">
        Powered by LeadPilot Gemini AI Engine
      </div>
    </div>
  );
}
