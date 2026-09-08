import React from 'react';
import { ICP_SPECS } from '../../../domain/icpData';

export const IcpFitMap: React.FC = () => {
  const firmografie = ICP_SPECS.firmografie;
  const triggers = ICP_SPECS.triggers;
  const exclusions = ICP_SPECS.exclusion;

  return (
    <section
      className="facelift-icp-fit-map"
      aria-label="ICP-Fit-Karte & Ausschlusszone"
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
        @media (max-width: 600px) {
          .facelift-icp-fit-map {
            padding: 12px 10px !important;
          }
          .icp-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="icp-header" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
            }}
          >
            ICP-FIT-KARTE
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Qualitative Zielgruppen-Architektur
          </span>
        </div>
        <h3
          className="icp-heading"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
            overflowWrap: 'anywhere',
          }}
        >
          {ICP_SPECS.title}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          Strukturierte Gegenüberstellung des B2B-Mittelstand-Idealprofils und der Ausschlusszone.
        </p>
      </div>

      {/* Haupt-Raster: Fit-Zone (links/oben) vs. Ausschlusszone (rechts/unten) */}
      <div
        className="icp-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: 'var(--space-4, 16px)',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* FIT-ZONE: Idealprofil & Firmografie */}
        <div
          className="icp-fit-zone"
          style={{
            backgroundColor: 'rgba(0, 217, 198, 0.04)',
            border: '1px solid rgba(0, 217, 198, 0.28)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: 'var(--space-4, 16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3, 12px)',
            minWidth: 0,
            boxSizing: 'border-box',
            overflowWrap: 'anywhere',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 0 8px rgba(0, 217, 198, 0.6)',
                }}
              />
              <strong style={{ fontSize: '14px', color: 'var(--color-primary)', letterSpacing: '0.02em' }}>
                IDEALPROFIL (FIT-ZONE)
              </strong>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 217, 198, 0.12)',
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              Fokus B2B-Mittelstand
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', minWidth: 0 }}>
            {firmografie.map((item) => (
              <div
                key={item.key}
                className="icp-firmografie-item"
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  overflowWrap: 'anywhere',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.key}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RECHTE SPALTE: Auslösende Trigger + Ausschlusszone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)', minWidth: 0, boxSizing: 'border-box' }}>
          {/* AUSLÖSENDE TRIGGER (Auslöser 1–3 in Quellreihenfolge) */}
          <div
            className="icp-triggers-card"
            style={{
              backgroundColor: 'rgba(124, 239, 230, 0.04)',
              border: '1px solid rgba(124, 239, 230, 0.24)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: 'var(--space-4, 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3, 12px)',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowWrap: 'anywhere',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <strong style={{ fontSize: '13.5px', color: 'var(--cyan-light, #7CEFE6)', letterSpacing: '0.02em' }}>
                Auslösende Trigger im Vertrieb
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Einstiegsindikatoren
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              {triggers.map((trigger, idx) => (
                <div
                  key={idx}
                  className="icp-trigger-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(124, 239, 230, 0.12)',
                      color: 'var(--cyan-light, #7CEFE6)',
                    }}
                  >
                    Auslöser {idx + 1}
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--color-text)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                    {trigger}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AUSSCHLUSSZONE: „Nicht verfolgen“ */}
          <div
            className="icp-exclusion-zone"
            style={{
              backgroundColor: 'rgba(255, 77, 77, 0.05)',
              border: '1px solid rgba(255, 77, 77, 0.3)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: 'var(--space-4, 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3, 12px)',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowWrap: 'anywhere',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-error, #FF4D4D)',
                    boxShadow: '0 0 8px rgba(255, 77, 77, 0.6)',
                  }}
                />
                <strong style={{ fontSize: '13.5px', color: 'var(--color-error, #FF4D4D)', letterSpacing: '0.02em' }}>
                  AUSSCHLUSSZONE: „NICHT VERFOLGEN“
                </strong>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 77, 77, 0.14)',
                  color: 'var(--color-error, #FF4D4D)',
                  fontWeight: 700,
                }}
              >
                Negative Fit
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {exclusions.map((exclusion, idx) => (
                <div
                  key={idx}
                  className="icp-exclusion-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid rgba(255, 77, 77, 0.2)',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(255, 77, 77, 0.15)',
                      color: 'var(--color-error, #FF4D4D)',
                    }}
                  >
                    ✕
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--color-text)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                    {exclusion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
