import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Alert } from '../ui/Alert';
import { simulationService } from '../../simulation/simulationService';
import { SimulationLead } from '@/types/simulation';

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '440px',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-modal)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="zap" size={20} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-text)' }}>
            KI Dashboard-Assistent
          </h3>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Alert variant="info" title="Echtzeit-KI Integration">
          Der KI-Assistent analysiert die Live-CRM-Datenbank und die Simulationsergebnisse, um Anomalien und Verkaufschancen zu identifizieren.
        </Alert>

        <Button variant="primary" fullWidth onClick={handleRunAnalysis} disabled={loading}>
          {loading ? 'KI analysiert Live-Daten...' : 'Analyse jetzt starten'}
        </Button>

        {analysisText && (
          <Card padding="var(--space-4)" style={{ background: 'var(--color-bg-deep)' }}>
            <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
              {analysisText}
            </div>
          </Card>
        )}
      </div>

      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--color-border-soft)', fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        Powered by LeadPilot Gemini AI Engine
      </div>
    </div>
  );
}
