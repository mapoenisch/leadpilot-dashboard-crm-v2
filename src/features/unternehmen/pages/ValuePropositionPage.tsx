import { BarChart3, Clock, Zap, type LucideIcon } from 'lucide-react';
import { VALUE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';
import { Grid, PageHero, Panel, Quote } from '@/components/pageKit';

// 067I / G54: Echte Value-Proposition-Seite statt WebP — genau eine h1,
// Kernbotschaft plus Nutzenversprechen als Abschnitte.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-value-proposition).
const ICONS: LucideIcon[] = [BarChart3, Clock, Zap];

export function ValuePropositionPage() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Unternehmen"
        title={VALUE.title}
        subtitle="Positionierung der LeadPilot GmbH am B2B-Markt: Kernvorteile und Markenversprechen."
      />
      <DataState
        status={VALUE.coreBenefits.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Value Proposition erfasst."
      >
        <Quote>{VALUE.heroStatement}</Quote>
        <Grid cols="3">
          {VALUE.coreBenefits.map((nutzen, index) => (
            <Panel key={nutzen.title} title={nutzen.title} icon={ICONS[index % ICONS.length]}>
              <p className="pk-panel__text">{nutzen.desc}</p>
            </Panel>
          ))}
        </Grid>
      </DataState>
    </div>
  );
}
