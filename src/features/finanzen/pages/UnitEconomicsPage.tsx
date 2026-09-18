import { UNIT, BUDGET } from '@/domain/finanzenData';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G52: Echte Unit-Economics-Seite statt WebP — genau eine h1,
// Kennzahlen als Definitionsliste, Kostenstruktur als Balken mit Summary.
function euroToNumber(text: string): number {
  const cleaned = text.replace(/[^0-9]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

export function UnitEconomicsPage() {
  const ready = UNIT.metrics.length > 0;
  const kosten = BUDGET.allocations.map((item) => ({
    label: item.area,
    value: euroToNumber(item.budget),
    display: `${item.budget} (${item.share})`,
  }));
  const nachBudget = [...BUDGET.allocations].sort(
    (a, b) => euroToNumber(b.budget) - euroToNumber(a.budget),
  );
  const groesste = nachBudget[0];
  const naechste = nachBudget[1];
  const kostenSummary =
    `Der ${groesste?.area} dominiert mit ${groesste?.budget} und ${groesste?.share}, ` +
    `gefolgt von ${naechste?.area} mit ${naechste?.budget}.`;
  return (
    <div>
      <h1>Unit Economics 2026</h1>
      <p>{UNIT.title}: SaaS-Kernmetriken und Kostenstruktur der LeadPilot GmbH.</p>
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Unit-Economics erfasst.">
        <section aria-label="Kernmetriken">
          <h2>Kernmetriken</h2>
          <dl>
            {UNIT.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.val}</dd>
              </div>
            ))}
          </dl>
        </section>
        <AccessibleChartSummary title={BUDGET.title} summary={kostenSummary}>
          <ChartBarList items={kosten} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
