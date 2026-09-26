import { GUV, CHART_ERLOESE, CHART_KOSTEN } from '@/domain/finanzenData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  ChartFigure,
  ColumnChart,
  Donut,
  Grid,
  KitTable,
  PageHero,
  Panel,
  type Tone,
} from '@/components/pageKit';

// 067I / G52: Echte GuV-Seite statt WebP — genau eine h1, semantische Tabelle,
// auswählbarer Text, Chartzusammenfassung zur Erlösaufteilung.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-gewinn-verlustrechnung).
const erloesTone = (index: number): Tone =>
  index === 1 ? 'orange' : index === 2 ? 'mint' : 'cyan';
const KERNZEILEN = ['Umsatzerlöse (Gesamtumsatz)', 'EBITDA'];

export function PnLPage() {
  const rows = GUV.rows.map((row) => ({
    position: row[0] ?? '',
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
    <div className="pk-page">
      <PageHero
        eyebrow="Finanzen"
        title="Gewinn- und Verlustrechnung"
        subtitle="GuV der LeadPilot GmbH: FY 2024 und FY 2025 sind Ist-Werte, Plan 2026 ist die verabschiedete Planung. Alle Beträge in Euro."
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
              <ColumnChart
                labels={CHART_KOSTEN.labels}
                series={[
                  {
                    name: kosten24?.label ?? 'FY 2024',
                    values: kosten24?.data ?? [],
                    tone: 'mint',
                  },
                  {
                    name: kosten25?.label ?? 'FY 2025',
                    values: kosten25?.data ?? [],
                    tone: 'cyan',
                  },
                ]}
              />
            </ChartFigure>
          </Panel>
        </Grid>
        <Panel title="GuV-Tabelle" flush>
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
        </Panel>
      </DataState>
    </div>
  );
}
