import { HANDELSREGISTER } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { KitTable, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../rechtSeiten.css';

// 067I / G52: Echte Handelsregister-Seite statt WebP — genau eine h1,
// Registerdaten als Definitionsliste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (09-handelsregister).
// Auftrag 102 (Paket G2, Welle 9): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im
// Original-WebP Untertitel „Handelsregisterbekanntmachung.“ und zweispaltige Tabelle
// „Merkmal / Details“ ohne Panel-Überschrift. Vertretung nach Faktenblatt v1.2 §17 D4
// (jeweils einzelvertretungsberechtigt); das Original-WebP zeigt noch „gemeinsam“.
function CommercialRegisterPageHtml() {
  const rows = HANDELSREGISTER.details.map((detail) => ({
    merkmal: detail[0] ?? '',
    details: detail[1] ?? '',
  }));
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="legal-register">
      <PageHero
        eyebrow="Recht & Gründung"
        title={HANDELSREGISTER.title}
        subtitle="Handelsregisterbekanntmachung."
        pills={['Handelsregister B', 'Registerauszug']}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Registerdaten erfasst."
      >
        <section className="pk-panel" data-tone="cyan" data-flush="true" aria-label="Registerdaten">
          <KitTable
            caption="Handelsregisterdaten mit Merkmal und Details"
            leadColumn
            wrapText
            columns={[
              { key: 'merkmal', label: 'Merkmal' },
              { key: 'details', label: 'Details' },
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
export function CommercialRegisterPage() {
  return (
    <ImagePage page="legal-register">
      <CommercialRegisterPageHtml />
    </ImagePage>
  );
}
