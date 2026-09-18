import { OKR, CHART_OKR } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G52: Echte OKR-Seite statt WebP — genau eine h1, Objectives mit
// Key Results als Listen, Basis/Ziel-Vergleich mit Summary.
function formatOkrWert(value: number): string {
  return value.toLocaleString('de-DE');
}

export function OkrsPage() {
  const basisLabel = CHART_OKR.datasets[0]?.label ?? 'Basis';
  const zielLabel = CHART_OKR.datasets[1]?.label ?? 'Ziel';
  const basisWerte = CHART_OKR.labels.map((label, index) => ({
    label,
    value: CHART_OKR.datasets[0]?.data[index] ?? 0,
    display: formatOkrWert(CHART_OKR.datasets[0]?.data[index] ?? 0),
  }));
  const zielWerte = CHART_OKR.labels.map((label, index) => ({
    label,
    value: CHART_OKR.datasets[1]?.data[index] ?? 0,
    display: formatOkrWert(CHART_OKR.datasets[1]?.data[index] ?? 0),
  }));
  const wert = (reihe: number, index: number): string =>
    formatOkrWert(CHART_OKR.datasets[reihe]?.data[index] ?? 0);
  const summary =
    `Alle ${CHART_OKR.labels.length} Steuerungsgrößen verbessern sich: ` +
    `${CHART_OKR.labels[0]} von ${wert(0, 0)} auf ${wert(1, 0)}, ` +
    `${CHART_OKR.labels[1]} von ${wert(0, 1)} auf ${wert(1, 1)}, ` +
    `${CHART_OKR.labels[2]} von ${wert(0, 2)} auf ${wert(1, 2)} Prozent ` +
    `bei sinkendem ${CHART_OKR.labels[3]}.`;
  return (
    <div>
      <h1>Ziele &amp; OKRs</h1>
      <p>{OKR.title}: Objectives mit messbaren Key Results für 2026.</p>
      <DataState status={OKR.objectives.length > 0 ? 'ready' : 'empty'} emptyText="Keine Objectives erfasst.">
        {OKR.objectives.map((objective) => (
          <section key={objective.title} aria-label={objective.title}>
            <h2>{objective.title}</h2>
            <ul>
              {objective.krs.map((kr) => (
                <li key={kr}>{kr}</li>
              ))}
            </ul>
          </section>
        ))}
        <AccessibleChartSummary title="Basis- vs. Zielwerte 2026" summary={summary}>
          <h3>{basisLabel}</h3>
          <ChartBarList items={basisWerte} />
          <h3>{zielLabel}</h3>
          <ChartBarList items={zielWerte} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
