import { KANAELE } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  ChartFigure,
  Chip,
  ColumnChart,
  Donut,
  Grid,
  KitTable,
  PageHero,
  Panel,
  type Tone,
} from '@/components/pageKit';

// 067I / G53: Echte Kanalseite statt WebP — genau eine h1, Tabelle, Charts mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (03-kanalperformance-cac).
const kanalTone = (index: number): Tone => (index >= 3 ? 'orange' : 'cyan');

export function ChannelsPage() {
  const rows = KANAELE.rows.map((row, index) => {
    const isTotal = index === KANAELE.rows.length - 1;
    return {
      kanal: row[0] ?? '',
      anteil: row[1] ?? '',
      neukunden: row[2] ?? '',
      index: (
        <Chip tone="cyan" strong>
          {row[3] ?? ''}
        </Chip>
      ),
      cac: row[4] ?? '',
      spend: <strong>{row[5] ?? ''}</strong>,
      bewertung: <Chip tone={isTotal ? 'neutral' : 'cyan'}>{row[6] ?? ''}</Chip>,
    };
  });

  const anteile = KANAELE.chartKanal.datasets[0]?.data ?? [];
  const kanalLabels = KANAELE.chartKanal.labels;
  const anteilSumme = anteile.reduce((sum, wert) => sum + wert, 0);
  const neukunden = KANAELE.rows.slice(0, kanalLabels.length).map((row) => row[2] ?? '');

  const cac = KANAELE.chartRoi.datasets[0]?.data ?? [];
  const cacLabels = KANAELE.chartRoi.labels;
  let guenstigst = 0;
  let teuerst = 0;
  cac.forEach((wert, index) => {
    if ((cac[guenstigst] ?? 0) > wert) guenstigst = index;
    if ((cac[teuerst] ?? 0) < wert) teuerst = index;
  });
  const euro = (index: number): string => `${(cac[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const cacSummary =
    `Günstigster Kanal ist ${cacLabels[guenstigst]} mit ${euro(guenstigst)} Marketing-CAC, ` +
    `teuerster ist ${cacLabels[teuerst]} mit ${euro(teuerst)}.`;
  const anteilSummary = `Größter Kanal ist ${kanalLabels[0]} mit ${anteile[0] ?? 0} % der Neukunden, kleinster ${
    kanalLabels[kanalLabels.length - 1]
  } mit ${anteile[anteile.length - 1] ?? 0} %.`;

  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Vertrieb & Marketing"
        title="Kanalperformance & CAC-Index"
        subtitle="Analyse aller Akquisitionskanäle."
        pills={['Akquisitionskanäle', 'Vertriebscontrolling 2025']}
      />
      <DataState status={rows.length > 0 ? 'ready' : 'empty'} emptyText="Keine Kanaldaten erfasst.">
        <Grid cols="2">
          <Panel
            title="Kanalverteilung (% Neukunden)"
            badge="Vertriebsanalyse 2025"
            subtitle="Anteil der Kundenakquise nach Kanal"
          >
            <ChartFigure title="Kanalverteilung" summary={anteilSummary}>
              <div className="pk-donut-wrap">
                <Donut
                  segments={kanalLabels.map((label, index) => ({
                    label,
                    value: anteile[index] ?? 0,
                    tone: kanalTone(index),
                  }))}
                  centerLabel="Neukunden"
                  centerValue={String(neukunden.reduce((sum, wert) => sum + Number(wert || 0), 0))}
                />
                <div className="pk-donut-side">
                  <BarList
                    max={anteilSumme > 0 ? Math.max(...anteile) : undefined}
                    items={kanalLabels.map((label, index) => ({
                      label,
                      value: anteile[index] ?? 0,
                      display: String(neukunden[index] ?? ''),
                      note: `(${anteile[index] ?? 0} %)`,
                      tone: kanalTone(index),
                    }))}
                  />
                </div>
              </div>
            </ChartFigure>
          </Panel>
          <Panel
            title="CAC nach Kanal (€)"
            badge="Vertriebscontrolling"
            subtitle="Customer Acquisition Cost je Akquisitionskanal"
          >
            <ChartFigure
              title={KANAELE.chartRoi.datasets[0]?.label ?? 'Marketing-CAC'}
              summary={cacSummary}
            >
              <ColumnChart
                labels={cacLabels}
                series={[{ name: 'Marketing-CAC', values: cac }]}
                valueSuffix=" €"
                highlightLast
              />
            </ChartFigure>
          </Panel>
        </Grid>
        <Panel title="Kanalvergleich" flush>
          <KitTable
            caption="Kanalvergleich mit Anteil, Neukunden, CAC-Index, Marketing-CAC, Spend und Bewertung"
            leadColumn
            highlightRows={[rows.length - 1]}
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
        </Panel>
      </DataState>
    </div>
  );
}
