import {
  BarChart3,
  Brain,
  FileText,
  FlaskConical,
  Link2,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { ROADMAP } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import { Chip, PageHero } from '@/components/pageKit';

// 067I / G54: Echte Roadmap-Seite statt WebP — genau eine h1,
// Releases als Abschnitte mit Quartal, Status und Beschreibung.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (10-releases-roadmap).
const ICONS: LucideIcon[] = [FileText, Brain, Link2, BarChart3, FlaskConical, Share2];

export function RoadmapPage() {
  const released = ROADMAP.releases.filter((release) => release.status === 'Released').length;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Produkt"
        title={ROADMAP.title}
        subtitle={`${String(ROADMAP.releases.length)} Releases, davon ${String(released)} ausgeliefert.`}
        asidePills={[`${ROADMAP.releases.length} Meilensteine`]}
      />
      <DataState
        status={ROADMAP.releases.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Roadmap-Einträge erfasst."
      >
        <ol className="pk-timeline">
          {ROADMAP.releases.map((release, index) => {
            const tone = release.status === 'Released' ? 'cyan' : 'orange';
            const Icon = ICONS[index % ICONS.length] ?? FileText;
            return (
              <li key={`${release.quarter}-${release.title}`} data-tone={tone}>
                <Chip tone={tone} strong>
                  {release.quarter}
                </Chip>
                <section
                  className="pk-feature pk-milestone"
                  data-tone={tone}
                  aria-label={`${release.quarter}: ${release.title}`}
                >
                  <span className="pk-icon" aria-hidden="true">
                    <Icon size={24} strokeWidth={2} />
                  </span>
                  <div className="pk-feature__body">
                    <h2 className="pk-feature__title pk-milestone__title">
                      {release.title} <Chip tone={tone}>{release.status}</Chip>
                    </h2>
                    <p className="pk-feature__text">{release.desc}</p>
                  </div>
                </section>
              </li>
            );
          })}
        </ol>
      </DataState>
    </div>
  );
}
