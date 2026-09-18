import { PLANUNG } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G53: Echte Planungsseite statt WebP — genau eine h1,
// Initiativen als Liste, Monatsbudget und Basis/Ziel-KPIs strukturiert.
function formatPlanWert(value: number): string {
  return value.toLocaleString('de-DE');
}

export function PlanningPage() {
  const budget = PLANUNG.chartPlanbudget.labels.map((label, index) => ({
    label,
    value: PLANUNG.chartPlanbudget.datasets[0]?.data[index] ?? 0,
    display: `${formatPlanWert(PLANUNG.chartPlanbudget.datasets[0]?.data[index] ?? 0)} €`,
  }));
  const basisLabel = PLANUNG.chartPlankpi.datasets[0]?.label ?? 'Basis';
  const zielLabel = PLANUNG.chartPlankpi.datasets[1]?.label ?? 'Ziel';
  const basis = PLANUNG.chartPlankpi.labels.map((label, index) => ({
    label,
    value: PLANUNG.chartPlankpi.datasets[0]?.data[index] ?? 0,
    display: formatPlanWert(PLANUNG.chartPlankpi.datasets[0]?.data[index] ?? 0),
  }));
  const ziel = PLANUNG.chartPlankpi.labels.map((label, index) => ({
    label,
    value: PLANUNG.chartPlankpi.datasets[1]?.data[index] ?? 0,
    display: formatPlanWert(PLANUNG.chartPlankpi.datasets[1]?.data[index] ?? 0),
  }));
  const kpiWert = (reihe: number, index: number): string =>
    formatPlanWert(PLANUNG.chartPlankpi.datasets[reihe]?.data[index] ?? 0);
  const ersteInitiative = PLANUNG.initiatives[0];
  const summary =
    `${PLANUNG.chartPlankpi.labels[0]} steigt von ${kpiWert(0, 0)} auf ${kpiWert(1, 0)}, ` +
    `${PLANUNG.chartPlankpi.labels[2]} von ${kpiWert(0, 2)} auf ${kpiWert(1, 2)} Prozent. ` +
    `Größte Initiative: ${ersteInitiative?.name} (${ersteInitiative?.budget}).`;
  return (
    <div>
      <h1>Marketingplanung</h1>
      <p>
        {PLANUNG.title}: {String(PLANUNG.initiatives.length)} Initiativen mit Monatsbudget und Ziel-KPIs.
      </p>
      <DataState
        status={PLANUNG.initiatives.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Planungsdaten erfasst."
      >
        <section aria-label="Initiativen">
          <h2>Initiativen</h2>
          <ul>
            {PLANUNG.initiatives.map((initiative) => (
              <li key={initiative.name}>
                {initiative.name}: {initiative.budget} — {initiative.target}
              </li>
            ))}
          </ul>
        </section>
        <AccessibleChartSummary
          title={PLANUNG.chartPlanbudget.datasets[0]?.label ?? 'Monatsbudget'}
          summary={summary}
        >
          <ChartBarList items={budget} />
          <h3>{basisLabel}</h3>
          <ChartBarList items={basis} />
          <h3>{zielLabel}</h3>
          <ChartBarList items={ziel} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
