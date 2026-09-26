import { TREIBER, CHART_TREIBER } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { BarList, ChartFigure, PageHero, Panel, ToneList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G52: Echte Wachstumstreiber-Seite statt WebP — genau eine h1,
// Hebel als Liste, ARR-Wachstumseffekte mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-wachstumstreiber).
function GrowthDriversPageHtml() {
  const werte = CHART_TREIBER.datasets[0]?.data ?? [];
  const effektBetrag = (index: number): string =>
    `${(werte[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const treiberSummary =
    `Der größte Effekt kommt aus ${CHART_TREIBER.labels[0]} mit ${effektBetrag(0)}, ` +
    `gefolgt von ${CHART_TREIBER.labels[1]} mit ${effektBetrag(1)} und ` +
    `${CHART_TREIBER.labels[2]} mit ${effektBetrag(2)}.`;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Strategie"
        title={TREIBER.title}
        subtitle={`Die ${TREIBER.drivers.length} Hebel für das ARR-Wachstum ab 2026.`}
        pills={['Wachstumstreiber', 'Sensitivitätsmodell 2026+']}
      />
      <DataState
        status={TREIBER.drivers.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Wachstumstreiber erfasst."
      >
        <Panel
          title="ARR-Wachstumseffekte der Kernhebel (€)"
          badge="Sensitivitätsmodell 2026"
          subtitle="Quantifizierter Mehrwert je strategischem Wachstumshebel auf den ARR 2026"
        >
          <ChartFigure
            title={CHART_TREIBER.datasets[0]?.label ?? 'ARR-Wachstumseffekt'}
            summary={treiberSummary}
          >
            <BarList
              items={CHART_TREIBER.labels.map((label, index) => ({
                label,
                value: werte[index] ?? 0,
                display: `+${(werte[index] ?? 0).toLocaleString('de-DE')} €`,
                tone: index < 2 ? 'cyan' : 'mint',
              }))}
            />
          </ChartFigure>
        </Panel>
        <Panel
          title="Strategische Kernhebel im Überblick"
          tone="orange"
          toneTitle
          chip={`${TREIBER.drivers.length} Hebel definiert`}
        >
          <ToneList items={TREIBER.drivers} tone="orange" />
        </Panel>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function GrowthDriversPage() {
  return (
    <ImagePage page="strategy-growth">
      <GrowthDriversPageHtml />
    </ImagePage>
  );
}
