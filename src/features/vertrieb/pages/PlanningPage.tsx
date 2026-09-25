import { PLANUNG } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import {
  ChartFigure,
  Chip,
  ColumnChart,
  Grid,
  KitTable,
  PageHero,
  Panel,
} from '@/components/pageKit';

// 067I / G53: Echte Planungsseite statt WebP — genau eine h1,
// Initiativen als Tabelle, Monatsbudget und Basis/Ziel-KPIs strukturiert.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-marketingplanung-h2-2026).
function formatPlanWert(value: number): string {
  return value.toLocaleString('de-DE');
}

export function PlanningPage() {
  const budget = PLANUNG.chartPlanbudget.datasets[0]?.data ?? [];
  const kpiWert = (reihe: number, index: number): string =>
    formatPlanWert(PLANUNG.chartPlankpi.datasets[reihe]?.data[index] ?? 0);
  const ersteInitiative = PLANUNG.initiatives[0];
  const summary =
    `${PLANUNG.chartPlankpi.labels[0]} steigt von ${kpiWert(0, 0)} auf ${kpiWert(1, 0)}, ` +
    `${PLANUNG.chartPlankpi.labels[2]} von ${kpiWert(0, 2)} auf ${kpiWert(1, 2)} Prozent. ` +
    `Größte Initiative: ${ersteInitiative?.name} (${ersteInitiative?.budget}).`;
  const budgetSumme = budget.reduce((sum, wert) => sum + wert, 0);
  const budgetSummary = `${formatPlanWert(budgetSumme)} € Marketingbudget über ${PLANUNG.chartPlanbudget.labels.length} Monate, höchster Monat ${
    PLANUNG.chartPlanbudget.labels[budget.indexOf(Math.max(...budget))] ?? ''
  } mit ${formatPlanWert(Math.max(...budget))} €.`;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Vertrieb & Marketing"
        title={PLANUNG.title}
        subtitle="Geplante Kampagnen und Budgetallokation H2 2026."
        pills={['H2 2026', 'Budget & Kampagnen']}
      />
      <DataState
        status={PLANUNG.initiatives.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Planungsdaten erfasst."
      >
        <Grid cols="2">
          <Panel
            title="Marketing-Budget 6-Monats-Planung H2 2026 (€)"
            badge="Marketing-Plan 2026"
            subtitle="Geplante Mittelverwendung je Monat"
          >
            <ChartFigure
              title={PLANUNG.chartPlanbudget.datasets[0]?.label ?? 'Monatsbudget'}
              summary={budgetSummary}
            >
              <ColumnChart
                labels={PLANUNG.chartPlanbudget.labels}
                series={[{ name: 'Monatsbudget', values: budget }]}
                valueSuffix=" €"
              />
            </ChartFigure>
          </Panel>
          <Panel
            title="Marketing-Ziel-KPIs (Basis 2025 vs. Ziel Jan 2027)"
            badge="Strategie-Roadmap"
            subtitle="Strategische Zielkennzahlen im Vergleich"
          >
            <ChartFigure title="Ziel-KPIs" summary={summary}>
              <ColumnChart
                labels={PLANUNG.chartPlankpi.labels}
                series={PLANUNG.chartPlankpi.datasets.map((dataset, index) => ({
                  name: dataset.label,
                  values: dataset.data,
                  tone: index === 0 ? 'neutral' : 'cyan',
                }))}
              />
            </ChartFigure>
          </Panel>
        </Grid>
        <Panel title="Initiativen" flush>
          <KitTable
            caption="Initiativen mit Budget und Zielsetzung"
            leadColumn
            columns={[
              { key: 'name', label: 'Initiative' },
              { key: 'budget', label: 'Budget' },
              { key: 'target', label: 'Zielsetzung' },
            ]}
            rows={PLANUNG.initiatives.map((initiative) => ({
              name: initiative.name,
              budget: <Chip strong>{initiative.budget}</Chip>,
              target: initiative.target,
            }))}
          />
        </Panel>
      </DataState>
    </div>
  );
}
