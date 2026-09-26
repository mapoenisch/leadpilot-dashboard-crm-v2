import { Lightbulb, Target } from 'lucide-react';
import { IDEE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';
import { PageHero, Panel, ToneList } from '@/components/pageKit';

// 067I / G54: Echte Ideen-Seite statt WebP — genau eine h1,
// These als Absätze, Alleinstellungsmerkmale als Liste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-geschaeftsidee).
export function IdeaPage() {
  return (
    <div className="pk-page">
      <PageHero eyebrow="Unternehmen" title={IDEE.title} subtitle={IDEE.subtitle} />
      <DataState
        status={IDEE.paragraphs.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Geschäftsidee erfasst."
      >
        <Panel title="Problem & Lösung" icon={Lightbulb}>
          <div className="pk-prose">
            {IDEE.paragraphs.map((absatz) => (
              <p key={absatz}>{absatz}</p>
            ))}
          </div>
        </Panel>
        <Panel title="Alleinstellungsmerkmale" icon={Target} tone="orange">
          <ToneList items={IDEE.usps} tone="orange" marker="check" />
        </Panel>
      </DataState>
    </div>
  );
}
