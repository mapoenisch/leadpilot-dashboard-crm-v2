import { SEGMENTE, REGIONEN, CHART_SEGMENT } from '@/domain/kundenData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G53: Echte Segmentseite statt WebP — genau eine h1,
// Branchen und Regionen als Tabellen, ARR-Verteilung mit Summary.
export function SegmentsPage() {
  const segmente = SEGMENTE.rows.map((row) => ({
    branche: row.branche,
    anteil: row.anteil,
    charakter: row.charakter,
  }));
  const regionen = REGIONEN.rows.map((row) => ({
    region: row.region,
    kunden: String(row.kunden),
    anteil: row.share,
    status: row.status,
  }));
  const verteilung = CHART_SEGMENT.labels.map((label, index) => ({
    label,
    value: CHART_SEGMENT.datasets[0]?.data[index] ?? 0,
    display: `${(CHART_SEGMENT.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} €`,
  }));
  const betrag = (index: number): string =>
    `${(CHART_SEGMENT.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const summary =
    `${CHART_SEGMENT.labels[0]} trägt mit ${betrag(0)} den größten ARR-Anteil, ` +
    `gefolgt von ${CHART_SEGMENT.labels[1]} mit ${betrag(1)} und ` +
    `${CHART_SEGMENT.labels[2]} mit ${betrag(2)}.`;
  return (
    <div>
      <h1>Kundensegmente</h1>
      <p>{SEGMENTE.title}: Branchenverteilung und regionale Streuung des Kundenbestands.</p>
      <DataState
        status={segmente.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Kundensegmente erfasst."
      >
        <section aria-label="Branchen">
          <h2>Branchen</h2>
          <Table
            columns={[
              { key: 'branche', label: 'Branche' },
              { key: 'anteil', label: 'Anteil' },
              { key: 'charakter', label: 'Charakter' },
            ]}
            rows={segmente}
          />
        </section>
        <section aria-label={REGIONEN.title}>
          <h2>{REGIONEN.title}</h2>
          <Table
            columns={[
              { key: 'region', label: REGIONEN.headers[0] ?? 'Region' },
              { key: 'kunden', label: REGIONEN.headers[1] ?? 'Kunden' },
              { key: 'anteil', label: REGIONEN.headers[2] ?? 'Anteil' },
              { key: 'status', label: REGIONEN.headers[3] ?? 'Status' },
            ]}
            rows={regionen}
          />
        </section>
        <AccessibleChartSummary
          title={CHART_SEGMENT.datasets[0]?.label ?? 'ARR-Verteilung'}
          summary={summary}
        >
          <ChartBarList items={verteilung} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
