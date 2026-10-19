import { SATZUNG } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { KitTable, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../rechtSeiten.css';

// 067I / G52: Echte Satzungs-Seite statt WebP — genau eine h1, Paragraphen
// mit Regelungstext, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-satzung-leadpilot).
// Auftrag 102 (Paket G2, Welle 9): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im
// Original-WebP Untertitel „Gesellschaftsvertrag Auszug.“ und Tabelle ohne eigene
// Panel-Überschrift.
function ArticlesPageHtml() {
  const rows = SATZUNG.sections.map((section) => ({
    paragraph: section[0] ?? '',
    inhalt: section[1] ?? '',
  }));
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="legal-articles">
      <PageHero
        eyebrow="Recht & Gründung"
        title={SATZUNG.title}
        subtitle="Gesellschaftsvertrag Auszug."
        pills={['Gesellschaftsvertrag', 'Satzungsauszug']}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Satzungsinhalte erfasst."
      >
        <section
          className="pk-panel"
          data-tone="cyan"
          data-flush="true"
          aria-label="Satzungsparagraphen"
        >
          <KitTable
            caption="Satzungsparagraphen mit Inhalt und Regelung"
            leadColumn
            wrapText
            columns={[
              { key: 'paragraph', label: 'Paragraph' },
              { key: 'inhalt', label: 'Inhalt & Regelung' },
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
export function ArticlesPage() {
  return (
    <ImagePage page="legal-articles">
      <ArticlesPageHtml />
    </ImagePage>
  );
}
