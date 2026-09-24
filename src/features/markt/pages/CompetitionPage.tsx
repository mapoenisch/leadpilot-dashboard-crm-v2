import { WETTBEWERB, CHART_WETTBEWERB } from '@/domain/marktData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G53: Echte Wettbewerbsseite statt WebP — genau eine h1,
// Anbietervergleich als semantische Tabelle, Marktanteile mit Summary.
function formatAnteil(value: number): string {
  return `${value.toLocaleString('de-DE')} %`;
}

export function CompetitionPage() {
  const rows = WETTBEWERB.rows.map((row) => ({
    anbieter: row[0] ?? '',
    anteil: row[1] ?? '',
    fokus: row[2] ?? '',
    schwachstelle: row[3] ?? '',
    differenzierung: row[4] ?? '',
  }));
  const anteile = CHART_WETTBEWERB.labels.map((label, index) => ({
    label,
    value: CHART_WETTBEWERB.datasets[0]?.data[index] ?? 0,
    display: formatAnteil(CHART_WETTBEWERB.datasets[0]?.data[index] ?? 0),
  }));
  const anteil = (index: number): string =>
    formatAnteil(CHART_WETTBEWERB.datasets[0]?.data[index] ?? 0);
  const summary =
    `${CHART_WETTBEWERB.labels[0]} führt mit ${anteil(0)}, ` +
    `gefolgt von ${CHART_WETTBEWERB.labels[1]} mit ${anteil(1)} und ` +
    `${CHART_WETTBEWERB.labels[2]} mit ${anteil(2)}.`;
  return (
    <div>
      <h1>Wettbewerbslandschaft</h1>
      <p>{WETTBEWERB.title}: Anbieter, Fokus und Differenzierung der LeadPilot GmbH.</p>
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Wettbewerbsdaten erfasst."
      >
        <section aria-label="Anbietervergleich">
          <Table
            columns={[
              { key: 'anbieter', label: WETTBEWERB.headers[0] ?? 'Anbieter' },
              { key: 'anteil', label: WETTBEWERB.headers[1] ?? 'Marktanteil' },
              { key: 'fokus', label: WETTBEWERB.headers[2] ?? 'Fokus' },
              { key: 'schwachstelle', label: WETTBEWERB.headers[3] ?? 'Schwachstelle' },
              { key: 'differenzierung', label: WETTBEWERB.headers[4] ?? 'Differenzierung' },
            ]}
            rows={rows}
          />
        </section>
        <AccessibleChartSummary
          title={CHART_WETTBEWERB.datasets[0]?.label ?? 'Marktanteil'}
          summary={summary}
        >
          <ChartBarList items={anteile} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
