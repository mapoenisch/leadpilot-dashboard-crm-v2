import React from 'react';
import { SLA } from '../../../domain/vertriebData';

export const SlaSwimlane: React.FC = () => {
  return (
    <section
      className="facelift-sla-swimlane"
      aria-label="SLA-Swimlanes Marketing & Vertrieb"
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
        .swimlane-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .handoff-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .swimlane-container {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .handoff-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 600px) {
          .facelift-sla-swimlane {
            padding: 12px 8px !important;
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
            SLA-SWIMLANES
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Prozessverantwortung, Fristen & Rückführungspfade
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
          Service Level Agreement: Marketing ↔ Sales
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Verbindliche Schnittstelle für Lead-Übergabe, Reaktionsfristen und geregelte Rückführung nicht-qualifizierter Kontakte.
        </p>
      </div>

      {/* Zentraler Handoff-Knoten */}
      <div
        className="handoff-banner"
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid rgba(0, 217, 198, 0.35)',
          backgroundColor: 'rgba(0, 217, 198, 0.05)',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-primary)',
                color: '#061312',
              }}
            >
              ÜBERGABEPUNKT
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>
              {SLA.handoff.title}
            </strong>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Kriterium: {SLA.handoff.rows[1][1]}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 122, 61, 0.15)',
              border: '1px solid rgba(255, 122, 61, 0.3)',
              color: 'var(--color-accent, #FF7A3D)',
              fontSize: '11px',
              fontWeight: 700,
              flexWrap: 'wrap',
            }}
          >
            <span>⏱️</span>
            <span>FRIST: ERSTKONTAKT ≤ 24H (WERKTAGS)</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap',
            }}
          >
            <span>{SLA.handoff.rows[0][1]}</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>➔</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{SLA.handoff.rows[2][1]}</span>
          </div>
        </div>
      </div>

      {/* 3 Parallele Bahnen (Swimlanes) */}
      <div className="swimlane-container" role="region" aria-label="SLA-Zuständigkeitsbahnen">
        {/* BAHN 1: Marketing */}
        <article
          style={{
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            borderTop: '4px solid var(--color-primary)',
            backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-primary)',
                }}
              >
                BAHN 1
              </span>
              <h4 style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text)', fontWeight: 700 }}>
                Marketing Verantwortung
              </h4>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(0, 217, 198, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Status: MQL
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Verantwortlich für die kontinuierliche Lead-Generierung und Vorqualifizierung vor dem Übergabepunkt.
          </p>

          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-text)' }}>
            {SLA.marketing.map((item, i) => (
              <li key={i} style={{ lineHeight: 1.4 }}>
                {item}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '11px',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              flexWrap: 'wrap',
            }}
          >
            <span>➔ Richtung Übergabe:</span>
            <span>Lead an Sales übergeben, wenn Score ≥ 80</span>
          </div>
        </article>

        {/* BAHN 2: Sales */}
        <article
          style={{
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            borderTop: '4px solid var(--color-accent, #FF7A3D)',
            backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-accent, #FF7A3D)',
                }}
              >
                BAHN 2
              </span>
              <h4 style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text)', fontWeight: 700 }}>
                Sales Verantwortung
              </h4>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-accent, #FF7A3D)',
                backgroundColor: 'rgba(255, 122, 61, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Status: SQL / Demo
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Verbindliche Bearbeitung der übergebenen MQLs zur Qualifizierung und Durchführung der Erstgespräche.
          </p>

          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-text)' }}>
            {SLA.sales.map((item, i) => (
              <li key={i} style={{ lineHeight: 1.4 }}>
                {item}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '11px',
              color: 'var(--color-accent, #FF7A3D)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              flexWrap: 'wrap',
            }}
          >
            <span>➔ Richtung Abschluss:</span>
            <span>SQL bestätigen oder mit Grund disqualifizieren</span>
          </div>
        </article>

        {/* BAHN 3: Rückgabe & Eskalation */}
        <article
          style={{
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            borderTop: '4px solid var(--color-warning, #FFB800)',
            backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-warning, #FFB800)',
                }}
              >
                BAHN 3
              </span>
              <h4 style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text)', fontWeight: 700 }}>
                Rückgabe & Eskalation
              </h4>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-warning, #FFB800)',
                backgroundColor: 'rgba(255, 184, 0, 0.12)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Feedback-Schleife
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Verfahren bei Nicht-Erreichbarkeit, Disqualifikation oder Fristverletzungen.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 184, 0, 0.05)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--color-warning, #FFB800)' }}>↩</span>
                <span>Rückgabe an Marketing</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                Disqualifikation mit konkretem Grund dokumentieren; Lead wird zurück ins automatisierte Content-Nurturing überführt.
              </div>
            </div>

            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 122, 61, 0.05)',
                border: '1px solid rgba(255, 122, 61, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent, #FF7A3D)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span>
                <span>Eskalation bei Überschreitung der 24h-Frist</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                Wird die Reaktionszeit von 24 Stunden (werktags) für den Erstkontakt überschritten, greift die Eskalationsregel.
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '11px',
              color: 'var(--color-warning, #FFB800)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              flexWrap: 'wrap',
            }}
          >
            <span>↩ Richtung Nurturing:</span>
            <span>Zurück in den Content-Plan (Marketing)</span>
          </div>
        </article>
      </div>
    </section>
  );
};
