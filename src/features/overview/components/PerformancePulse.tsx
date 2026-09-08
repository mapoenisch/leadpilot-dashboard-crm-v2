import React, { useState } from 'react';
import { HIGHLIGHTS_GOOD_ROWS, HIGHLIGHTS_BAD_ROWS } from '../../../domain/execData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';
import { Table } from '../../../components/ui/Table';

export const PerformancePulse: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  const stationsCount = Math.max(HIGHLIGHTS_BAD_ROWS.length, HIGHLIGHTS_GOOD_ROWS.length);

  return (
    <div
      className="facelift-performance-pulse"
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
          marginBottom: 'var(--space-6)',
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
            Performance-Puls 2025
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Zentrale Jahresachse 2025: Operative Herausforderungen (links) und Erfolge (rechts).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="performance-pulse-raw-table"
          aria-expanded={showTable}
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
          {showTable ? 'Tabellen verbergen' : 'Tabellen anzeigen'}
        </button>
      </div>

      {/* Desktop Ansicht: Symmetrische vertikale Achse (>= 768px) */}
      <div className="performance-pulse-desktop" style={{ position: 'relative' }}>
        {/* Achsenkopf */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Jahresachse 2025
          </span>
        </div>

        {/* Die Stationen entlang der Achse */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', position: 'relative' }}>
          {/* Durchgehende vertikale Achsenlinie im Hintergrund */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              bottom: '10px',
              left: '50%',
              width: '2px',
              backgroundColor: 'var(--color-border)',
              transform: 'translateX(-50%)',
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          {Array.from({ length: stationsCount }).map((_, i) => {
            const bad = HIGHLIGHTS_BAD_ROWS[i];
            const good = HIGHLIGHTS_GOOD_ROWS[i];

            return (
              <div
                key={`station-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 48px 1fr',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Linke Seite: Herausforderung */}
                {bad ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: 'var(--color-bg-deep)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255, 122, 61, 0.3)',
                        borderLeft: '3px solid var(--color-accent)',
                        padding: 'var(--space-3) var(--space-4)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-2)',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            fontFamily: 'var(--font-display)',
                            color: 'var(--color-text)',
                          }}
                        >
                          {bad[0]}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FaceliftGlyph name="challenge" tone="attention" size={14} />
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--color-accent)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                            }}
                          >
                            Herausforderung
                          </span>
                        </div>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-muted)',
                          lineHeight: 1.4,
                        }}
                      >
                        {bad[1]}
                      </p>
                    </div>
                    {/* Horizontaler Verbinder zur Achse */}
                    <div
                      style={{
                        width: '24px',
                        height: '1px',
                        backgroundColor: 'rgba(255, 122, 61, 0.4)',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                ) : (
                  <div />
                )}

                {/* Zentraler Achsenknoten */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-surface)',
                      border: '2px solid var(--color-border)',
                      boxShadow: '0 0 8px rgba(0, 217, 198, 0.2)',
                    }}
                    aria-hidden="true"
                  />
                </div>

                {/* Rechte Seite: Erfolg */}
                {good ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {/* Horizontaler Verbinder zur Achse */}
                    <div
                      style={{
                        width: '24px',
                        height: '1px',
                        backgroundColor: 'rgba(0, 217, 198, 0.4)',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: 'var(--color-bg-deep)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(0, 217, 198, 0.3)',
                        borderRight: '3px solid var(--color-primary)',
                        padding: 'var(--space-3) var(--space-4)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-2)',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            fontFamily: 'var(--font-display)',
                            color: 'var(--color-text)',
                          }}
                        >
                          {good[0]}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FaceliftGlyph name="success" tone="positive" size={14} />
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--color-primary)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                            }}
                          >
                            Erfolg
                          </span>
                        </div>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-muted)',
                          lineHeight: 1.4,
                        }}
                      >
                        {good[1]}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>

        {/* Achsenende */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <span
            style={{
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Abschluss Geschäftsjahr 2025
          </span>
        </div>
      </div>

      {/* Mobile Styles via integriertem style-Block (für Schirme < 768px) */}
      <style>{`
        @media (max-width: 767px) {
          .performance-pulse-desktop {
            display: none !important;
          }
          .performance-pulse-mobile {
            display: flex !important;
          }
        }
        @media (min-width: 768px) {
          .performance-pulse-mobile {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Ansicht: Vertikaler Ablauf entlang der linken Achse (< 768px) */}
      <div
        className="performance-pulse-mobile"
        style={{
          display: 'none',
          flexDirection: 'column',
          position: 'relative',
          paddingLeft: '24px',
          gap: 'var(--space-4)',
        }}
      >
        {/* Durchgehende linke Achsenlinie */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            bottom: '8px',
            left: '7px',
            width: '2px',
            backgroundColor: 'var(--color-border)',
          }}
          aria-hidden="true"
        />

        {Array.from({ length: stationsCount }).map((_, i) => {
          const bad = HIGHLIGHTS_BAD_ROWS[i];
          const good = HIGHLIGHTS_GOOD_ROWS[i];

          return (
            <React.Fragment key={`mob-station-${i}`}>
              {/* Herausforderung Mobile */}
              {bad && (
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-21px',
                      top: '14px',
                      width: '10px',
                      height: '10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-accent)',
                      boxShadow: '0 0 6px rgba(255, 122, 61, 0.4)',
                    }}
                    aria-hidden="true"
                  />
                  <div
                    style={{
                      backgroundColor: 'var(--color-bg-deep)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 122, 61, 0.3)',
                      borderLeft: '3px solid var(--color-accent)',
                      padding: 'var(--space-3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-display)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {bad[0]}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <FaceliftGlyph name="challenge" tone="attention" size={12} />
                        <span
                          style={{
                            fontSize: '0.625rem',
                            color: 'var(--color-accent)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                          }}
                        >
                          Herausforderung
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      {bad[1]}
                    </p>
                  </div>
                </div>
              )}

              {/* Erfolg Mobile */}
              {good && (
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-21px',
                      top: '14px',
                      width: '10px',
                      height: '10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 0 6px rgba(0, 217, 198, 0.4)',
                    }}
                    aria-hidden="true"
                  />
                  <div
                    style={{
                      backgroundColor: 'var(--color-bg-deep)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(0, 217, 198, 0.3)',
                      borderLeft: '3px solid var(--color-primary)',
                      padding: 'var(--space-3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-display)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {good[0]}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <FaceliftGlyph name="success" tone="positive" size={12} />
                        <span
                          style={{
                            fontSize: '0.625rem',
                            color: 'var(--color-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                          }}
                        >
                          Erfolg
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      {good[1]}
                    </p>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Ausklappbare Tabellen-Ansichten */}
      {showTable && (
        <div
          id="performance-pulse-raw-table"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 var(--space-2)', fontSize: '0.875rem', color: 'var(--color-accent)' }}>
              Herausforderungen (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'Kategorie' },
                { key: '1', label: 'Handlungsbedarf' },
              ]}
              rows={HIGHLIGHTS_BAD_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>
          <div>
            <h4 style={{ margin: '0 0 var(--space-2)', fontSize: '0.875rem', color: 'var(--color-primary)' }}>
              Top Erfolge (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'Kategorie' },
                { key: '1', label: 'Ergebnis' },
              ]}
              rows={HIGHLIGHTS_GOOD_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};
