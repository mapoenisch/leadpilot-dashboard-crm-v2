import { TREIBER, CHART_TREIBER } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, PageHero, Panel, ToneList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../strategieSeiten.css';

// 067I / G52: Echte Wachstumstreiber-Seite statt WebP — genau eine h1,
// Hebel als Liste, ARR-Wachstumseffekte mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-wachstumstreiber).
// Auftrag 101 (Paket G2, Welle 8): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im
// Original-WebP je Hebel eine Zeile mit Titel, kursivem Hinweis, Leuchtbalken und
// „Basis: ARR 2025“ plus Effekt rechts. Abweichungen vom WebP nach Faktenblatt v1.2 §14:
// „Upsell Starter → Growth“ (nicht „Professional“), Hebelnummern wie in der Kernhebel-Liste.
const BASIS_ARR = '411.840 €';

const ZEILEN: ReadonlyArray<{ titel: string; hinweis: string }> = [
  { titel: 'Trial-to-Paid 18 % → 26 %', hinweis: 'Hebel 2: Guided Product Onboarding Flow' },
  {
    titel: 'Account-Churn 2,8 % → 1,8 %',
    hinweis: 'Hebel 3: ICP-Qualifizierung & Churn-Prävention',
  },
  {
    titel: 'Partner- & Empfehlungsprogramm',
    hinweis: 'Hebel 1: Skalierung Partnernetzwerk (CAC 492 €)',
  },
  { titel: 'ICP-Schärfung & ARPA-Optimierung', hinweis: 'Fokus auf Midmarket & Enterprise' },
  { titel: 'Upsell Starter → Growth', hinweis: 'Feature-Gating und Add-on Expansion' },
];

function formatEffekt(value: number): string {
  return `+${value.toLocaleString('de-DE')} €`;
}

function GrowthDriversPageHtml() {
  const werte = CHART_TREIBER.datasets[0]?.data ?? [];
  const maximum = Math.max(...werte, 1);
  const effektBetrag = (index: number): string =>
    `${(werte[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const treiberSummary =
    `Der größte Effekt kommt aus ${CHART_TREIBER.labels[0]} mit ${effektBetrag(0)}, ` +
    `gefolgt von ${CHART_TREIBER.labels[1]} mit ${effektBetrag(1)} und ` +
    `${CHART_TREIBER.labels[2]} mit ${effektBetrag(2)}.`;
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="strategy-growth">
      <PageHero
        eyebrow="Strategie"
        title={TREIBER.title}
        subtitle="Wachstumstreiber & Sensitivitäts-Effektbaum 2026+."
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
            <ul className="str-hebel">
              {CHART_TREIBER.labels.map((label, index) => {
                const wert = werte[index] ?? 0;
                const zeile = ZEILEN[index] ?? { titel: label, hinweis: '' };
                return (
                  <li key={label} className="str-hebel__zeile">
                    <span className="str-hebel__titel">{zeile.titel}</span>
                    <span className="str-hebel__wert">
                      <span className="str-hebel__basis">Basis: {BASIS_ARR}</span>{' '}
                      <strong>{formatEffekt(wert)}</strong>
                    </span>
                    <span className="str-hebel__hinweis">{zeile.hinweis}</span>
                    <svg className="str-hebel__balken" width="100%" height="10" aria-hidden="true">
                      <rect className="pk-track" x="0" y="0" width="100%" height="10" rx="5" />
                      <rect
                        className="str-hebel__fill"
                        x="0"
                        y="0"
                        width={`${(wert / maximum) * 84}%`}
                        height="10"
                        rx="5"
                      />
                    </svg>
                  </li>
                );
              })}
            </ul>
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
