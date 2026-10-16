import { GUV, CHART_ERLOESE, CHART_KOSTEN } from '@/domain/finanzenData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  ChartFigure,
  Donut,
  Grid,
  KitTable,
  PageHero,
  Panel,
  type Tone,
} from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { GroupedDepthColumns } from '@/features/vertrieb/components/GroupedDepthColumns';
import '../finanzenSeiten.css';

// 067I / G52: Echte GuV-Seite statt WebP — genau eine h1, semantische Tabelle,
// auswählbarer Text, Chartzusammenfassung zur Erlösaufteilung.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-gewinn-verlustrechnung).
// Auftrag 097 (Paket G2, Welle 4): sichtbar ausgeliefert (HTML_PAGES). Kostenstruktur als
// 3D-Säulen wie im Original-WebP; EBITDA als Verlust unter der Nulllinie (Original: kleine
// positive Säule). Tabelle ohne eigene Kopfzeile. Plan-Abo-Umsatz als „Ziel-ARR, vereinfacht“
// gekennzeichnet (Faktenblatt v1.2, Abschnitt 17 D11).
const CYAN_HELL = 'color-mix(in srgb, var(--color-primary) 45%, white)';
const CYAN = 'var(--color-primary)';
const ABO_ZEILE = 'Abo-Umsatz (wiederkehrend)';
const erloesTone = (index: number): Tone =>
  index === 1 ? 'orange' : index === 2 ? 'mint' : 'cyan';
const KERNZEILEN = ['Umsatzerlöse (Gesamtumsatz)', 'EBITDA'];

