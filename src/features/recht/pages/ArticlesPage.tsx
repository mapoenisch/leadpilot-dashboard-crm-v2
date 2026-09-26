import { SATZUNG } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { KitTable, PageHero, Panel } from '@/components/pageKit';

// 067I / G52: Echte Satzungs-Seite statt WebP — genau eine h1, Paragraphen
// mit Regelungstext, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-satzung-leadpilot).
export function ArticlesPage() {
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
