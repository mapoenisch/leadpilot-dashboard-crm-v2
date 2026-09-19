import { HEADCOUNT } from '@/domain/organisationData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G55: Echte Headcount-Seite statt WebP — genau eine h1,
// Kapazitätstabelle plus FTE-Verlauf mit Summary, alles aus Domäne.
function formatFte(value: number): string {
  return `${value.toLocaleString('de-DE')} FTE`;
}

export function HeadcountPage() {
  const rows = HEADCOUNT.rows.map((row) => ({
    bereich: row[0] ?? '',
    fte: row[1] ?? '',
    besetzung: row[2] ?? '',
  }));
  const verlauf = HEADCOUNT.chart.labels.map((label, index) => ({
    label,
    value: HEADCOUNT.chart.datasets[0]?.data[index] ?? 0,
    display: formatFte(HEADCOUNT.chart.datasets[0]?.data[index] ?? 0),
  }));
  const labels = HEADCOUNT.chart.labels;
  const start = formatFte(HEADCOUNT.chart.datasets[0]?.data[0] ?? 0);
  const stand = formatFte(HEADCOUNT.chart.datasets[0]?.data[labels.length - 1] ?? 0);
  const ziel = HEADCOUNT.rows[HEADCOUNT.rows.length - 1]?.[1] ?? '';
  const summary =
    `${HEADCOUNT.chart.datasets[0]?.label} wächst von ${start} (${labels[0]}) ` +
    `auf ${stand} (${labels[labels.length - 1]}), Ziel ${ziel}.`;
  return (
    <div>
      <h1>Headcount-Entwicklung</h1>
      <p>Mitarbeiterkapazität je Bereich mit FTE-Verlauf seit Q1 2024.</p>
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Headcount-Daten erfasst."
      >
        <section aria-label="Kapazität je Bereich">
          <Table
            columns={[
              { key: 'bereich', label: 'Bereich' },
              { key: 'fte', label: 'Kapazität' },
              { key: 'besetzung', label: 'Besetzung' },
            ]}
            rows={rows}
          />
        </section>
        <AccessibleChartSummary
          title={HEADCOUNT.chart.datasets[0]?.label ?? 'FTE-Verlauf'}
          summary={summary}
        >
          <ChartBarList items={verlauf} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
