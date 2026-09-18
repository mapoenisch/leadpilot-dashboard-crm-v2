import { KANAELE } from '@/domain/vertriebData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G53: Echte Kanalseite statt WebP — genau eine h1,
// Kanalvergleich als Tabelle, Marketing-CAC je Kanal mit Summary.
export function ChannelsPage() {
  const rows = KANAELE.rows.map((row) => ({
    kanal: row[0] ?? '',
    anteil: row[1] ?? '',
    neukunden: row[2] ?? '',
    index: row[3] ?? '',
    cac: row[4] ?? '',
    spend: row[5] ?? '',
    bewertung: row[6] ?? '',
  }));
  const cacWerte = KANAELE.chartRoi.labels.map((label, index) => ({
    label,
    value: KANAELE.chartRoi.datasets[0]?.data[index] ?? 0,
    display: `${(KANAELE.chartRoi.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} €`,
  }));
  const daten = KANAELE.chartRoi.datasets[0]?.data ?? [];
  const labels = KANAELE.chartRoi.labels;
  let guenstigst = 0;
  let teuerst = 0;
  daten.forEach((wert, index) => {
    if ((daten[guenstigst] ?? 0) > wert) guenstigst = index;
    if ((daten[teuerst] ?? 0) < wert) teuerst = index;
  });
  const euro = (index: number): string =>
    `${(daten[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const summary =
    `Günstigster Kanal ist ${labels[guenstigst]} mit ${euro(guenstigst)} Marketing-CAC, ` +
    `teuerster ist ${labels[teuerst]} mit ${euro(teuerst)}.`;
  return (
    <div>
      <h1>Kanalperformance</h1>
      <p>
        Akquisitionskanäle mit Anteil, Neukunden und {(KANAELE.chartRoi.datasets[0]?.label ?? 'Marketing-CAC').toLowerCase()}.
      </p>
      <DataState status={rows.length > 0 ? 'ready' : 'empty'} emptyText="Keine Kanaldaten erfasst.">
        <section aria-label="Kanalvergleich">
          <Table
            columns={[
              { key: 'kanal', label: KANAELE.headers[0] ?? 'Kanal' },
              { key: 'anteil', label: KANAELE.headers[1] ?? 'Anteil' },
              { key: 'neukunden', label: KANAELE.headers[2] ?? 'Neukunden' },
              { key: 'index', label: KANAELE.headers[3] ?? 'Index' },
              { key: 'cac', label: KANAELE.headers[4] ?? 'CAC' },
              { key: 'spend', label: KANAELE.headers[5] ?? 'Spend' },
              { key: 'bewertung', label: KANAELE.headers[6] ?? 'Bewertung' },
            ]}
            rows={rows}
          />
        </section>
        <AccessibleChartSummary
          title={KANAELE.chartRoi.datasets[0]?.label ?? 'Kanalvergleich'}
          summary={summary}
        >
          <ChartBarList items={cacWerte} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
