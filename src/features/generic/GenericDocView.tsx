import React from 'react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';

export interface GenericDocViewProps {
  viewId: string;
  title: string;
  categoryLabel: string;
}

const DOC_CONTENT: Record<string, { summary: string; bullets: string[]; alert?: string }> = {
  's-idee': {
    summary: 'LeadPilot ist die unkomplizierte B2B-Lead-Management-Software für den Mittelstand. Sie schließt die Lücke zwischen unübersichtlichen Excel-Listen und überdimensionierten Enterprise-CRMs.',
    bullets: [
      'Fokus auf blitzschnelle Einführung (< 1 Tag) ohne IT-Projekt.',
      'Integrierter Lead-Nurturing-Flow für unkontaktierte Leads.',
      'DSGVO-konformes Hosting in Deutschland.',
    ],
    alert: 'Geschäftsidee: Keine komplizierten Schulungen nötig — direkt nutzbar für Vertriebsleiter Volker.',
  },
  's-funktion': {
    summary: 'Produktarchitektur und intuitive Benutzeroberfläche zur automatischen Lead-Qualifizierung.',
    bullets: [
      'Automatischer Lead-Scoring-Algorithmus.',
      'Nahtlose E-Mail-Outreach-Sequenzen (4-Schritt Nurturing).',
      'Echtzeit-Pipeline-Dashboard für Geschäftsführung & Sales.',
    ],
  },
  's-swot': {
    summary: 'SWOT-Analyse der LeadPilot GmbH im DACH-Markt.',
    bullets: [
      'Stärken: Sehr hohe Bedienerfreundlichkeit, günstiges Starter-Pricing (49 €/Nutzer).',
      'Schwächen: Noch geringe Bekanntheit im Vergleich zu HubSpot.',
      'Chancen: Hoher Digitalisierungsdruck im deutschen Maschinenbau & Großhandel.',
      'Risiken: Aggressiver Preiskampf durch internationale Anbieter.',
    ],
  },
  's-okr': {
    summary: 'Strategische Jahresziele & OKRs 2026.',
    bullets: [
      'Objective 1: Erreichen von 650.000 € ARR bis Q4 2026.',
      'KR 1: Steigerung der Trial-to-Paid Rate von 18% auf 25%.',
      'KR 2: Reduzierung der Sales Response Time auf unter 1.5 Stunden.',
    ],
  },
  's-satzung': {
    summary: 'Rechtlicher Rahmen & Satzung der LeadPilot GmbH.',
    bullets: [
      'Stammkapital: 25.000 € (voll eingezahlt).',
      'Sitz der Gesellschaft: Leipzig (Augustusplatz 9).',
      'Handelsregister: Amtsgericht Leipzig HRB 40912.',
    ],
  },
};

export function GenericDocView({ viewId, title, categoryLabel }: GenericDocViewProps) {
  const content = DOC_CONTENT[viewId] || {
    summary: `Detailansicht für "${title}" im Bereich ${categoryLabel}. Alle Kennzahlen und Unternehmensdaten sind im LeadPilot System historisiert.`,
    bullets: [
      `Geprüfter Datenstand: LeadPilot Geschäftsjahr 2025/2026.`,
      `Konsistentes Datenmodell über alle 11 Unternehmensbereiche.`,
      `Bereit für automatische KI-Analysen & n8n-Workflow-Triggering.`,
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader
        eyebrow={categoryLabel}
        title={title}
        description={`LeadPilot Unternehmenswissen & Spezifikationen für ${title}.`}
        actions={<Badge variant="cyan">Unternehmenskontext</Badge>}
      />

      {content.alert && (
        <Alert variant="info" title="Domänen-Hinweis">
          {content.alert}
        </Alert>
      )}

      <Card featured>
        <h3 style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-primary)' }}>
          Zusammenfassung
        </h3>
        <p style={{ color: 'var(--color-text)', fontSize: '14.5px', lineHeight: 1.6 }}>
          {content.summary}
        </p>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--color-text)' }}>
          Kernaussagen & Parameter
        </h3>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {content.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
