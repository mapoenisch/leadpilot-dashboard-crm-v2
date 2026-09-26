import { Megaphone, Target, UserRound, Zap } from 'lucide-react';
import { PERSONA } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';
import { Grid, KeyValueList, PageHero, Panel, Quote, ToneList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G53: Echte Persona-Seite statt WebP — genau eine h1,
// Stammdaten als Definitionsliste, Ziele und Hürden als Listen.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-buyer-persona-volker).
function PersonaPageHtml() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Kunden"
        title={`Buyer Persona „${PERSONA.name}“`}
        subtitle="Entscheiderprofil im B2B-Mittelstand."
        pills={['Entscheiderprofil', PERSONA.role]}
      />
      <DataState status="ready" emptyText="Keine Persona erfasst.">
        <Panel
          title={PERSONA.name}
          toneTitle
          chip={`${String(PERSONA.age)} Jahre – ${PERSONA.role}`}
          chipTone="neutral"
        >
          <Quote>{PERSONA.quote}</Quote>
          <Grid cols="2">
            <Panel title="Ziele" icon={Target} toneTitle headingLevel={3}>
              <ToneList items={PERSONA.goals} />
            </Panel>
            <Panel
              title="Schmerzpunkte (Pain Points)"
              tone="red"
              icon={Zap}
              toneTitle
              headingLevel={3}
            >
              <ToneList items={PERSONA.painPoints} tone="red" />
            </Panel>
          </Grid>
        </Panel>
        <Grid cols="2">
          <Panel title="Stammdaten" icon={UserRound}>
            <KeyValueList
              rows={[
                ['Rolle', PERSONA.role],
                ['Unternehmen', PERSONA.companyType],
                ['Paket-Fit', PERSONA.packageFit],
              ]}
            />
          </Panel>
          <Panel title="Kanäle" tone="orange" icon={Megaphone}>
            <ToneList items={PERSONA.channels} tone="orange" />
          </Panel>
        </Grid>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function PersonaPage() {
  return (
    <ImagePage page="customers-persona">
      <PersonaPageHtml />
    </ImagePage>
  );
}
