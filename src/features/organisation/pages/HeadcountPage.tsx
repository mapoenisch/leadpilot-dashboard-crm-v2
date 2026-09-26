import { HEADCOUNT, TEAM } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, LineChart, PageHero, Panel, RowList } from '@/components/pageKit';

// 067I / G55: Echte Headcount-Seite statt WebP — genau eine h1,
// Kapazitätsliste plus FTE-Verlauf mit Summary, alles aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-headcount-entwicklung).
/**
 * Engpass-Markierung je Bereich, abgeleitet aus den dokumentierten Engpässen
 * („Engpass N: <Bereich> — …“) — keine eigene Wertung. Auch von der
 * Teamstruktur genutzt.
 */
export function hatEngpass(bereich: string): boolean {
  return TEAM.bottlenecks.some((text) => {
    const betroffen = /^Engpass \d+: (.+?) —/.exec(text)?.[1];
    return betroffen !== undefined && bereich.startsWith(betroffen);
  });
}

function formatFte(value: number): string {
  return `${value.toLocaleString('de-DE')} FTE`;
}

export function HeadcountPage() {
  const bereiche = HEADCOUNT.rows.slice(0, -1);
  const gesamt = HEADCOUNT.rows[HEADCOUNT.rows.length - 1];
  const labels = HEADCOUNT.chart.labels;
  const reihe = HEADCOUNT.chart.datasets[0];
  const start = formatFte(reihe?.data[0] ?? 0);
  const stand = formatFte(reihe?.data[labels.length - 1] ?? 0);
  const ziel = gesamt?.[1] ?? '';
  const summary =
    `${reihe?.label} wächst von ${start} (${labels[0]}) ` +
    `auf ${stand} (${labels[labels.length - 1]}), Ziel ${ziel}.`;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Organisation"
        title="Headcount-Entwicklung"
        subtitle="Mitarbeiterkapazität je Bereich mit FTE-Verlauf seit Q1 2024."
        pills={['Personalbestand 2025', 'Ebene A Baseline']}
      />
      <DataState
        status={HEADCOUNT.rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Headcount-Daten erfasst."
      >
        <Panel
          title="Headcount-Verlauf (Gesamt-FTE)"
          badge="Personalbestand 2025"
          subtitle={`Entwicklung des gesamten Personalbestands von ${labels[0] ?? ''} bis ${
            labels[labels.length - 1] ?? ''
          }`}
        >
          <ChartFigure title={reihe?.label ?? 'FTE-Verlauf'} summary={summary}>
            <LineChart
              labels={labels}
              series={[{ name: reihe?.label ?? 'FTE', values: reihe?.data ?? [], area: true }]}
            />
          </ChartFigure>
        </Panel>
        <section className="pk-stack" aria-label="Kapazität je Bereich">
          <h2 className="pk-section-title">Kapazitätsübersicht &amp; Rollenverteilung</h2>
          <RowList
            label="Bereiche mit Kapazität und Besetzung"
            items={bereiche.map((row) => ({
              key: row[0] ?? '',
              title: row[0] ?? '',
              chip: <Chip strong>{row[1] ?? ''}</Chip>,
              text: row[2] ?? '',
              aside: hatEngpass(row[0] ?? '') ? (
                <Chip tone="orange" strong>
                  Engpass
                </Chip>
              ) : undefined,
            }))}
          />
          {gesamt ? (
            <Panel title={gesamt[0] ?? ''} chip={gesamt[2] ?? ''} headingLevel={3}>
              <p className="pk-stat__value">{gesamt[1] ?? ''}</p>
            </Panel>
          ) : null}
        </section>
      </DataState>
    </div>
  );
}
