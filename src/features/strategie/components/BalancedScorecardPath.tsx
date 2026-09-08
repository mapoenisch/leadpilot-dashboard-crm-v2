import React from 'react';
import { BSC } from '../../../domain/strategieData';

interface BSCStep {
  stepNumber: number;
  perspective: { name: string; kpis: string };
  badgeText: string;
  accentColor: string;
  nextConnector?: {
    causeEffectStatement: string;
    fromName: string;
    toName: string;
  };
}

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
      accentColor: '#00D9C6',
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
      accentColor: '#38BDF8',
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
      accentColor: '#FFB800',
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
      accentColor: '#FF7A3D',
      nextConnector: undefined,
    },
  ];

  return (
    <section
      className="facelift-bsc-path"
      aria-label="Balanced Scorecard Wirkungsbahn"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5, 20px)',
        overflowWrap: 'anywhere',
      }}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(0, 217, 198, 0.12)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              whiteSpace: 'normal',
            }}
          >
            BALANCED SCORECARD
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Kausale Wirkungskette nach Kaplan & Norton
          </span>
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 'clamp(1.1rem, 4vw, 1.25rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
            overflowWrap: 'anywhere',
          }}
        >
          Wirkungsbahn: Lernen → Prozesse → Kunde → Finanzen
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Strukturierte Kausalkette der Steuerungsdimensionen: Vom Befähigen der Organisation über optimierte Kernprozesse bis zur Kundenzufriedenheit und finanziellen Tragfähigkeit.
        </p>
      </div>

      {/* Kausale Wirkungsbahn in Screenreader- & DOM-Reihenfolge */}
      <div
        role="region"
        aria-label="Kausale Wirkungskette der Balanced Scorecard"
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {steps.map((step) => {
          const kpiItems = (step.perspective.kpis || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

          return (
            <React.Fragment key={step.stepNumber}>
              {/* Perspektiven-Karte */}
              <article
                className="bsc-step-card"
                tabIndex={0}
                aria-label={`${step.badgeText}: ${step.perspective.name}`}
                style={{
                  borderLeft: `4px solid ${step.accentColor}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: step.accentColor,
                        color: '#001A17',
                      }}
                    >
                      {step.stepNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: step.accentColor,
                        textTransform: 'uppercase',
                      }}
                    >
                      {step.badgeText}
                    </span>
                  </div>
                  <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                    {step.perspective.name}
                  </strong>
                </div>

                {/* KPIs der Perspektive */}
                <div className="bsc-kpi-grid">
                  {kpiItems.map((kpi, kIdx) => (
                    <div
                      key={kIdx}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--color-border)',
                        fontSize: '12.5px',
                        color: 'var(--color-text)',
                        fontWeight: 500,
                        overflowWrap: 'anywhere',
                        boxSizing: 'border-box',
                        minWidth: 0,
                      }}
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
                  <span
                    style={{
                      fontSize: '18px',
                      color: 'var(--color-primary)',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ⬇
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.45,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <strong style={{ color: 'var(--color-text)' }}>Kausalitätsbrücke: </strong>
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
