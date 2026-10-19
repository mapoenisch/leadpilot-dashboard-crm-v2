import { GESELLSCHAFTER } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { Chip, KitTable, Meter, PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../rechtSeiten.css';

// 067I / G52: Echte Gesellschafter-Seite statt WebP — genau eine h1,
// Gesellschafterliste als semantische Tabelle mit Summenzeile.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (08-gesellschafterliste).
// Auftrag 102 (Paket G2, Welle 9): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im
// Original-WebP Untertitel „Beteiligungsverhältnisse …“, Tabelle ohne Panel-Überschrift,
// Nennbeträge in Festbreitenschrift. Die Pille nennt das Stammkapital nach Kapitalerhöhung
// Q1 2024 (31.250 €, Faktenblatt v1.2 §1/§7); das Original-WebP zeigt noch 25.000 €.
const prozent = (text: string | undefined): number =>
  Number((text ?? '0').replace('%', '').replace(',', '.').trim()) || 0;

function ShareholdersPageHtml() {
  const rows = GESELLSCHAFTER.rows.map((row) => ({
    name: row[0] ?? '',
    anteil: <span className="rcht-betrag">{row[1] ?? ''}</span>,
    stimmen: (
      <span className="pk-meter-cell">
        <Chip strong>{row[2] ?? ''}</Chip>
        <Meter value={prozent(row[2])} />
      </span>
    ),
  }));
  const summenzeile = GESELLSCHAFTER.rows[GESELLSCHAFTER.rows.length - 1];
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="legal-shareholders">
      <PageHero
        eyebrow="Recht & Gründung"
        title="Gesellschafterliste"
        subtitle="Beteiligungsverhältnisse der LeadPilot GmbH."
        pills={['Gesellschafterliste', `Stammkapital ${summenzeile?.[1] ?? ''}`]}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Gesellschafter erfasst."
      >
        <section
          className="pk-panel"
          data-tone="cyan"
          data-flush="true"
          aria-label="Gesellschaftertabelle"
        >
          <KitTable
            caption="Gesellschafter mit Nennbetrag und Stimmrechtsanteil"
            leadColumn
            highlightRows={[rows.length - 1]}
            columns={[
              { key: 'name', label: GESELLSCHAFTER.headers[0] ?? 'Gesellschafter' },
              { key: 'anteil', label: GESELLSCHAFTER.headers[1] ?? 'Anteil' },
              { key: 'stimmen', label: GESELLSCHAFTER.headers[2] ?? 'Stimmen' },
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
export function ShareholdersPage() {
  return (
    <ImagePage page="legal-shareholders">
      <ShareholdersPageHtml />
    </ImagePage>
  );
}
