import { FUNNEL } from '@/domain/vertriebData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G53: Echte Funnel-Seite statt WebP — genau eine h1,
// Trichterstufen als Tabelle, Quartalsreihen strukturiert, Hinweis aus Domäne.
export function FunnelPage() {
  const rows = FUNNEL.rows.map((row) => ({
    stufe: row[0] ?? '',
    q1: row[1] ?? '',
    q2: row[2] ?? '',
    q3: row[3] ?? '',
    q4: row[4] ?? '',
    fy: row[5] ?? '',
    schnitt: row[6] ?? '',
    conversion: row[7] ?? '',
  }));
  const reihen = FUNNEL.chart.datasets.map((dataset) => ({
    label: dataset.label,
    items: FUNNEL.chart.labels.map((label, index) => ({
      label,
      value: dataset.data[index] ?? 0,
      display: String(dataset.data[index] ?? 0),
    })),
  }));
  const leadsFy = FUNNEL.rows[0]?.[5] ?? '';
  const mqlFy = FUNNEL.rows[1]?.[5] ?? '';
  const sqlFy = FUNNEL.rows[2]?.[5] ?? '';
  const kundenFy = FUNNEL.rows[5]?.[5] ?? '';
  const summary =
    `Aus ${leadsFy} Leads werden ${mqlFy} MQLs und ${sqlFy} SQLs ` +
    `bis zu ${kundenFy} Neukunden im Geschäftsjahr.`;
  return (
    <div>
      <h1>Sales Funnel</h1>
      <p>
        Trichterstufen {FUNNEL.chart.labels.join(', ')}: von Leads bis Neukunden mit Conversion je
        Stufe.
      </p>
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Funnel-Daten erfasst."
      >
        <section aria-label="Trichtertabelle">
          <Table
            columns={[
              { key: 'stufe', label: FUNNEL.headers[0] ?? 'Stufe' },
              { key: 'q1', label: FUNNEL.headers[1] ?? 'Q1' },
              { key: 'q2', label: FUNNEL.headers[2] ?? 'Q2' },
              { key: 'q3', label: FUNNEL.headers[3] ?? 'Q3' },
              { key: 'q4', label: FUNNEL.headers[4] ?? 'Q4' },
              { key: 'fy', label: FUNNEL.headers[5] ?? 'FY' },
              { key: 'schnitt', label: FUNNEL.headers[6] ?? 'Schnitt' },
              { key: 'conversion', label: FUNNEL.headers[7] ?? 'Conversion' },
            ]}
            rows={rows}
          />
        </section>
        <AccessibleChartSummary title="Quartalsverlauf je Stufe" summary={summary}>
          {reihen.map((reihe) => (
            <section key={reihe.label} aria-label={reihe.label}>
              <h3>{reihe.label}</h3>
              <ChartBarList items={reihe.items} />
            </section>
          ))}
        </AccessibleChartSummary>
        <section aria-label={FUNNEL.note.title}>
          <h2>{FUNNEL.note.title}</h2>
          {FUNNEL.note.paragraphs.map((absatz) => (
            <p key={absatz}>{absatz}</p>
          ))}
        </section>
      </DataState>
    </div>
  );
}
