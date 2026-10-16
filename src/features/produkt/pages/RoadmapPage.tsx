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
import { ImagePage } from '@/components/imagePage';
import { RoadmapBerg } from '../components/RoadmapBerg';
import '../produktSeiten.css';

// 067I / G54: Echte Roadmap-Seite statt WebP — genau eine h1,
// Releases als Abschnitte mit Quartal, Status und Beschreibung.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (10-releases-roadmap).
// Auftrag 095 (Paket G2, Welle 2): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: Zeitleiste links (geplante Releases orange, Version und Zeitraum zweizeilig),
// rechts die dekorative Berg-Illustration mit Pfad und Flagge (entfällt auf schmalen Breiten).
const ICONS: LucideIcon[] = [FileText, Brain, Link2, BarChart3, FlaskConical, Share2];

function RoadmapPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="product-roadmap">
      <PageHero
        eyebrow="Produkt"
        title={ROADMAP.title}
        subtitle="Chronologische Release-Historie und verbindliche Feature-Planung für 2026."
        asidePills={['Release-Historie & Planung 2026', `${ROADMAP.releases.length} Meilensteine`]}
      />
      <DataState
        status={ROADMAP.releases.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Roadmap-Einträge erfasst."
      >
        <div className="pd-roadmap">
          <ol className="pk-timeline">
            {ROADMAP.releases.map((release, index) => {
              const tone = release.status === 'Released' ? 'cyan' : 'orange';
              const Icon = ICONS[index % ICONS.length] ?? FileText;
              const [, version = release.quarter, zeitraum] =
                /^(\S+)\s+(\(geplant.*\))$/.exec(release.quarter) ?? [];
              return (
                <li key={`${release.quarter}-${release.title}`} data-tone={tone}>
                  <Chip tone={tone} strong>
                    <span className="pd-version">
                      {version}
                      {zeitraum ? <span>{zeitraum}</span> : null}
                    </span>
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
          <RoadmapBerg />
        </div>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function RoadmapPage() {
  return (
    <ImagePage page="product-roadmap">
      <RoadmapPageHtml />
    </ImagePage>
  );
}
