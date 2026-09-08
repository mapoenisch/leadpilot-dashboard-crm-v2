import React from 'react';
import { OKR } from '../../../domain/strategieData';

interface ParsedKR {
  krId: string;
  label: string;
  fromVal: string;
  toVal: string;
  note?: string;
}

const KR_REGEX = /(KR \d+): (.+?) von (.+?) auf (.+?)(?: \((.+?)\))?$/;

function parseKeyResult(rawText: string): ParsedKR {
  const match = rawText.match(KR_REGEX);
  if (!match) {
    return {
      krId: 'KR',
      label: rawText,
      fromVal: '—',
      toVal: '—',
    };
  }
  return {
    krId: match[1],
    label: match[2],
    fromVal: match[3],
    toVal: match[4],
    note: match[5],
  };
}

export const GoalRunway: React.FC = () => {
  const objectives = OKR.objectives || [];

  return (
    <section
      className="facelift-goal-runway"
      aria-label="Ziel-Startbahn OKR"
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
        .runway-card-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .runway-track {
          display: grid;
          grid-template-columns: minmax(130px, 160px) 1fr minmax(130px, 160px);
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: var(--radius-md, 8px);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--color-border);
        }
        .runway-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          min-width: 0;
          padding: 0 8px;
        }
        .runway-connector-line {
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, rgba(0, 217, 198, 0.25) 0%, rgba(0, 217, 198, 0.8) 100%);
          border-radius: 2px;
          position: relative;
        }
        @media (max-width: 650px) {
          .facelift-goal-runway {
            padding: 12px 8px !important;
          }
          .runway-track {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 12px 10px;
          }
          .runway-connector {
            padding: 4px 0;
          }
          .runway-connector-line {
            height: 2px;
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
            ZIEL-STARTBAHN
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Ausgangspunkt, Zwischenetappen & Zielkorridore 2026
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
          {OKR.title}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Visualisierung der Startbahn-Etappen je strategischem Objective: Basis 2025, Fortschrittsverlauf und Lücke zur Zielstation 2026.
        </p>
      </div>

      {/* Objectives Liste */}
      <div className="runway-card-grid" role="region" aria-label="OKR Startbahnen">
        {objectives.map((obj, objIdx) => {
          const parsedKrs = (obj.krs || []).map(parseKeyResult);

          return (
            <article
              key={objIdx}
              style={{
                borderRadius: 'var(--radius-md, 10px)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.01))',
                padding: 'var(--space-4, 16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minWidth: 0,
                boxSizing: 'border-box',
                overflowWrap: 'anywhere',
              }}
            >
              {/* Objective Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: '8px',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '10px',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-display)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {obj.title}
                </h4>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    backgroundColor: 'rgba(0, 217, 198, 0.08)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  {parsedKrs.length} Key Results
                </span>
              </div>

              {/* Startbahnen der Key Results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {parsedKrs.map((kr, krIdx) => (
                  <div key={krIdx} className="runway-track">
                    {/* Basiswert 2025 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            color: 'var(--color-text-muted)',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          {kr.krId}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Basis 2025
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-display)',
                          marginTop: '2px',
                        }}
                      >
                        {kr.fromVal}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                        {kr.label}
                      </div>
                    </div>

                    {/* Startbahn-Verlauf & Lücke */}
                    <div className="runway-connector">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                          width: '100%',
                          textAlign: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary)',
                          }}
                        >
                          Lücke zur Zielstation
                        </span>
                        {kr.note && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(0, 217, 198, 0.12)',
                              color: 'var(--color-primary)',
                              border: '1px solid rgba(0, 217, 198, 0.25)',
                            }}
                          >
                            {kr.note}
                          </span>
                        )}
                      </div>
                      <div className="runway-connector-line" />
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>Zeithorizont GJ 2026</span>
                        <span>➔</span>
                      </div>
                    </div>

                    {/* Zielwert 2026 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        minWidth: 0,
                        alignItems: 'flex-start',
                        backgroundColor: 'rgba(0, 217, 198, 0.05)',
                        border: '1px solid rgba(0, 217, 198, 0.2)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            color: '#001A17',
                            backgroundColor: 'var(--color-primary, #00D9C6)',
                          }}
                        >
                          ZIEL 2026
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                          Zielstation
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          fontFamily: 'var(--font-display)',
                          marginTop: '2px',
                        }}
                      >
                        {kr.toVal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
