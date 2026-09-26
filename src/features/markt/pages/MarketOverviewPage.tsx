import { MARKT } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';
import { KitTable, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G53: Echte Marktübersicht statt WebP — genau eine h1, auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-marktlage-dach).
function MarketOverviewPageHtml() {
  const eigeneZeile = MARKT.overview.findIndex((row) => row[0]?.startsWith('LeadPilot'));
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Markt & Wettbewerb"
        title={MARKT.title}
        subtitle="Marktpotenzial im DACH-Mittelstand."
        pills={['DACH B2B', 'Marktanalyse 2025']}
      />
      <DataState
        status={MARKT.overview.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Marktdaten erfasst."
      >
        <Panel
          title="Marktkennzahlen"
          subtitle="Marktvolumen, Marktanteile und digitale Reichweite der LeadPilot GmbH"
          flush
        >
          <KitTable
            caption="Marktkennzahlen DACH"
            leadColumn
            accentRows={eigeneZeile >= 0 ? [eigeneZeile] : []}
            columns={[
              { key: 'segment', label: 'Markt-Segment' },
              { key: 'daten', label: 'Potenzial & Daten' },
            ]}
            rows={MARKT.overview.map((row) => ({ segment: row[0] ?? '', daten: row[1] ?? '' }))}
          />
        </Panel>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function MarketOverviewPage() {
  return (
    <ImagePage page="market-dach">
      <MarketOverviewPageHtml />
    </ImagePage>
  );
}
