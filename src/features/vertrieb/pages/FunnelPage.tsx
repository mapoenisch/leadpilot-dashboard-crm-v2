import type { ReactNode } from 'react';
import { TrendingUp } from 'lucide-react';
import { FUNNEL } from '@/domain/vertriebData';
import { formatAnzahl } from '@/domain/funnelQuote';
import { DataState } from '@/components/ui/DataState';
import { Callout, ChartFigure, ColumnChart, KitTable, type Tone } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Depth3dBarChart } from '@/features/dashboard/components/charts/Depth3dBarChart';

// 067I / G53: Echte Funnel-Seite statt WebP — genau eine h1,
// Trichterstufen als Tabelle, Quartalsreihen strukturiert, Hinweis aus Domäne.
// Auftrag 093 (Paket G1): Gestaltung nach freigegebenem Muster 4 aus Auftrag 087 —
// 3D-Balken je Stufe plus Conversion-Tabelle aus derselben Quelle (FUNNEL.rows),
// als erste Seite per Seitenfreigabe (HTML_PAGES) sichtbar ausgeliefert.
const QUELLE = 'Faktenblatt v1.1 · Stand FY 2025 · fester Stand';
const zahl = (text: string | undefined): number =>
  Number((text ?? '0').replace(/\./g, '').replace(',', '.'));
const reihenTon: Tone[] = ['neutral', 'cyan', 'mint', 'orange'];
// Auftrag 085: Jede Trichterstufe in ihrer eigenen Einheit (vorher überall „Leads“).
const stufenEinheit = ['Leads', 'MQL', 'SQL', 'Angebote', 'Neukunden'];
const istNebenpfad = (stufe: string | undefined) => stufe?.startsWith('Testversionen') ?? false;

function Karte(props: { id: string; title: string; meta: string; children: ReactNode }) {
  const titleId = `funnel-${props.id}-titel`;
  return (
    <section
      aria-labelledby={titleId}
      data-testid={`funnel-${props.id}`}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-solid border-border bg-surface p-4"
    >
      <header className="flex min-w-0 flex-col gap-1">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Vertrieb
        </p>
        <h2
          id={titleId}
          className="m-0 break-words text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]"
        >
          {props.title}
        </h2>
        <p className="m-0 text-[12px] text-[var(--color-text-muted)] [overflow-wrap:anywhere]">
          {props.meta}
        </p>
      </header>
      {props.children}
    </section>
  );
}

function FunnelPageHtml() {
  const reducedMotion = useReducedMotion();
  const rows = FUNNEL.rows.map((row) => ({
    stufe: row[0] ?? '',
    q1: row[1] ?? '',
    q2: row[2] ?? '',
    q3: row[3] ?? '',
    q4: row[4] ?? '',
    fy: <strong>{row[5] ?? ''}</strong>,
    schnitt: row[6] ?? '',
    conversion: row[7] ?? '',
  }));
  // Trichter: Stufen ohne die Nebenkennzahl „Testversionen“ (Self-Service-Pfad).
  const stufen = FUNNEL.rows.filter((row) => !istNebenpfad(row[0]));
  const leadsFy = FUNNEL.rows[0]?.[5] ?? '';
  const mqlFy = FUNNEL.rows[1]?.[5] ?? '';
  const sqlFy = FUNNEL.rows[2]?.[5] ?? '';
  const kundenFy = FUNNEL.rows[5]?.[5] ?? '';
  const summary =
    `Aus ${leadsFy} Leads werden ${mqlFy} MQLs und ${sqlFy} SQLs ` +
    `bis zu ${kundenFy} Neukunden im Geschäftsjahr.`;
  return (
    <div className="pk-page flex flex-col gap-4" data-testid="funnel-html">
      <header className="flex flex-col gap-1">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Vertrieb · Funnel
        </p>
        <h1 className="m-0 text-[22px] font-semibold text-[var(--color-text-primary)]">
          Sales Funnel 2025
        </h1>
        <p className="m-0 text-[12px] text-[var(--color-text-muted)]">{QUELLE}</p>
      </header>
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Funnel-Daten erfasst."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
          <Karte id="stufen" title="Stufen im Geschäftsjahr" meta="Anzahl je Stufe, FY 2025">
            <Depth3dBarChart
              idPrefix="funnel-seite"
              data={stufen.map((row, index) => ({
                label: stufenEinheit[index] ?? row[0] ?? '',
                value: zahl(row[5]),
              }))}
              unit="Anzahl"
              period="FY 2025"
              title="Sales Funnel 2025"
              reducedMotion={reducedMotion}
              orientation="horizontal"
              formatValue={(value) => formatAnzahl(value)}
              stableLegend
            />
            <p className="m-0 text-[13px] text-[var(--color-text-primary)]">{summary}</p>
          </Karte>
          <Karte id="conversion" title="Conversion je Stufe" meta="Quote = Stufe / Vorstufe">
            {/* Bei großer Schrift scrollt nur die Tabelle, nicht die Seite. */}
            <div
              role="region"
              aria-label="Conversion-Tabelle"
              tabIndex={0}
              className="max-w-full overflow-x-auto"
            >
              <table className="w-full border-collapse text-[13px]">
                <caption className="sr-only">Trichterstufen mit Jahreswert und Conversion</caption>
                <thead>
                  <tr className="text-left text-[12px] text-[var(--color-text-muted)]">
                    <th scope="col" className="py-2 font-medium">
                      Stufe
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      FY 2025
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FUNNEL.rows.map((row) => (
                    <tr key={row[0]} className="border-0 border-t border-solid border-border">
                      <th
                        scope="row"
                        className={
                          istNebenpfad(row[0])
                            ? 'py-2 pl-3 text-left font-normal italic text-[var(--color-text-muted)]'
                            : 'py-2 text-left font-normal text-[var(--color-text-primary)]'
                        }
                      >
                        {row[0]}
                      </th>
                      <td className="py-2 text-right font-mono">{row[5]}</td>
                      <td className="py-2 text-right">{row[7]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Karte>
        </div>
        <Karte
          id="quartale"
          title="Quartalsverlauf je Stufe"
          meta="Leads, MQL, SQL und Neukunden je Quartal 2025"
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
        </Karte>
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

// Auftrag 069 / G67: Bildseiten-Rahmen; Auftrag 093: Funnel per HTML_PAGES freigegeben
// (Rückschaltung: Eintrag in src/config/pagePresentation.ts entfernen).
export function FunnelPage() {
  return (
    <ImagePage page="sales-funnel">
      <FunnelPageHtml />
    </ImagePage>
  );
}
