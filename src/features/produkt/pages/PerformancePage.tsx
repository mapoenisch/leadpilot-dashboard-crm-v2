import { Brain, Database, Headphones, Server, Users, Zap, type LucideIcon } from 'lucide-react';
import { PERF, CHART_PRODUKT, CHART_CHURN } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  ChartFigure,
  Donut,
  Grid,
  LineChart,
  PageHero,
  Panel,
  StatTile,
  splitValueHint,
  type Tone,
} from '@/components/pageKit';

// 067I / G54: Echte Performance-Seite statt WebP — genau eine h1,
// Qualitätsmetriken als Liste, beide Chart-Reihen strukturiert.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (09-produkt-performance-2025).
const ICONS: LucideIcon[] = [Server, Users, Database, Brain, Zap, Headphones];
const churnTone: Tone[] = ['orange', 'orange', 'cyan', 'neutral'];

function formatProzent(value: number): string {
  return `${value.toLocaleString('de-DE')} %`;
}

export function PerformancePage() {
  const quartale = CHART_PRODUKT.labels;
  const aktivierung = (index: number): string =>
    formatProzent(CHART_PRODUKT.datasets[0]?.data[index] ?? 0);
  const scoring = (index: number): string =>
    formatProzent(CHART_PRODUKT.datasets[1]?.data[index] ?? 0);
  const verlaufSummary =
    `${CHART_PRODUKT.datasets[0]?.label} steigt von ${aktivierung(0)} (${quartale[0]}) ` +
    `auf ${aktivierung(quartale.length - 1)} (${quartale[quartale.length - 1]}), ` +
    `${CHART_PRODUKT.datasets[1]?.label} von ${scoring(0)} auf ${scoring(quartale.length - 1)}.`;
  const churnWerte = CHART_CHURN.datasets[0]?.data ?? [];
  const churnGesamt = churnWerte.reduce((sum, wert) => sum + wert, 0);
  const churnTop = CHART_CHURN.labels[0];
  const churnTopWert = churnWerte[0] ?? 0;
  const churnSummary = `Häufigster Kündigungsgrund ist ${churnTop} mit ${String(churnTopWert)} Nennungen.`;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Produkt"
        title={PERF.title}
        subtitle="Verfügbarkeit, Aktivierung und Kündigungsgründe."
        pills={['Telemetrie 2025', `${PERF.metrics.length} Kernmetriken`]}
      />
      <DataState
        status={PERF.metrics.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Performance-Daten erfasst."
      >
        <section aria-label="Kernmetriken">
          <h2 className="sr-only">Kernmetriken</h2>
          <ul className="pk-grid" data-cols="3">
            {PERF.metrics.map((metric, index) => {
              const [wert, ziel] = splitValueHint(metric.val);
              // Zielstatus steht in den Daten („erreicht“ / „verfehlt“).
              const verfehlt = ziel?.includes('verfehlt') ?? false;
              return (
                <li key={metric.label}>
                  <StatTile
                    label={metric.label}
                    value={wert}
                    hint={ziel}
                    tone={verfehlt ? 'orange' : 'cyan'}
                    icon={ICONS[index % ICONS.length]}
                  />
                </li>
              );
            })}
          </ul>
        </section>
        <Grid cols="2">
          <Panel
            title="Produkt-Aktivierung & KI-Nutzung (2025)"
            badge="Telemetrie 2025"
            subtitle="Nutzungsintensität nach Produktmodulen je Quartal"
          >
            <ChartFigure title="Quartalsverlauf Aktivierung & Scoring" summary={verlaufSummary}>
              <LineChart
                labels={quartale}
                series={CHART_PRODUKT.datasets.map((set, index) => ({
                  name: set.label,
                  values: set.data,
                  tone: index === 0 ? 'cyan' : 'orange',
                  area: set.fill,
                }))}
              />
            </ChartFigure>
          </Panel>
          <Panel
            title="Kündigungsgründe & Churn-Ursachen (2025)"
            badge="Customer Success"
            subtitle="Verteilung der Abwanderungsursachen"
          >
            <ChartFigure title="Kündigungsgründe" summary={churnSummary}>
              <div className="pk-donut-wrap">
                <Donut
                  segments={CHART_CHURN.labels.map((label, index) => ({
                    label,
                    value: churnWerte[index] ?? 0,
                    tone: churnTone[index] ?? 'neutral',
                  }))}
                  centerLabel="Gesamt"
                  centerValue={String(churnGesamt)}
                />
                <div className="pk-donut-side">
                  <BarList
                    items={CHART_CHURN.labels.map((label, index) => ({
                      label,
                      value: churnWerte[index] ?? 0,
                      display: String(churnWerte[index] ?? 0),
                      note:
                        churnGesamt > 0
                          ? `(${Math.round(((churnWerte[index] ?? 0) / churnGesamt) * 100)} %)`
                          : undefined,
                      tone: churnTone[index] ?? 'neutral',
                    }))}
                  />
                </div>
              </div>
            </ChartFigure>
          </Panel>
        </Grid>
      </DataState>
    </div>
  );
}
