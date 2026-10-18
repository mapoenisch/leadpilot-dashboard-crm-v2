import { MARKT } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';
import { KitTable, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G53: Echte Marktübersicht statt WebP — genau eine h1, auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-marktlage-dach).
// Auftrag 098 (Paket G2, Welle 5): sichtbar ausgeliefert (HTML_PAGES). Wie im Original nur die
// Tabelle, ohne eigene Panel-Überschrift; LeadPilot-Zeile orange. Marktzahlen sind in den
// Zeilen bereits als Europa bzw. Deutschland beschriftet, DACH bleibt Zielgebiet (Faktenblatt D6).
function MarketOverviewPageHtml() {
  const eigeneZeile = MARKT.overview.findIndex((row) => row[0]?.startsWith('LeadPilot'));
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="market-dach">
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
        <section
          className="pk-panel"
          data-tone="cyan"
          data-flush="true"
          aria-label="Marktkennzahlen"
        >
          <KitTable
            caption="Marktkennzahlen Europa, Deutschland und LeadPilot"
            leadColumn
            accentRows={eigeneZeile >= 0 ? [eigeneZeile] : []}
            columns={[
              { key: 'segment', label: 'Markt-Segment' },
              { key: 'daten', label: 'Potenzial & Daten' },
            ]}
            rows={MARKT.overview.map((row) => ({ segment: row[0] ?? '', daten: row[1] ?? '' }))}
          />
        </section>
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
