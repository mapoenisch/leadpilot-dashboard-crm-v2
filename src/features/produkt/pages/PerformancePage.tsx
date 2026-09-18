import { PERF, CHART_PRODUKT, CHART_CHURN } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G54: Echte Performance-Seite statt WebP — genau eine h1,
// Qualitätsmetriken als Definitionsliste, beide Chart-Reihen strukturiert.
function formatProzent(value: number): string {
  return `${value.toLocaleString('de-DE')} %`;
}

export function PerformancePage() {
  const reihen = CHART_PRODUKT.datasets.map((dataset) => ({
    label: dataset.label,
    items: CHART_PRODUKT.labels.map((label, index) => ({
      label,
      value: dataset.data[index] ?? 0,
      display: formatProzent(dataset.data[index] ?? 0),
    })),
  }));
  const churn = CHART_CHURN.labels.map((label, index) => ({
    label,
    value: CHART_CHURN.datasets[0]?.data[index] ?? 0,
    display: String(CHART_CHURN.datasets[0]?.data[index] ?? 0),
  }));
  const quartale = CHART_PRODUKT.labels;
  const aktivierung = (index: number): string =>
    formatProzent(CHART_PRODUKT.datasets[0]?.data[index] ?? 0);
  const scoring = (index: number): string =>
    formatProzent(CHART_PRODUKT.datasets[1]?.data[index] ?? 0);
  const verlaufSummary =
    `${CHART_PRODUKT.datasets[0]?.label} steigt von ${aktivierung(0)} (${quartale[0]}) ` +
    `auf ${aktivierung(quartale.length - 1)} (${quartale[quartale.length - 1]}), ` +
    `${CHART_PRODUKT.datasets[1]?.label} von ${scoring(0)} auf ${scoring(quartale.length - 1)}.`;
  const churnTop = CHART_CHURN.labels[0];
  const churnTopWert = CHART_CHURN.datasets[0]?.data[0] ?? 0;
  const churnSummary = `Häufigster Kündigungsgrund ist ${churnTop} mit ${String(churnTopWert)} Nennungen.`;
  return (
    <div>
      <h1>Produkt-Performance</h1>
      <p>{PERF.title}: Verfügbarkeit, Aktivierung und Kündigungsgründe.</p>
      <DataState
        status={PERF.metrics.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Performance-Daten erfasst."
      >
        <section aria-label="Kernmetriken">
          <h2>Kernmetriken</h2>
          <dl>
            {PERF.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.val}</dd>
              </div>
            ))}
          </dl>
        </section>
        <AccessibleChartSummary
          title="Quartalsverlauf Aktivierung & Scoring"
          summary={verlaufSummary}
        >
          {reihen.map((reihe) => (
            <section key={reihe.label} aria-label={reihe.label}>
              <h3>{reihe.label}</h3>
              <ChartBarList items={reihe.items} />
            </section>
          ))}
        </AccessibleChartSummary>
        <AccessibleChartSummary title="Kündigungsgründe" summary={churnSummary}>
          <ChartBarList items={churn} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
