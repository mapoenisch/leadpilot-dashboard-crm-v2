import { CheckCircle2, XCircle } from 'lucide-react';
import { ICP } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';
import { Grid, KeyValueList, PageHero, Panel, ToneList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G53: Echte ICP-Seite statt WebP — genau eine h1,
// Firmografie als Definitionsliste, Trigger und Ausschlüsse als Listen.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-ideal-customer-profile).
function IcpPageHtml() {
  const ready = ICP.firmografie.length > 0;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Kunden"
        title={ICP.title}
        subtitle="Kriterien für den perfekten Kunden-Fit."
        pills={['Ideal Customer Profile', 'DACH B2B']}
      />
      <DataState
        status={ready ? 'ready' : 'empty'}
        emptyText="Kein Ideal Customer Profile erfasst."
      >
        <Panel title="Firmografische Kriterien" toneTitle>
          <KeyValueList rows={ICP.firmografie.map((item) => [item.key, item.value])} />
        </Panel>
        <Grid cols="2">
          <Panel title="Auslösende Trigger" icon={CheckCircle2} toneTitle>
            <ToneList items={ICP.triggers} />
          </Panel>
          <Panel title="Ausschlusskriterien (Negative Fit)" tone="red" icon={XCircle} toneTitle>
            <ToneList items={ICP.exclusion} tone="red" />
          </Panel>
        </Grid>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function IcpPage() {
  return (
    <ImagePage page="customers-icp">
      <IcpPageHtml />
    </ImagePage>
  );
}