function PnLPageHtml() {
  const rows = GUV.rows.map((row) => ({
    position:
      row[0] === ABO_ZEILE ? `${ABO_ZEILE} – Plan 2026: Ziel-ARR, vereinfacht¹` : (row[0] ?? ''),
    fy2024: row[1] ?? '',
    fy2025: row[2] ?? '',
    plan2026: row[3] ?? '',
  }));
  const kernzeilen = GUV.rows
    .map((row, index) => (KERNZEILEN.includes(row[0] ?? '') ? index : -1))
    .filter((index) => index >= 0);

  const erloesWerte = CHART_ERLOESE.datasets[0]?.data ?? [];
  const erloesGesamt = erloesWerte.reduce((sum, wert) => sum + wert, 0);
  const anteil = (wert: number) =>
    erloesGesamt > 0 ? `(${Math.round((wert / erloesGesamt) * 100)} %)` : '';
  const erloesBetrag = (index: number): string =>
    `${(erloesWerte[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const erloesSummary =
    `${CHART_ERLOESE.labels[0]} trägt mit ${erloesBetrag(0)} den größten Anteil, ` +
    `gefolgt von ${CHART_ERLOESE.labels[1]} mit ${erloesBetrag(1)} und ` +
    `${CHART_ERLOESE.labels[2]} mit ${erloesBetrag(2)}.`;
  const kleinsterIndex = erloesWerte.length - 1;

  const kosten24 = CHART_KOSTEN.datasets[0];
  const kosten25 = CHART_KOSTEN.datasets[1];
  const kostenLabel = (index: number) => CHART_KOSTEN.labels[index] ?? '';
  const kostenSummary =
    `${kostenLabel(0)} steigt von ${kosten24?.data[0] ?? 0} auf ${kosten25?.data[0] ?? 0} k€, ` +
    `${kostenLabel(2)} von ${kosten24?.data[2] ?? 0} auf ${kosten25?.data[2] ?? 0} k€; ` +
    `${kostenLabel(5)} liegt bei ${kosten24?.data[5] ?? 0} bzw. ${kosten25?.data[5] ?? 0} k€.`;

  return (
    <div className="pk-page finanz-seite" data-ruhig="true" data-page-key="finance-pnl">
      <PageHero
        eyebrow="Finanzen"
        title="Gewinn- und Verlustrechnung (GuV)"
        subtitle="Finanzergebnisse 2024 – 2026: Ist-Werte FY 2024 und FY 2025, Plan 2026."
        pills={['GuV 2024–2026', 'Finanzcontrolling']}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine GuV-Positionen erfasst."
      >
        <Grid cols="2">
          <Panel
            title={`Erlösstruktur 2025 (€ ${erloesGesamt.toLocaleString('de-DE')} Gesamtumsatz)`}
            badge="GuV 2025"
            subtitle="Zusammensetzung nach Abo-Umsatz, Onboarding & Setup und sonstigen Erlösen"
          >
            <ChartFigure title="Erlösaufteilung FY 2025" summary={erloesSummary}>
              <div className="pk-donut-wrap">
                <Donut
                  segments={CHART_ERLOESE.labels.map((label, index) => ({
                    label,
                    value: erloesWerte[index] ?? 0,
                    tone: erloesTone(index),
                  }))}
                  centerLabel={CHART_ERLOESE.labels[kleinsterIndex] ?? ''}
                  centerValue={(erloesWerte[kleinsterIndex] ?? 0).toLocaleString('de-DE')}
                />
                <div className="pk-donut-side">
                  <BarList
                    items={CHART_ERLOESE.labels.map((label, index) => ({
                      label,
                      value: erloesWerte[index] ?? 0,
                      display: (erloesWerte[index] ?? 0).toLocaleString('de-DE'),
                      note: anteil(erloesWerte[index] ?? 0),
                      tone: erloesTone(index),
                    }))}
                  />
                </div>
              </div>
            </ChartFigure>
          </Panel>
          <Panel
            title="Kostenstruktur GuV FY 2024 vs. FY 2025 (k€)"
            badge="GuV-Vergleich"
            subtitle="Umsatz, operative Kostenarten und EBITDA im Jahresvergleich"
          >
            <ChartFigure title="Kostenstruktur FY 2024 vs. FY 2025" summary={kostenSummary}>
              <GroupedDepthColumns
                idPrefix="guv-kosten"
                height={260}
                viewWidth={560}
                plotLeft={50}
                schmal
                maxBarWidth={26}
                regionLabel="Kostenstruktur FY 2024 vs. FY 2025, waagerecht scrollbar"
                labels={CHART_KOSTEN.labels}
                series={[
                  {
                    name: kosten24?.label ?? 'FY 2024 (k€)',
                    values: kosten24?.data ?? [],
                    color: CYAN_HELL,
                  },
                  {
                    name: kosten25?.label ?? 'FY 2025 (k€)',
                    values: kosten25?.data ?? [],
                    color: CYAN,
                  },
                ]}
                formatTick={(wert) => wert.toLocaleString('de-DE')}
                datenTabelle={(wert) => `${wert.toLocaleString('de-DE')} k€`}
              />
            </ChartFigure>
          </Panel>
        </Grid>
        <section className="pk-panel" data-tone="cyan" data-flush="true" aria-label="GuV-Tabelle">
          <KitTable
            caption="GuV-Positionen FY 2024, FY 2025 und Plan 2026"
            highlightRows={kernzeilen}
            columns={[
              { key: 'position', label: GUV.headers[0] ?? 'Position (€)' },
              { key: 'fy2024', label: GUV.headers[1] ?? 'FY 2024', align: 'right' },
              { key: 'fy2025', label: GUV.headers[2] ?? 'FY 2025', align: 'right' },
              {
                key: 'plan2026',
                label: GUV.headers[3] ?? 'Plan 2026',
                align: 'right',
                emphasis: 'plan',
              },
            ]}
            rows={rows}
          />
        </section>
        <p className="pk-muted finanz-hinweis">
          ¹ Vereinfachung: Plan 2026 setzt als Abo-Umsatz den Ziel-ARR zum Jahresende an, nicht die
          Summe der Plan-MRR. Umsatz, EBITDA und Ergebnis 2026 fallen dadurch günstiger aus als bei
          monatsgenauer Abgrenzung.
        </p>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function PnLPage() {
  return (
    <ImagePage page="finance-pnl">
      <PnLPageHtml />
    </ImagePage>
  );
}
