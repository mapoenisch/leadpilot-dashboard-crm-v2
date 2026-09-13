import React from 'react';
import { BSC } from '../../../domain/strategieData';

interface BSCStep {
  stepNumber: number;
  perspective: { name: string; kpis: string };
  badgeText: string;
  nextConnector?: {
    causeEffectStatement: string;
    fromName: string;
    toName: string;
  };
}

// G39 Welle 4: Akzentfarben je Stufe als Klassen-Lookup (alle vier Werte
// zur Build-Zeit bekannt — kein style-Prop nötig, Entscheidung 2).
const STEP_ACCENT: Record<number, { border: string; badge: string; label: string }> = {
  1: { border: 'border-l-[#00D9C6]', badge: 'bg-[#00D9C6]', label: 'text-[#00D9C6]' },
  2: { border: 'border-l-[#38BDF8]', badge: 'bg-[#38BDF8]', label: 'text-[#38BDF8]' },
  3: { border: 'border-l-[#FFB800]', badge: 'bg-[#FFB800]', label: 'text-[#FFB800]' },
  4: { border: 'border-l-[#FF7A3D]', badge: 'bg-[#FF7A3D]', label: 'text-[#FF7A3D]' },
};
const STEP_ACCENT_FALLBACK = {
  border: 'border-l-[#00D9C6]',
  badge: 'bg-[#00D9C6]',
  label: 'text-[#00D9C6]',
};

