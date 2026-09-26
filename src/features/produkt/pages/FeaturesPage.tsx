import { Inbox, Kanban, Mail, Sparkles, type LucideIcon } from 'lucide-react';
import { FUNKTION } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import { Grid, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G54: Echte Funktions-Seite statt WebP — genau eine h1,
// Produktmodule als Abschnitte, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-produkt-funktionsweise).
const ICONS: LucideIcon[] = [Inbox, Sparkles, Mail, Kanban];

function FeaturesPageHtml() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Produkt"
        title={FUNKTION.title}
        subtitle={`Die ${FUNKTION.modules.length} Kernmodule der LeadPilot-Plattform.`}
        pills={['Kernmodule', `${FUNKTION.modules.length} Module`]}
      />
      <DataState
        status={FUNKTION.modules.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Produktmodule erfasst."
      >
        <Grid cols="2">
          {FUNKTION.modules.map((modul, index) => (
            <Panel key={modul.name} title={modul.name} icon={ICONS[index % ICONS.length]} toneTitle>
              <p className="pk-prose-lead">{modul.desc}</p>
            </Panel>
          ))}
        </Grid>
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
