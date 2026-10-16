import {
  BarChart3,
  ChevronRight,
  Database,
  Handshake,
  Rocket,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { HISTORIE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';
import { PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../unternehmenSeiten.css';

// 067I / G54: Echte Historien-Seite statt WebP — genau eine h1,
// Meilensteine als zeitlich geordnete Abschnitte.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-gruendung-entwicklung).
// Auftrag 094 (Paket G2, Welle 1): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: Zeitleiste mit Punkt und Datums-Chip, Karten mit Icon, Titel, Text und
// Pfeil-Kreis; Gründung und Produkt-Launch orange hervorgehoben. „Ruhig“ dämpft Leuchten.
const ICONS: LucideIcon[] = [Rocket, Handshake, Database, BarChart3, Trophy];

function HistoryPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="company-history">
      <PageHero
        eyebrow="Unternehmen"
        title={HISTORIE.title}
        subtitle="Gründung und Meilensteine der LeadPilot GmbH."
      />
      <DataState
        status={HISTORIE.events.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Historie erfasst."
      >
        <ol className="us-zeitleiste">
          {HISTORIE.events.map((ereignis, index) => {
            const Icon = ICONS[index % ICONS.length] ?? Rocket;
            const tone = ereignis.hervorgehoben ? 'orange' : 'cyan';
            return (
              <li key={`${ereignis.date}-${ereignis.title}`} data-tone={tone}>
                <span className="us-datum">{ereignis.date}</span>
                <section
                  className="us-karte us-ereignis"
                  data-tone={tone}
                  aria-label={`${ereignis.date}: ${ereignis.title}`}
                  data-testid="historie-ereignis"
                >
                  <span className="us-icon" aria-hidden="true">
                    <Icon size={28} />
                  </span>
                  <div className="us-text">
                    <h2 className="us-titel">{ereignis.title}</h2>
                    <p>{ereignis.desc}</p>
                  </div>
                  <span className="us-pfeil" aria-hidden="true">
                    <ChevronRight size={22} />
                  </span>
                </section>
              </li>
            );
          })}
        </ol>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function HistoryPage() {
  return (
    <ImagePage page="company-history">
      <HistoryPageHtml />
    </ImagePage>
  );
}
