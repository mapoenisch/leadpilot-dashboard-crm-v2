import React, { useState } from 'react';
import { HISTORIE } from '../../../domain/unternehmenData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';

export const FundingTimeline: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  // 4 gemeinsame Zeitachsen-Stationen direkt aus HISTORIE.events abgeleitet
  // events[0]: 21.07.2022 - Gründung
  // events[1]: Mai 2023 - Wandeldarlehen
  // events[2]: Q1 2024 - Seed
  // events[3]: Q1 2024 - Launch
  // events[4]: Dez 2025 - Abschluss GJ 2025
  const columns = [
    {
      period: '21.07.2022',
      capitalEvent: HISTORIE.events[0],
      productEvent: null,
      hasConnector: false,
    },
    {
      period: 'Mai 2023',
      capitalEvent: HISTORIE.events[1],
      productEvent: null,
      hasConnector: false,
    },
    {
      period: 'Q1 2024',
      capitalEvent: HISTORIE.events[2],
      productEvent: HISTORIE.events[3],
      hasConnector: true,
    },
    {
      period: 'Dez 2025',
      capitalEvent: null,
      productEvent: HISTORIE.events[4],
      hasConnector: false,
    },
  ];

  return (
    <div
      className="facelift-funding-timeline"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-soft)',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            Gemeinsame Gründungs- & Entwicklungszeitachse
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Synchronisierte Chronologie: Oben Kapital & Recht, unten Produkt & Markt mit senkrechtem Ermöglichungs-Verbinder.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-controls="funding-timeline-details"
          aria-expanded={showDetails}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 12px',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {showDetails ? 'Ereignisliste verbergen' : 'Ereignisliste anzeigen'}
        </button>
      </div>

      {/* Responsive Styles für 4 Spalten auf Desktop vs gestapelt auf Mobile */}
      <style>{`
        .funding-grid-desktop {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          align-items: stretch;
        }
        .timeline-slot-mobile {
          display: none;
        }
        @media (max-width: 860px) {
          .funding-grid-desktop {
            display: none !important;
          }
          .timeline-slot-mobile {
            display: flex !important;
            flex-direction: column;
            gap: var(--space-4);
          }
        }
      `}</style>

      {/* DESKTOP-ANSICHT: 4 gemeinsame Spalten mit synchronisierten Spuren */}
      <div className="funding-grid-desktop">
        {columns.map((col) => (
          <div
            key={col.period}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            {/* Spaltenkopf: Datum */}
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-soft)',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: col.hasConnector ? 'var(--color-primary)' : 'var(--color-text)',
              }}
            >
              {col.period}
            </div>

            {/* OBERE SPUR: Kapital & Recht */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--cyan-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-1)',
                  fontWeight: 600,
                }}
              >
                Kapital & Recht
              </div>

              {col.capitalEvent ? (
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--color-bg-deep)',
                    borderRadius: 'var(--radius-md)',
                    border: col.hasConnector
                      ? '1px solid rgba(0, 217, 198, 0.4)'
                      : '1px solid var(--color-border-soft)',
                    borderTop: col.hasConnector
                      ? '3px solid var(--color-primary)'
                      : '3px solid var(--color-border)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin: '0 0 var(--space-1)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                      }}
                    >
                      {col.capitalEvent.title}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      {col.capitalEvent.desc}
                    </p>
                  </div>
                </div>
              ) : (
                /* Leere Zelle sichtbar als Teil der gemeinsamen Zeitachse */
                <div
                  style={{
                    flex: 1,
                    minHeight: '80px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--color-border-soft)',
                    backgroundColor: 'rgba(6, 22, 19, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-border)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  —
                </div>
              )}
            </div>

            {/* MITTELBEREICH: Senkrechter Verbinder in Spalte Q1 2024 */}
            <div
              style={{
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {col.hasConnector ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--cyan-a12)',
                    border: '1px solid rgba(0, 217, 198, 0.4)',
                    color: 'var(--color-primary)',
                    fontSize: '0.625rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M5 1v8m-3-3l3 3 3-3" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Ermöglicht Launch</span>
                </div>
              ) : (
                <div
                  style={{
                    width: '1px',
                    height: '100%',
                    backgroundColor: 'var(--color-border-soft)',
                  }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* UNTERE SPUR: Produkt & Markt */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-1)',
                  fontWeight: 600,
                }}
              >
                Produkt & Markt
              </div>

              {col.productEvent ? (
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--color-bg-deep)',
                    borderRadius: 'var(--radius-md)',
                    border: col.hasConnector
                      ? '1px solid rgba(0, 217, 198, 0.4)'
                      : '1px solid var(--color-border-soft)',
                    borderTop: col.hasConnector
                      ? '3px solid var(--color-primary)'
                      : '3px solid var(--color-border)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div>
                    <h4
                      style={{
                        margin: '0 0 var(--space-1)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                      }}
                    >
                      {col.productEvent.title}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      {col.productEvent.desc}
                    </p>
                  </div>
                </div>
              ) : (
                /* Leere Zelle sichtbar als Teil der gemeinsamen Zeitachse */
                <div
                  style={{
                    flex: 1,
                    minHeight: '80px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--color-border-soft)',
                    backgroundColor: 'rgba(6, 22, 19, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-border)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  —
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE / TABLET ANSICHT: Gemeinsame Stationen mit sichtbaren Spuren */}
      <div className="timeline-slot-mobile">
        {columns.map((col) => (
          <div
            key={`mob-${col.period}`}
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: col.hasConnector
                ? '1px solid rgba(0, 217, 198, 0.4)'
                : '1px solid var(--color-border-soft)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {/* Datum */}
            <div
              style={{
                display: 'inline-block',
                alignSelf: 'flex-start',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: col.hasConnector ? 'var(--color-primary)' : 'var(--color-text)',
              }}
            >
              {col.period}
            </div>

            {/* Kapital & Recht */}
            <div style={{ paddingLeft: 'var(--space-2)', borderLeft: '2px solid var(--cyan-light)' }}>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-light)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Kapital & Recht
              </div>
              {col.capitalEvent ? (
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    {col.capitalEvent.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                    {col.capitalEvent.desc}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</div>
              )}
            </div>

            {/* Senkrechter Verbinder in Q1 2024 */}
            {col.hasConnector && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--cyan-a12)',
                  border: '1px solid rgba(0, 217, 198, 0.4)',
                  color: 'var(--color-primary)',
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M5 1v8m-3-3l3 3 3-3" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Finanzierung ermöglicht Produkt-Launch (GA)</span>
              </div>
            )}

            {/* Produkt & Markt */}
            <div style={{ paddingLeft: 'var(--space-2)', borderLeft: '2px solid var(--color-primary)' }}>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Produkt & Markt
              </div>
              {col.productEvent ? (
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    {col.productEvent.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                    {col.productEvent.desc}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ausklappbare Detail-Ereignisliste */}
      {showDetails && (
        <div
          id="funding-timeline-details"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            Vollständige Meilensteine (Original-Historie):
          </div>
          {HISTORIE.events.map((e, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                alignItems: 'center',
                backgroundColor: 'var(--color-bg-deep)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <div
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}
              >
                {e.date}
              </div>
              <div>
                <div style={{ color: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600 }}>
                  {e.title}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                  {e.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
