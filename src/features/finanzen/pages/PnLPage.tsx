import { GUV, CHART_ERLOESE } from '@/domain/finanzenData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G52: Echte GuV-Seite statt WebP — genau eine h1, semantische Tabelle,
// auswählbarer Text, Chartzusammenfassung zur Erlösaufteilung.
export function PnLPage() {
  const rows = GUV.rows.map((row) => ({
    position: row[0] ?? '',
    fy2024: row[1] ?? '',
    fy2025: row[2] ?? '',
    plan2026: row[3] ?? '',
  }));
  const erloese = CHART_ERLOESE.labels.map((label, index) => ({
    label,
    value: CHART_ERLOESE.datasets[0]?.data[index] ?? 0,
    display: `${(CHART_ERLOESE.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} €`,
  }));
  const erloesBetrag = (index: number): string =>
    `${(CHART_ERLOESE.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const erloesSummary =
    `${CHART_ERLOESE.labels[0]} trägt mit ${erloesBetrag(0)} den größten Anteil, ` +
    `gefolgt von ${CHART_ERLOESE.labels[1]} mit ${erloesBetrag(1)} und ` +
    `${CHART_ERLOESE.labels[2]} mit ${erloesBetrag(2)}.`;
  return (
    <div>
      <h1>Gewinn- und Verlustrechnung</h1>
      <p>
        GuV der LeadPilot GmbH: FY 2024 und FY 2025 sind Ist-Werte, Plan 2026 ist die verabschiedete
        Planung. Alle Beträge in Euro.
      </p>
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine GuV-Positionen erfasst."
      >
        <section aria-label="GuV-Tabelle">
          <Table
            columns={[
              { key: 'position', label: GUV.headers[0] ?? 'Position (€)' },
              { key: 'fy2024', label: GUV.headers[1] ?? 'FY 2024' },
              { key: 'fy2025', label: GUV.headers[2] ?? 'FY 2025' },
              { key: 'plan2026', label: GUV.headers[3] ?? 'Plan 2026' },
            ]}
            rows={rows}
          />
        </section>
        <AccessibleChartSummary title="Erlösaufteilung FY 2025" summary={erloesSummary}>
          <ChartBarList items={erloese} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
