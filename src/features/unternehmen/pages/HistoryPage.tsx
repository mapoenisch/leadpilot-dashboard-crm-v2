import { BarChart3, Database, Handshake, Rocket, Trophy, type LucideIcon } from 'lucide-react';
import { HISTORIE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';
import { Chip, PageHero, Panel } from '@/components/pageKit';

// 067I / G54: Echte Historien-Seite statt WebP — genau eine h1,
// Meilensteine als zeitlich geordnete Abschnitte.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-gruendung-entwicklung).
const ICONS: LucideIcon[] = [Rocket, Handshake, Database, BarChart3, Trophy];

export function HistoryPage() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Unternehmen"
        title={HISTORIE.title}
        subtitle="Gründung und Meilensteine der LeadPilot GmbH — von der Gründung bis zum zweiten Marktjahr."
      />
      <DataState
        status={HISTORIE.events.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Historie erfasst."
      >
        <ol className="pk-timeline">
          {HISTORIE.events.map((ereignis, index) => (
            <li key={`${ereignis.date}-${ereignis.title}`} data-tone="cyan">
              <Chip strong>{ereignis.date}</Chip>
              <Panel
                title={ereignis.title}
                label={`${ereignis.date}: ${ereignis.title}`}
                icon={ICONS[index % ICONS.length]}
              >
                <p className="pk-panel__text">{ereignis.desc}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </DataState>
    </div>
  );
}
