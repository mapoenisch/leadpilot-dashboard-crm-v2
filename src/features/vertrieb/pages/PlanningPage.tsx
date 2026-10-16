import { PLANUNG } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, Grid, KitTable, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { GroupedDepthColumns } from '../components/GroupedDepthColumns';
import '../vertriebSeiten.css';

// 067I / G53: Echte Planungsseite statt WebP — genau eine h1,
// Initiativen als Tabelle, Monatsbudget und Basis/Ziel-KPIs strukturiert.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-marketingplanung-h2-2026).
// Auftrag 096 (Paket G2, Welle 3): sichtbar ausgeliefert (HTML_PAGES). Beide Diagramme als
// 3D-Säulen wie im Original-WebP, Ziel-CAC orange. Faktenblatt v1.2 §15/D1: Monatsreihe
// (19.375 €) ist ein Teilplan des H2-Budgets von 30.000 €; Guided Onboarding zielt auf ≥ 26 %.
const CYAN = 'var(--color-primary)';
const CYAN_HELL = 'color-mix(in srgb, var(--color-primary) 45%, white)';
const ORANGE = 'var(--orange)';
const H2_GESAMTBUDGET = '30.000 €';

function formatPlanWert(value: number): string {
  return value.toLocaleString('de-DE');
}

function PlanningPageHtml() {
  const budget = PLANUNG.chartPlanbudget.datasets[0]?.data ?? [];
  const kpiWert = (reihe: number, index: number): string =>
    formatPlanWert(PLANUNG.chartPlankpi.datasets[reihe]?.data[index] ?? 0);
  const ersteInitiative = PLANUNG.initiatives[0];
  const summary =
    `${PLANUNG.chartPlankpi.labels[0]} steigt von ${kpiWert(0, 0)} auf ${kpiWert(1, 0)}, ` +
    `${PLANUNG.chartPlankpi.labels[2]} von ${kpiWert(0, 2)} auf ${kpiWert(1, 2)} Prozent. ` +
    `Größte Initiative: ${ersteInitiative?.name} (${ersteInitiative?.budget}).`;
  const budgetSumme = budget.reduce((sum, wert) => sum + wert, 0);
  const budgetSummary = `Teilplan mit ${formatPlanWert(budgetSumme)} € über ${PLANUNG.chartPlanbudget.labels.length} Monate (H2-Budget gesamt ${H2_GESAMTBUDGET}), höchster Monat ${
    PLANUNG.chartPlanbudget.labels[budget.indexOf(Math.max(...budget))] ?? ''
  } mit ${formatPlanWert(Math.max(...budget))} €.`;
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="sales-planning">
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
            subtitle={`Geplante Mittelverwendung je Monat · Teilplan ${formatPlanWert(budgetSumme)} € von ${H2_GESAMTBUDGET} H2-Budget`}
          >
            <ChartFigure
              title={PLANUNG.chartPlanbudget.datasets[0]?.label ?? 'Monatsbudget'}
              summary={budgetSummary}
            >
              <GroupedDepthColumns
                idPrefix="plan-budget"
                height={300}
                viewWidth={520}
                plotLeft={66}
                schmal
                maxBarWidth={44}
                regionLabel="Monatsbudget, waagerecht scrollbar"
                labels={PLANUNG.chartPlanbudget.labels}
                series={[{ name: 'Monatsbudget', values: budget, color: CYAN }]}
                formatTick={(wert) => `${formatPlanWert(wert)} €`}
                valueLabel={(wert) => `${formatPlanWert(wert)} €`}
                datenTabelle={(wert) => `${formatPlanWert(wert)} €`}
              />
            </ChartFigure>
          </Panel>
          <Panel
            title="Marketing-Ziel-KPIs (Basis 2025 vs. Ziel Jan 2027)"
            badge="Strategie-Roadmap"
            subtitle="Strategische Zielkennzahlen im Vergleich"
          >
            <ChartFigure title="Ziel-KPIs" summary={summary}>
              <GroupedDepthColumns
                idPrefix="plan-kpi"
                height={300}
                viewWidth={520}
                plotLeft={40}
                schmal
                maxBarWidth={30}
                regionLabel="Ziel-KPIs, waagerecht scrollbar"
                labels={PLANUNG.chartPlankpi.labels}
                series={PLANUNG.chartPlankpi.datasets.map((dataset, index) => ({
                  name: dataset.label,
                  values: dataset.data,
                  color: index === 0 ? CYAN_HELL : CYAN,
                }))}
                colorAt={(si, li) => (si === 1 && li === 1 ? ORANGE : undefined)}
                formatTick={formatPlanWert}
                valueLabel={formatPlanWert}
                datenTabelle={formatPlanWert}
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

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function PlanningPage() {
  return (
    <ImagePage page="sales-planning">
      <PlanningPageHtml />
    </ImagePage>
  );
}
