import { SATZUNG } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { KitTable, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G52: Echte Satzungs-Seite statt WebP — genau eine h1, Paragraphen
// mit Regelungstext, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-satzung-leadpilot).
function ArticlesPageHtml() {
  const rows = SATZUNG.sections.map((section) => ({
    paragraph: section[0] ?? '',
    inhalt: section[1] ?? '',
  }));
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Recht & Gründung"
        title={SATZUNG.title}
        subtitle="Die folgenden Paragraphen geben den Gesellschaftsvertrag auszugsweise wieder."
        pills={['Gesellschaftsvertrag', 'Satzungsauszug']}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Satzungsinhalte erfasst."
      >
        <Panel title="Paragraphen" flush>
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
        </Panel>
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
