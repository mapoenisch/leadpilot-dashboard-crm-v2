import {
  Clock,
  Coins,
  Gem,
  Megaphone,
  PieChart,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { UNIT, BUDGET, CHART_MRR26, CHART_CHURN26 } from '@/domain/finanzenData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  ChartFigure,
  Grid,
  LineChart,
  PageHero,
  Panel,
  StatTile,
  type Tone,
} from '@/components/pageKit';

// 067I / G52: Echte Unit-Economics-Seite statt WebP — genau eine h1,
// Kennzahlen als Liste, Kostenstruktur als Balken mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-unit-economics-2026).
const ICONS: LucideIcon[] = [
  Megaphone,
  Coins,
  TrendingUp,
  Gem,
  Scale,
  Clock,
  PieChart,
  Users,
  ShieldCheck,
];
const tones: Record<string, Tone> = { '#FF7A3D': 'orange', '#7CEFE6': 'mint' };
const toneOf = (color: string | undefined): Tone => (color ? (tones[color] ?? 'cyan') : 'cyan');

/** „2,7 : 1 (Ziel: ≥ 3,0 : 1)“ → Wert und Zielhinweis getrennt darstellen. */
function splitHint(text: string): [string, string | undefined] {
  const match = /^(.*?)\s*\((.+)\)$/.exec(text);
  return match ? [match[1] ?? text, match[2]] : [text, undefined];
}

function euroToNumber(text: string): number {
  const cleaned = text.replace(/[^0-9]/g, '');
  return cleaned ? Number(cleaned) : 0;
}

export function UnitEconomicsPage() {
  const ready = UNIT.metrics.length > 0;
  const kosten = BUDGET.allocations.map((item, index) => ({
    label: item.area,
    value: euroToNumber(item.budget),
    display: item.budget,
    note: `(${item.share})`,
    tone: (index === 0 ? 'cyan' : index === 2 ? 'orange' : 'mint') as Tone,
  }));
  const nachBudget = [...BUDGET.allocations].sort(
    (a, b) => euroToNumber(b.budget) - euroToNumber(a.budget),
  );
  const groesste = nachBudget[0];
  const naechste = nachBudget[1];
  const kostenSummary =
    `Der ${groesste?.area} dominiert mit ${groesste?.budget} und ${groesste?.share}, ` +
    `gefolgt von ${naechste?.area} mit ${naechste?.budget}.`;

  const mrr = CHART_MRR26.datasets;
  const mrrGesamt = mrr[0]?.data ?? [];
  const mrrSummary =
    `${mrr[0]?.label ?? 'Gesamt-MRR'} steigt von ${(mrrGesamt[0] ?? 0).toLocaleString('de-DE')} Euro ` +
    `(${CHART_MRR26.labels[0]}) auf ${(mrrGesamt[mrrGesamt.length - 1] ?? 0).toLocaleString('de-DE')} Euro ` +
    `(${CHART_MRR26.labels[CHART_MRR26.labels.length - 1]}).`;

  const churn = CHART_CHURN26.datasets;
  const letztes = CHART_CHURN26.labels.length - 1;
  const prozent = (wert: number | undefined) => `${(wert ?? 0).toLocaleString('de-DE')} %`;
  const churnSummary =
    `${churn[0]?.label ?? 'Account-Churn'} sinkt von ${prozent(churn[0]?.data[0])} auf ` +
    `${prozent(churn[0]?.data[letztes])}, ${churn[1]?.label ?? 'Trial-to-Paid'} steigt von ` +
    `${prozent(churn[1]?.data[0])} auf ${prozent(churn[1]?.data[letztes])} ` +
    `(${CHART_CHURN26.labels[0]} bis ${CHART_CHURN26.labels[letztes]}).`;

  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Finanzen"
        title="Unit Economics 2026"
        subtitle={`${UNIT.title}: SaaS-Kernmetriken und Kostenstruktur der LeadPilot GmbH.`}
        pills={['SaaS Unit Economics', 'Projektion 2026']}
      />
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Unit-Economics erfasst.">
        <section aria-label="Kernmetriken">
          <h2 className="sr-only">Kernmetriken</h2>
          <ul className="pk-grid" data-cols="4">
            {UNIT.metrics.map((metric, index) => {
              const [wert, hinweis] = splitHint(metric.val);
              return (
                <li key={metric.label}>
                  <StatTile
                    label={metric.label}
                    value={wert}
                    hint={hinweis}
                    icon={ICONS[index % ICONS.length]}
                  />
                </li>
              );
            })}
          </ul>
        </section>
        <Grid cols="2">
          <Panel
            title="MRR-Projektion 2026 (€)"
            badge="Finanzmodell 2026"
            subtitle="Monatliche MRR-Entwicklung für 2026"
          >
            <ChartFigure title="MRR-Projektion 2026" summary={mrrSummary}>
              <LineChart
                labels={CHART_MRR26.labels}
                series={mrr.map((set) => ({
                  name: set.label,
                  values: set.data,
                  tone: toneOf(set.color),
                  area: 'fill' in set && set.fill === true,
                }))}
              />
            </ChartFigure>
          </Panel>
          <Panel
            title="Churn- & Trial-Entwicklung 2026 (%)"
            badge="Unit Economics"
            subtitle="Entwicklung der Abwanderungs- und Testraten"
          >
            <ChartFigure title="Churn- und Trial-Entwicklung 2026" summary={churnSummary}>
              <LineChart
                labels={CHART_CHURN26.labels}
                series={churn.map((set) => ({
                  name: set.label,
                  values: set.data,
                  tone: toneOf(set.color),
                  area: 'fill' in set && set.fill === true,
                }))}
              />
            </ChartFigure>
          </Panel>
        </Grid>
        <Panel title={BUDGET.title} badge="GJ 2025" subtitle="Anteile an den Gesamtkosten">
          <ChartFigure title={BUDGET.title} summary={kostenSummary}>
            <BarList items={kosten} />
          </ChartFigure>
        </Panel>
      </DataState>
    </div>
  );
}
