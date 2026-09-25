import { AlertTriangle, Dumbbell, Rocket, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SWOT } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';
import { Grid, PageHero, Panel, ToneList, type Tone } from '@/components/pageKit';

// 067I / G53: Echte SWOT-Seite statt WebP — genau eine h1, vier Quadranten.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (03-swot-analyse).
const quadranten: Array<[string, string[], Tone, LucideIcon]> = [
  ['Stärken (Strengths)', SWOT.strengths, 'cyan', Dumbbell],
  ['Schwächen (Weaknesses)', SWOT.weaknesses, 'red', AlertTriangle],
  ['Chancen (Opportunities)', SWOT.opportunities, 'orange', Rocket],
  ['Risiken (Threats)', SWOT.threats, 'neutral', ShieldAlert],
];

export function SwotPage() {
  const ready = quadranten.some(([, items]) => items.length > 0);
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Markt & Wettbewerb"
        title={SWOT.title}
        subtitle="Stärken, Schwächen, Chancen und Risiken."
        pills={['Strategische Positionierung', '4 Dimensionen']}
      />
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine SWOT-Inhalte erfasst.">
        <Grid cols="2">
          {quadranten.map(([titel, items, tone, icon]) => (
            <Panel key={titel} title={titel} tone={tone} icon={icon} toneTitle={tone !== 'neutral'}>
              <ToneList items={items} tone={tone === 'neutral' ? 'neutral' : tone} />
            </Panel>
          ))}
        </Grid>
      </DataState>
    </div>
  );
}
