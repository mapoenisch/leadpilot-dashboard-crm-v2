import { OKR, CHART_OKR } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G52: Echte OKR-Seite statt WebP — genau eine h1, Objectives mit
// Key Results als Listen, Basis/Ziel-Vergleich mit Summary.
export function OkrsPage() {
  const ziele = CHART_OKR.labels.map((label, index) => ({
    label,
    value: CHART_OKR.datasets[1]?.data[index] ?? 0,
    display: String(CHART_OKR.datasets[1]?.data[index] ?? 0),
  }));
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
        <AccessibleChartSummary
          title="Basis- vs. Zielwerte 2026"
          summary="Alle acht Steuerungsgrößen verbessern sich: ARR von 41,2 auf 62,0, Kunden von 66 auf 95, Trial-to-Paid von 18 auf 26 Prozent bei sinkendem Churn."
        >
          <ChartBarList items={ziele} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