export const BalancedScorecardPath: React.FC = () => {
  const perspectives = BSC.perspectives || [];

  const pLernen = perspectives.find((p) => p.name.includes('Lernen')) || {
    name: 'Lernen & Entwicklung',
    kpis: '—',
  };
  const pProzesse = perspectives.find((p) => p.name.includes('Prozesse')) || {
    name: 'Interne Prozesse',
    kpis: '—',
  };
  const pKunden = perspectives.find((p) => p.name.includes('Kunde')) || {
    name: 'Kunden',
    kpis: '—',
  };
  const pFinanzen = perspectives.find((p) => p.name.includes('Finanz')) || {
    name: 'Finanzen',
    kpis: '—',
  };

  const steps: BSCStep[] = [
    {
      stepNumber: 1,
      perspective: pLernen,
      badgeText: 'STUFE 1 · LERNEN & ENTWICKLUNG',
      nextConnector: {
        causeEffectStatement:
          'Personal/Skills → Plattformstabilität und Entwicklungsgeschwindigkeit: Zielgerichtetes Developer-Recruiting und Remote-Strukturen sichern 99,7 % Uptime und beschleunigen Core-Features.',
        fromName: pLernen.name,
        toName: pProzesse.name,
      },
    },
    {
      stepNumber: 2,
      perspective: pProzesse,
      badgeText: 'STUFE 2 · INTERNE PROZESSE',
      nextConnector: {
        causeEffectStatement:
          'Time-to-Value und geführte Trials → Kundenzufriedenheit und weniger Churn: Kürzere Onboarding-Zeiten (< 7 Tage) und geführter Trial-Flow steigern Conversion und senken den monatlichen Churn.',
        fromName: pProzesse.name,
        toName: pKunden.name,
      },
    },
    {
      stepNumber: 3,
      perspective: pKunden,
      badgeText: 'STUFE 3 · KUNDENPERSPEKTIVE',
      nextConnector: {
        causeEffectStatement:
          'Kundenzufriedenheit und effiziente Akquise → ARR und EBITDA: Hoher Net Promoter Score (NPS 34) und günstige Akquisitionskanäle (Mktg-CAC 862 €) sichern wiederkehrende Erlöse und stützen das operative Ergebnis.',
        fromName: pKunden.name,
        toName: pFinanzen.name,
      },
    },
    {
      stepNumber: 4,
      perspective: pFinanzen,
      badgeText: 'STUFE 4 · FINANZEN (ZIELERGEBNIS)',
      nextConnector: undefined,
    },
  ];

  return (
    <section
      className="facelift-bsc-path w-full box-border rounded-[var(--radius-lg,12px)] border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Balanced Scorecard Wirkungsbahn"
    >
      <style>{`
        .bsc-step-card {
          border-radius: var(--radius-md, 10px);
          border: 1px solid var(--color-border);
          background-color: var(--color-surface-subtle, rgba(255, 255, 255, 0.02));
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-sizing: border-box;
          min-width: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .bsc-step-card:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
          border-color: var(--color-primary);
        }
        .bsc-connector-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-md, 8px);
          background-color: rgba(255, 255, 255, 0.015);
          border-left: 3px solid var(--color-primary);
          border-top: 1px dashed var(--color-border);
          border-right: 1px dashed var(--color-border);
          border-bottom: 1px dashed var(--color-border);
          margin: 0 8px;
        }
        .bsc-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
          gap: 8px;
          margin-top: 2px;
        }
        @media (max-width: 600px) {
          .facelift-bsc-path {
            padding: 12px 8px !important;
          }
          .bsc-step-card {
            padding: 12px 10px;
          }
          .bsc-connector-box {
            margin: 0 2px;
            padding: 8px 10px;
            gap: 8px;
          }
          .bsc-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center px-[8px] py-[2px] rounded-[4px] text-[11px] font-bold tracking-[0.05em] uppercase text-primary bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.25)] whitespace-normal">
            BALANCED SCORECARD
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Kausale Wirkungskette nach Kaplan & Norton
          </span>
        </div>
        <h3 className="m-0 text-[clamp(1.1rem,4vw,1.25rem)] font-bold text-text font-display [overflow-wrap:anywhere]">
          Wirkungsbahn: Lernen → Prozesse → Kunde → Finanzen
        </h3>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          Strukturierte Kausalkette der Steuerungsdimensionen: Vom Befähigen der Organisation über
          optimierte Kernprozesse bis zur Kundenzufriedenheit und finanziellen Tragfähigkeit.
        </p>
      </div>

      {/* Kausale Wirkungsbahn in Screenreader- & DOM-Reihenfolge */}
      <div
        role="region"
        aria-label="Kausale Wirkungskette der Balanced Scorecard"
        className="flex flex-col gap-[8px]"
      >
        {steps.map((step) => {
          const kpiItems = (step.perspective.kpis || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const accent = STEP_ACCENT[step.stepNumber] ?? STEP_ACCENT_FALLBACK;

          return (
            <React.Fragment key={step.stepNumber}>
              {/* Perspektiven-Karte */}
              <article
                className={`bsc-step-card border-l-4 ${accent.border}`}
                tabIndex={0}
                aria-label={`${step.badgeText}: ${step.perspective.name}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-[8px]">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    <span
                      className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-extrabold text-[#001A17] ${accent.badge}`}
                    >
                      {step.stepNumber}
                    </span>
                    <span
                      className={`text-[11px] font-bold tracking-[0.04em] uppercase ${accent.label}`}
                    >
                      {step.badgeText}
                    </span>
                  </div>
                  <strong className="text-[14px] text-text">{step.perspective.name}</strong>
                </div>

                {/* KPIs der Perspektive */}
                <div className="bsc-kpi-grid">
                  {kpiItems.map((kpi, kIdx) => (
                    <div
                      key={kIdx}
                      className="px-[10px] py-[6px] rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-solid border-border text-[12.5px] text-text font-medium [overflow-wrap:anywhere] box-border min-w-0"
                    >
                      {kpi}
                    </div>
                  ))}
                </div>
              </article>

              {/* Gerichteter Kausalverbinder */}
              {step.nextConnector && (
                <div
                  role="separator"
                  aria-label={`Wirkungsübergang von ${step.nextConnector.fromName} nach ${step.nextConnector.toName}`}
                  className="bsc-connector-box"
                >
                  <span className="text-[18px] text-primary shrink-0 leading-[1]">⬇</span>
                  <p className="m-0 text-[12px] text-[var(--color-text-muted)] leading-[1.45] [overflow-wrap:anywhere]">
                    <strong className="text-text">Kausalitätsbrücke: </strong>
                    {step.nextConnector.causeEffectStatement}
                  </p>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};
