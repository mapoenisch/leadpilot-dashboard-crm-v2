import { TOP10 } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';
import { Filter, Layers } from 'lucide-react';
import { Chip, KitTable, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../kundenSeiten.css';

// 067I / G53: Echte Top-Kunden-Seite statt WebP — genau eine h1,
// Referenzkunden als semantische Tabelle, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-top-10-kunden).
// Auftrag 099 (Paket G2, Welle 6): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Tabelle wie im
// Original ohne eigene Panel-Überschrift. Kunden, Branchen und ARR nach Faktenblatt v1.2 §14
// (D3: Pro-Kunden 17.520 / 18.780 / 20.040 €); das Original-WebP zeigt abweichende Namen und
// eine leere ARR-Spalte.
function TopCustomersPageHtml() {
  const rows = TOP10.rows.map((row) => ({
    kunde: <strong>{row[0] ?? ''}</strong>,
    branche: row[1] ?? '',
    mitarbeiter: <span className="pk-strong-tone">{row[2] ?? ''}</span>,
    paket: <Chip strong>{row[3] ?? ''}</Chip>,
    nutzer: <Chip tone="neutral">{row[4] ?? ''}</Chip>,
    arr: <strong>{row[5] ?? ''}</strong>,
  }));
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="customers-top10">
      <PageHero
        eyebrow="Kunden"
        title={TOP10.title}
        subtitle="Die wichtigsten B2B-Referenzkunden der LeadPilot GmbH."
        pills={['Key Accounts', 'Branchenzusammensetzung']}
        pillIcons={[Filter, Layers]}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Referenzkunden erfasst."
      >
        <section
          className="pk-panel"
          data-tone="cyan"
          data-flush="true"
          aria-label="Referenzkunden"
        >
          <KitTable
            caption="Referenzkundentabelle"
            columns={[
              { key: 'kunde', label: TOP10.headers[0] ?? 'Kunde' },
              { key: 'branche', label: TOP10.headers[1] ?? 'Branche' },
              { key: 'mitarbeiter', label: TOP10.headers[2] ?? 'Mitarbeiter' },
              { key: 'paket', label: TOP10.headers[3] ?? 'Paket' },
              { key: 'nutzer', label: TOP10.headers[4] ?? 'Nutzer' },
              { key: 'arr', label: TOP10.headers[5] ?? 'ARR', align: 'right' },
            ]}
            rows={rows}
          />
        </section>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function TopCustomersPage() {
  return (
    <ImagePage page="customers-top10">
      <TopCustomersPageHtml />
    </ImagePage>
  );
}
