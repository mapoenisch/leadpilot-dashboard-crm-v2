import { Target } from 'lucide-react';
import { OKR, CHART_OKR } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, ColumnChart, PageHero, Panel, ToneList } from '@/components/pageKit';

// 067I / G52: Echte OKR-Seite statt WebP — genau eine h1, Objectives mit
// Key Results als Listen, Basis/Ziel-Vergleich mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-ziele-okrs).
function formatOkrWert(value: number): string {
  return value.toLocaleString('de-DE');
}

export function OkrsPage() {
  const basis = CHART_OKR.datasets[0];
  const ziel = CHART_OKR.datasets[1];
  const wert = (reihe: number, index: number): string =>
    formatOkrWert(CHART_OKR.datasets[reihe]?.data[index] ?? 0);
  const summary =
    `Alle ${CHART_OKR.labels.length} Steuerungsgrößen verbessern sich: ` +
    `${CHART_OKR.labels[0]} von ${wert(0, 0)} auf ${wert(1, 0)}, ` +
    `${CHART_OKR.labels[1]} von ${wert(0, 1)} auf ${wert(1, 1)}, ` +
    `${CHART_OKR.labels[2]} von ${wert(0, 2)} auf ${wert(1, 2)} Prozent ` +
    `bei sinkendem ${CHART_OKR.labels[3]}.`;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Strategie"
        title={OKR.title}
        subtitle="Objectives mit messbaren Key Results für 2026."
        pills={['OKR 2026', `${OKR.objectives.length} Objectives`]}
      />
      <DataState
        status={OKR.objectives.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Objectives erfasst."
      >
        <Panel
          title="Zielerreichung & Zielkorridore (Basis 2025 vs. Ziel 2026)"
          badge="OKR 2026"
          subtitle="Gegenüberstellung strategischer Zielwerte der OKR-Planung"
        >
          <ChartFigure title="Basis- vs. Zielwerte 2026" summary={summary}>
            <ColumnChart
              labels={CHART_OKR.labels}
              series={[
                { name: basis?.label ?? 'Basis', values: basis?.data ?? [], tone: 'mint' },
                { name: ziel?.label ?? 'Ziel', values: ziel?.data ?? [], tone: 'cyan' },
              ]}
            />
          </ChartFigure>
        </Panel>
        {OKR.objectives.map((objective, index) => (
          <Panel
            key={objective.title}
            title={`Objective ${index + 1}: ${objective.title}`}
            icon={Target}
            toneTitle
            chip={`${objective.krs.length} Key Results`}
            chipTone="neutral"
          >
            <ToneList items={objective.krs} />
          </Panel>
        ))}
      </DataState>
    </div>
  );
}
