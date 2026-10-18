import { SEGMENTE, REGIONEN, CHART_SEGMENT } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, KitTable, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { GroupedDepthColumns } from '@/features/vertrieb/components/GroupedDepthColumns';
import '../kundenSeiten.css';

// 067I / G53: Echte Segmentseite statt WebP — genau eine h1,
// Branchen und Regionen als Tabellen, ARR-Verteilung mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-kundensegmente).
// Auftrag 099 (Paket G2, Welle 6): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. ARR je Segment
// als 3D-Säulen wie im Original-WebP: Industrie cyan/hellcyan, Handel und Agenturen orange.
const FARBEN = [
  'var(--color-primary)',
  'color-mix(in srgb, var(--color-primary) 55%, white)',
  'var(--orange)',
  'color-mix(in srgb, var(--orange) 70%, white)',
];

function formatEuro(value: number): string {
  return `${value.toLocaleString('de-DE')} €`;
}

function SegmentsPageHtml() {
  const segmente = SEGMENTE.rows.map((row) => ({
    branche: <strong>{row.branche}</strong>,
    anteil: <Chip strong>{row.anteil}</Chip>,
    charakter: row.charakter,
  }));
  const regionen = REGIONEN.rows.map((row) => ({
    region: <strong>{row.region}</strong>,
    kunden: String(row.kunden),
    anteil: <Chip tone="neutral">{row.share}</Chip>,
    status: <Chip strong>{row.status}</Chip>,
  }));
  const daten = CHART_SEGMENT.datasets[0]?.data ?? [];
  const betrag = (index: number): string => formatEuro(daten[index] ?? 0);
  const summary =
    `${CHART_SEGMENT.labels[0]} trägt mit ${betrag(0)} den größten ARR-Anteil, ` +
    `gefolgt von ${CHART_SEGMENT.labels[1]} mit ${betrag(1)} und ` +
    `${CHART_SEGMENT.labels[2]} mit ${betrag(2)}.`;
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="customers-segments">
      <PageHero
        eyebrow="Kunden"
        title={SEGMENTE.title}
        subtitle="Branchen und Kundensegmente im Fokus."
        pills={['Kundensegmente', 'Kundenanalyse 2025']}
      />
      <DataState
        status={segmente.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Kundensegmente erfasst."
      >
        <Panel
          title="ARR nach Kundensegment"
          toneTitle
          badge="Kundenanalyse 2025"
          subtitle="Umsatzverteilung nach Industrie- und Dienstleistungssektoren"
        >
          <ChartFigure
            title={CHART_SEGMENT.datasets[0]?.label ?? 'ARR-Verteilung'}
            summary={summary}
          >
            <GroupedDepthColumns
              idPrefix="segment-arr"
              height={260}
              maxBarWidth={70}
              plotLeft={96}
              regionLabel="ARR je Kundensegment, waagerecht scrollbar"
              labels={CHART_SEGMENT.labels}
              series={[{ name: 'ARR', values: daten, color: FARBEN[0] ?? 'var(--color-primary)' }]}
              colorAt={(_, li) => FARBEN[li]}
              formatTick={(wert) => formatEuro(wert)}
              valueLabel={(wert) => formatEuro(wert)}
            />
          </ChartFigure>
        </Panel>
        <Panel title="Branchenverteilung" flush>
          <KitTable
            caption="Branchenverteilung mit Anteil und Charakteristik"
            columns={[
              { key: 'branche', label: 'Branche' },
              { key: 'anteil', label: 'Anteil' },
              { key: 'charakter', label: 'Charakteristik' },
            ]}
            rows={segmente}
          />
        </Panel>
        <Panel title={REGIONEN.title} flush>
          <KitTable
            caption={REGIONEN.title}
            columns={[
              { key: 'region', label: REGIONEN.headers[0] ?? 'Region' },
              { key: 'kunden', label: REGIONEN.headers[1] ?? 'Kunden' },
              { key: 'anteil', label: REGIONEN.headers[2] ?? 'Anteil' },
              { key: 'status', label: REGIONEN.headers[3] ?? 'Status' },
            ]}
            rows={regionen}
          />
        </Panel>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function SegmentsPage() {
  return (
    <ImagePage page="customers-segments">
      <SegmentsPageHtml />
    </ImagePage>
  );
}
