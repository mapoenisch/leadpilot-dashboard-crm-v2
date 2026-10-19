import { BarChart3, GraduationCap, Settings, Users, type LucideIcon } from 'lucide-react';
import { BSC } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { Chip, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../strategieSeiten.css';

// 067I / G52: Echte Balanced-Scorecard-Seite statt WebP — genau eine h1,
// vier Perspektiven mit Kennzahlen als Liste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-balanced-scorecard).
// Auftrag 101 (Paket G2, Welle 8): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im
// Original-WebP je Perspektive eine leuchtende Karte mit Markierung „Steuerung“ oben rechts.
const ICONS: LucideIcon[] = [BarChart3, Users, Settings, GraduationCap];

function BalancedScorecardPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="strategy-bsc">
      <PageHero
        eyebrow="Strategie"
        title={BSC.title}
        subtitle="Ausgewogene Steuerungskennzahlen."
        pills={['Balanced Scorecard', `${BSC.perspectives.length} Perspektiven`]}
      />
      <DataState
        status={BSC.perspectives.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Scorecard-Perspektiven erfasst."
      >
        <section aria-label="Perspektiven">
          <ul className="pk-grid str-bsc-grid" data-cols="2">
            {BSC.perspectives.map((perspective, index) => {
              const Icon = ICONS[index % ICONS.length] ?? BarChart3;
              return (
                <li key={perspective.name} className="pk-unit str-bsc-card" data-tone="cyan">
                  <span className="pk-icon" data-shape="round" aria-hidden="true">
                    <Icon size={24} strokeWidth={2} />
                  </span>
                  <div className="pk-unit__body">
                    <div className="str-bsc-card__head">
                      <h2 className="pk-unit__title pk-strong-tone">
                        {perspective.name} Perspektive
                      </h2>
                      <Chip tone="neutral">Steuerung</Chip>
                    </div>
                    <p className="pk-unit__text pk-unit__text--strong">{perspective.kpis}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function BalancedScorecardPage() {
  return (
    <ImagePage page="strategy-bsc">
      <BalancedScorecardPageHtml />
    </ImagePage>
  );
}
