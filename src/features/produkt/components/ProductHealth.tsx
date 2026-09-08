import React, { useState } from 'react';
import { PERF } from '../../../domain/produktData';

export const ProductHealth: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  // 6 Kennzahlen sachlich gruppiert in die drei Säulen Stabilität, Nutzung und Onboarding
  // Zielstatus wird automatisch aus dem Werttext abgeleitet (enthält 'erreicht' vs 'verfehlt')
  const healthGroups = [
    {
      id: 'stabilitaet',
      title: 'Stabilität',
      explanation: 'Verfügbarkeit + Support-Tickets: Messung der Systemstabilität und Servicezuverlässigkeit.',
      metrics: [PERF.metrics[0], PERF.metrics[5]],
    },
    {
      id: 'nutzung',
      title: 'Nutzung',
      explanation: 'WAU/MAU + KI-Scoring-Nutzung: Messung der regelmäßigen Plattform- und Feature-Aktivität.',
      metrics: [PERF.metrics[2], PERF.metrics[3]],
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      explanation: 'Aktivierungsrate + Time-to-First-Action: Messung des initialen Einstiegs und der Nutzeraktivierung.',
      metrics: [PERF.metrics[1], PERF.metrics[4]],
    },
  ];

  return (
    <div
      className="facelift-product-health"
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
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--cyan-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '2px',
            }}
          >
            Produktgesundheit • Qualitätsmatrix
          </div>
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
            {PERF.title}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Gegliedert in die drei Säulen Stabilität, Nutzung und Onboarding mit abgeleitetem Zielstatus.
          </p>
        </div>

        {/* Legende & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              Ziel erreicht
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
              Ziel verfehlt
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            aria-controls="product-health-table"
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
            {showTable ? 'Tabelle verbergen' : 'Tabelle anzeigen'}
          </button>
        </div>
      </div>

      {/* DREI PERFORMANCE-SÄULEN (STABILITÄT, NUTZUNG, ONBOARDING) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {healthGroups.map((group) => (
          <div
            key={group.id}
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              {/* Gruppenkopf */}
              <div
                style={{
                  borderBottom: '1px solid var(--color-border-soft)',
                  paddingBottom: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 4px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}
                >
                  {group.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {group.explanation}
                </p>
              </div>

              {/* Kennzahlen der Säule */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {group.metrics.map((m) => {
                  // Zielstatus direkt aus dem vorhandenen Werttext ableiten
                  const isReached = m.val.toLowerCase().includes('erreicht');
                  return (
                    <div
                      key={m.label}
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: isReached
                          ? '1px solid rgba(0, 217, 198, 0.3)'
                          : '1px solid rgba(255, 122, 61, 0.3)',
                        borderLeft: isReached
                          ? '3px solid var(--color-primary)'
                          : '3px solid var(--color-accent)',
                        padding: 'var(--space-3)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                          marginBottom: '4px',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {m.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.0625rem',
                          fontWeight: 700,
                          color: isReached ? 'var(--color-primary)' : 'var(--color-accent)',
                          lineHeight: 1.3,
                        }}
                      >
                        {m.val}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ausklappbare Original-Tabelle */}
      {showTable && (
        <div
          id="product-health-table"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            Vollständige Liste der Leistungskennzahlen (Originaldaten):
          </div>
          {PERF.metrics.map((m) => (
            <div
              key={m.label}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'var(--color-bg-deep)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text)', fontWeight: 500 }}>
                {m.label}
              </span>
              <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>
                {m.val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
