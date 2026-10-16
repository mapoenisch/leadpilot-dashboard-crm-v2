import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FUNKTION } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import { Grid, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { ModulBild, type ModulBildArt } from '../components/ModulBild';
import '../produktSeiten.css';

// 067I / G54: Echte Funktions-Seite statt WebP — genau eine h1,
// Produktmodule als Abschnitte, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-produkt-funktionsweise).
// Auftrag 095 (Paket G2, Welle 2): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: vier Modulkarten, je mit 3D-Illustration (dekorativ, aria-hidden) und
// „Mehr erfahren“. Statt toter Bild-Buttons führt der Link zur passenden CRM-Seite.
const MODULE: Array<{ art: ModulBildArt; ziel: string; zielName: string }> = [
  { art: 'capture', ziel: '/crm/leads', zielName: 'Leads & Kontakte' },
  { art: 'scoring', ziel: '/product/performance', zielName: 'Produkt-Performance' },
  { art: 'nurturing', ziel: '/crm/activities', zielName: 'Aktivitäten' },
  { art: 'pipeline', ziel: '/crm/deals', zielName: 'Deal Pipeline' },
];

function FeaturesPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="product-features">
      <PageHero
        eyebrow="Produkt"
        title={FUNKTION.title}
        subtitle="Die Kernmodule der LeadPilot Plattform."
        pills={['Kernmodule', `${FUNKTION.modules.length} Module`]}
      />
      <DataState
        status={FUNKTION.modules.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Produktmodule erfasst."
      >
        <Grid cols="2">
          {FUNKTION.modules.map((modul, index) => {
            const ziel = MODULE[index % MODULE.length] ?? MODULE[0]!;
            return (
              <section
                key={modul.name}
                className="pd-modul"
                aria-labelledby={`modul-${String(index)}`}
                data-testid="produkt-modul"
              >
                <div className="pd-modul__text">
                  <h2 className="pd-modul__titel" id={`modul-${String(index)}`}>
                    {modul.name}
                  </h2>
                  <p>{modul.desc}</p>
                  <Link
                    className="pd-mehr"
                    to={ziel.ziel}
                    aria-label={`Mehr erfahren: ${ziel.zielName}`}
                  >
                    <span className="pd-mehr__kreis" aria-hidden="true">
                      <ChevronRight size={20} />
                    </span>
                    Mehr erfahren
                  </Link>
                </div>
                <ModulBild art={ziel.art} />
              </section>
            );
          })}
        </Grid>
        <p className="pk-muted pd-hinweis">
          Die Illustrationen zeigen beispielhafte Werte, keine Kennzahlen.
        </p>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function FeaturesPage() {
  return (
    <ImagePage page="product-features">
      <FeaturesPageHtml />
    </ImagePage>
  );
}
