import { SEGMENTE, REGIONEN, CHART_SEGMENT } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, ColumnChart, KitTable, PageHero, Panel } from '@/components/pageKit';

// 067I / G53: Echte Segmentseite statt WebP — genau eine h1,
// Branchen und Regionen als Tabellen, ARR-Verteilung mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-kundensegmente).
export function SegmentsPage() {
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
  const betrag = (index: number): string => `${(daten[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const summary =
    `${CHART_SEGMENT.labels[0]} trägt mit ${betrag(0)} den größten ARR-Anteil, ` +
    `gefolgt von ${CHART_SEGMENT.labels[1]} mit ${betrag(1)} und ` +
    `${CHART_SEGMENT.labels[2]} mit ${betrag(2)}.`;
  return (
    <div className="pk-page">
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
            <ColumnChart
              labels={CHART_SEGMENT.labels}
              series={[{ name: 'ARR', values: daten }]}
              valueSuffix=" €"
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
