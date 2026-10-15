import { BarChart3, Clock, Quote, Zap, type LucideIcon } from 'lucide-react';
import { VALUE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';
import { PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../unternehmenSeiten.css';

// 067I / G54: Echte Value-Proposition-Seite statt WebP — genau eine h1,
// Kernbotschaft plus Nutzenversprechen als Abschnitte.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-value-proposition).
// Auftrag 094 (Paket G2, Welle 1): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: Leucht-Zitat mit Anführungszeichen, drei Karten mit Icon links neben Titel
// und Text. „Ruhig“ dämpft Leuchten, entfernt nichts.
const ICONS: LucideIcon[] = [BarChart3, Clock, Zap];

function ValuePropositionPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="company-value-proposition">
      <PageHero
        eyebrow="Unternehmen"
        title={VALUE.title}
        subtitle="Kernvorteile und Markenversprechen."
      />
      <DataState
        status={VALUE.coreBenefits.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Value Proposition erfasst."
      >
        <blockquote className="us-zitat" data-testid="value-zitat">
          <Quote size={28} aria-hidden="true" />
          <p>{VALUE.heroStatement}</p>
        </blockquote>
        <div className="us-nutzen">
          {VALUE.coreBenefits.map((nutzen, index) => {
            const Icon = ICONS[index % ICONS.length] ?? BarChart3;
            return (
              <section
                key={nutzen.title}
                className="us-karte"
                data-tone="cyan"
                data-rahmen="leise"
                aria-label={nutzen.title}
                data-testid="value-nutzen"
              >
                <span className="us-icon" aria-hidden="true">
                  <Icon size={28} />
                </span>
                <div className="us-text">
                  <h2 className="us-titel">{nutzen.title}</h2>
                  <p>{nutzen.desc}</p>
                </div>
              </section>
            );
          })}
        </div>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function ValuePropositionPage() {
  return (
    <ImagePage page="company-value-proposition">
      <ValuePropositionPageHtml />
    </ImagePage>
  );
}
