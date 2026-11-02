import { OKR, CHART_OKR } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, PageHero, Panel, ToneList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { GroupedDepthColumns } from '@/features/vertrieb/components/GroupedDepthColumns';
import '../strategieSeiten.css';

// 067I / G52: Echte OKR-Seite statt WebP — genau eine h1, Objectives mit
// Key Results als Listen, Basis/Ziel-Vergleich mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-ziele-okrs).
// Auftrag 101 (Paket G2, Welle 8): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im
// Original-WebP alle acht Steuerungsgrößen als 3D-Säulenpaare (Basis hell, Ziel cyan) ohne
// Achsenwerte, Legende darunter; Objectives mit cyanfarbener Kante links.
const BASIS = 'color-mix(in srgb, var(--color-primary) 45%, white)';
const ZIEL = 'var(--color-primary)';

function formatOkrWert(value: number): string {
  return value.toLocaleString('de-DE');
}

function OkrsPageHtml() {
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
    <div className="pk-page" data-ruhig="true" data-page-key="strategy-okrs">
      <PageHero
        eyebrow="Strategie"
        title={OKR.title}
        subtitle="Ziele und Schlüsselergebnisse für 2026."
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
            <GroupedDepthColumns
              idPrefix="okr-ziele"
              height={230}
              maxBarWidth={36}
              plotLeft={16}
              regionLabel="Basis- und Zielwerte 2026, waagerecht scrollbar"
              labels={CHART_OKR.labels}
              series={[
                { name: basis?.label ?? 'Basiswert 2025', values: basis?.data ?? [], color: BASIS },
                { name: ziel?.label ?? 'Zielwert 2026', values: ziel?.data ?? [], color: ZIEL },
              ]}
              formatTick={() => ''}
              datenTabelle={(value) => formatOkrWert(value)}
            />
          </ChartFigure>
        </Panel>
        {OKR.objectives.map((objective, index) => (
          <Panel
            key={objective.title}
            className="str-objective"
            title={`Objective ${index + 1}: ${objective.title}`}
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

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function OkrsPage() {
  return (
    <ImagePage page="strategy-okrs">
      <OkrsPageHtml />
    </ImagePage>
  );
}
