import React, { useState } from 'react';
import { BRIDGES_ROWS, SOURCES_ROWS, NOTE_DATEN } from '../../../domain/execData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';
import { Table } from '../../../components/ui/Table';

export const SourceDecisionFlow: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div
      className="facelift-source-decision-flow"
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
            Datenfluss: Source → Bridge → Decision
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Gerichteter Ablauf von den verbindlichen Primärquellen über die Systemschnittstellen zur einheitlichen Entscheidungsbasis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="source-decision-raw-table"
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
          {showTable ? 'Detailtabellen verbergen' : 'Detailtabellen anzeigen'}
        </button>
      </div>

      {/* Responsive Styles für Verbinder */}
      <style>{`
        .flow-connector-horizontal {
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 0 var(--space-1);
        }
        .flow-connector-vertical {
          display: none;
          align-items: center;
          justifyContent: center;
          padding: var(--space-2) 0;
        }
        @media (max-width: 960px) {
          .source-flow-grid {
            grid-template-columns: 1fr !important;
          }
          .flow-connector-horizontal {
            display: none !important;
          }
          .flow-connector-vertical {
            display: flex !important;
          }
        }
      `}</style>

      {/* Gerichteter Datenfluss mit sichtbaren Verbindern */}
      <div
        className="source-flow-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 32px 1fr 32px 1fr',
          alignItems: 'stretch',
          gap: 0,
        }}
      >
        {/* Phase 01: Primäre Datenquellen */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                }}
              >
                PHASE 01
              </span>
              <FaceliftGlyph name="ready" tone="neutral" size={16} />
            </div>

            <h4
              style={{
                margin: '0 0 var(--space-3)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '0.01em',
              }}
            >
              Primäre Datenquellen
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {SOURCES_ROWS.map(([quelle, zweck]) => (
                <div
                  key={quelle}
                  style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-soft)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {quelle}
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      lineHeight: 1.35,
                    }}
                  >
                    {zweck}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verbinder 1 -> 2 (Desktop Horizontal) */}
        <div className="flow-connector-horizontal" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m-5-5l5 5-5 5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 1 -> 2 (Mobile Vertikal) */}
        <div className="flow-connector-vertical" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14m-5-5l5 5 5-5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 02: Systemschnittstellen & Datenfluss */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                }}
              >
                PHASE 02
              </span>
              <FaceliftGlyph name="focus" tone="accent" size={16} />
            </div>

            <h4
              style={{
                margin: '0 0 var(--space-3)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '0.01em',
              }}
            >
              Systemschnittstellen
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {BRIDGES_ROWS.map(([system, zweck]) => (
                <div
                  key={system}
                  style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-soft)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {system}
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      lineHeight: 1.35,
                    }}
                  >
                    {zweck}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verbinder 2 -> 3 (Desktop Horizontal) */}
        <div className="flow-connector-horizontal" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m-5-5l5 5-5 5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 2 -> 3 (Mobile Vertikal) */}
        <div className="flow-connector-vertical" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14m-5-5l5 5 5-5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 03: Konsistente Entscheidungsbasis */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0, 217, 198, 0.3)',
            boxShadow: '0 0 16px rgba(0, 217, 198, 0.08)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}
              >
                PHASE 03
              </span>
              <FaceliftGlyph name="contactToCustomer" tone="positive" size={16} />
            </div>

            <h4
              style={{
                margin: '0 0 var(--space-3)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '0.01em',
              }}
            >
              {NOTE_DATEN.title}
            </h4>

            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  color: 'var(--color-text)',
                  lineHeight: 1.45,
                }}
              >
                {NOTE_DATEN.paragraphs[0]}
              </p>
            </div>
          </div>

          <div
            style={{
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--color-border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
              }}
            >
              Single Source of Truth
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--cyan-a12)',
                color: 'var(--color-primary)',
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                border: '1px solid rgba(0, 217, 198, 0.3)',
              }}
            >
              Entscheidungsreif
            </span>
          </div>
        </div>
      </div>

      {/* Detailtabellen als Fallback */}
      {showTable && (
        <div
          id="source-decision-raw-table"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text)' }}>
              Systemschnittstellen & Datenfluss (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'System' },
                { key: '1', label: 'Verwendungszweck' },
              ]}
              rows={BRIDGES_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>

          <div>
            <h4 style={{ margin: '0 0 var(--space-2)', fontSize: '0.875rem', color: 'var(--color-text)' }}>
              Verwendete Datenquellen (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'Quelle' },
                { key: '1', label: 'Zweck' },
              ]}
              rows={SOURCES_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};
