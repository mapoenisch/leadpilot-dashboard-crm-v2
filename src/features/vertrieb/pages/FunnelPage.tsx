import { TrendingUp } from 'lucide-react';
import { FUNNEL } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  Callout,
  ChartFigure,
  Chip,
  ColumnChart,
  KitTable,
  PageHero,
  Panel,
  type Tone,
} from '@/components/pageKit';

// 067I / G53: Echte Funnel-Seite statt WebP — genau eine h1,
// Trichterstufen als Tabelle, Quartalsreihen strukturiert, Hinweis aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-sales-funnel-2025).
const zahl = (text: string | undefined): number =>
  Number((text ?? '0').replace(/\./g, '').replace(',', '.'));
const reihenTon: Tone[] = ['neutral', 'cyan', 'mint', 'orange'];

export function FunnelPage() {
  const rows = FUNNEL.rows.map((row) => ({
    stufe: row[0] ?? '',
    q1: row[1] ?? '',
    q2: row[2] ?? '',
    q3: row[3] ?? '',
    q4: row[4] ?? '',
    fy: <strong>{row[5] ?? ''}</strong>,
    schnitt: <Chip strong>{row[6] ?? ''}</Chip>,
    conversion: <Chip strong>{row[7] ?? ''}</Chip>,
  }));
  // Trichter: Stufen ohne die Nebenkennzahl „Testversionen“ (Self-Service-Pfad).
  const stufen = FUNNEL.rows.filter((row) => !row[0]?.startsWith('Testversionen'));
  const leadsFy = FUNNEL.rows[0]?.[5] ?? '';
  const mqlFy = FUNNEL.rows[1]?.[5] ?? '';
  const sqlFy = FUNNEL.rows[2]?.[5] ?? '';
  const kundenFy = FUNNEL.rows[5]?.[5] ?? '';
  const summary =
    `Aus ${leadsFy} Leads werden ${mqlFy} MQLs und ${sqlFy} SQLs ` +
    `bis zu ${kundenFy} Neukunden im Geschäftsjahr.`;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Vertrieb & Marketing"
        title="Sales Funnel 2025"
        subtitle="Conversion-Raten über alle Trichterstufen."
        pills={['CRM Funnel 2025', 'Trichterstufen']}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Funnel-Daten erfasst."
      >
        <Panel
          title="Sales Pipeline Funnel Stufen (FY 2025)"
          badge="CRM Funnel 2025"
          subtitle="Durchlaufende Leads und Stufen-Conversion"
        >
          <ChartFigure title="Trichterstufen" summary={summary}>
            <BarList
              items={stufen.map((row, index) => ({
                label: `Stufe ${index + 1}: ${row[0] ?? ''}`,
                value: zahl(row[5]),
                display: `${row[5] ?? ''} Leads`,
                note: row[7] && row[7] !== '—' ? `(${row[7]})` : undefined,
                tone: index === 2 ? 'orange' : 'cyan',
              }))}
            />
          </ChartFigure>
        </Panel>
        <Panel
          title="Quartalsverlauf Funnel-Stufen 2025"
          badge="Quartalsbericht 2025"
          subtitle="Verteilung nach Leads, MQL, SQL und Neukunden je Quartal"
        >
          <ChartFigure
            title="Quartalsverlauf je Stufe"
            summary={`Leads steigen von ${FUNNEL.rows[0]?.[1] ?? ''} in Q1 auf ${FUNNEL.rows[0]?.[4] ?? ''} in Q4, Neukunden von ${FUNNEL.rows[5]?.[1] ?? ''} auf ${FUNNEL.rows[5]?.[4] ?? ''}.`}
          >
            <ColumnChart
              labels={FUNNEL.chart.labels}
              series={FUNNEL.chart.datasets.map((dataset, index) => ({
                name: dataset.label,
                values: dataset.data,
                tone: reihenTon[index] ?? 'cyan',
              }))}
            />
          </ChartFigure>
        </Panel>
        <Panel title="Trichtertabelle" flush>
          <KitTable
            caption="Trichterstufen je Quartal mit Jahreswert, Monatsschnitt und Conversion"
            leadColumn
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
        </Panel>
        <Callout
          title={FUNNEL.note.title}
          icon={TrendingUp}
          headingLevel={2}
          paragraphs={FUNNEL.note.paragraphs}
        />
      </DataState>
    </div>
  );
}
