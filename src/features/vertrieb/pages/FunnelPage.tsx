import { TrendingUp } from 'lucide-react';
import { FUNNEL } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import { Callout, ChartFigure, Chip, KitTable, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { FunnelStufenChart } from '../components/FunnelStufenChart';
import { GroupedDepthColumns } from '../components/GroupedDepthColumns';

// 067I / G53: Echte Funnel-Seite statt WebP — genau eine h1,
// Trichterstufen als Tabelle, Quartalsreihen strukturiert, Hinweis aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-sales-funnel-2025).
// Auftrag 093 (Paket G1): als erste Seite sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: Trichter mit Stufen, Conversion-Chips und orangem Hebel, Quartalsverlauf als
// 3D-Säulen in den vier Reihenfarben, Tabelle mit Pills, Hinweis. „Ruhig“ (data-ruhig) dämpft
// Leuchten und Raster, entfernt sie aber nicht.
const zahl = (text: string | undefined): number =>
  Number((text ?? '0').replace(/\./g, '').replace(',', '.'));
// Auftrag 085: Jede Trichterstufe in ihrer eigenen Einheit (vorher überall „Leads“).
const stufenEinheit = ['Leads', 'MQL', 'SQL', 'Angebote', 'Neukunden'];
// Kurzname im Trichter wie im Original; Hebel an der SQL-Stufe wie im Original.
const stufenName = ['Leads gesamt', 'MQL', 'SQL', 'Angebote', 'Neukunden (Won)'];
const HEBEL_STUFE = 2;
// Herkunft und Stand der Zahlen (Codex PR #79): sichtbar im Seitenkopf.
const QUELLE = 'Faktenblatt v1.1 · Stand FY 2025 · fester Stand';
// Reihenfarben wie im Original-WebP: Leads silbern, MQL kräftiges Cyan, SQL helles Cyan,
// Neukunden orange (Reihenfolge wie FUNNEL.chart.datasets).
const QUARTAL_FARBEN = ['var(--funnel-silber)', '#00D9C6', '#62EDE2', '#FF7A3D'];

function FunnelPageHtml() {
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
    <div className="pk-page funnel-seite" data-ruhig="true" data-page-key="sales-funnel">
      <PageHero
        eyebrow="Vertrieb & Marketing"
        title="Sales Funnel 2025"
        subtitle={
          <>
            Conversion-Raten über alle Trichterstufen.
            <span className="funnel-quelle">{QUELLE}</span>
          </>
        }
        pills={['CRM Funnel 2025', 'Trichterstufen']}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Funnel-Daten erfasst."
      >
        <Panel
          title="Sales Pipeline Funnel Stufen (FY 2025)"
          badge="CRM Funnel 2025"
          subtitle="Durchlaufende Leads, Stufen-Conversion und Engpass-Erkennung"
        >
          <ChartFigure title="Trichterstufen" summary={summary}>
            <FunnelStufenChart
              stufen={stufen.map((row, index) => ({
                name: stufenName[index] ?? row[0] ?? '',
                count: zahl(row[5]),
                einheit: stufenEinheit[index] ?? '',
                hebel: index === HEBEL_STUFE ? 'Trial-Conversion Hebel' : undefined,
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
            <GroupedDepthColumns
              idPrefix="funnel-quartale"
              labels={FUNNEL.chart.labels}
              series={FUNNEL.chart.datasets.map((dataset, index) => ({
                name: dataset.label,
                values: dataset.data,
                color: QUARTAL_FARBEN[index] ?? dataset.color,
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

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function FunnelPage() {
  return (
    <ImagePage page="sales-funnel">
      <FunnelPageHtml />
    </ImagePage>
  );
}
