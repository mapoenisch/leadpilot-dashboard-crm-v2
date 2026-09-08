import React from 'react';
import { HR } from '../../../domain/organisationData';

export const PeopleHealthRail: React.FC = () => {
  const metrics = HR.metrics || [];
  const dateMatch = metrics.map((m) => m.label.match(/\d{2}\.\d{2}\.\d{4}/)?.[0]).find(Boolean);
  const dateText = dateMatch ? ` zum Stichtag ${dateMatch}` : '';

  return (
    <section
      className="facelift-people-health-rail"
      aria-label="People-Health Kennzahlenleiste"
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
        .health-rail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }
        @media (max-width: 600px) {
          .facelift-people-health-rail {
            padding: 12px 8px !important;
          }
          .health-rail-grid {
            grid-template-columns: 1fr;
            gap: 10px;
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
            PEOPLE HEALTH
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Organisations- & Personalkennzahlen im Überblick
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
          People-Health-Leiste & Kennzahlenprofil
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Übersicht der zentralen personalwirtschaftlichen Messgrößen{dateText}.
        </p>
      </div>

      {/* Verbindliche Neutralitätsnotiz (0 Kausalität behauptet) */}
      <div
        role="note"
        aria-label="Neutralitätshinweis"
        style={{
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.4,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>ℹ️ Hinweis:</span>
        <span>Kennzahlen im Überblick; keine nachgewiesenen Wirkzusammenhänge.</span>
      </div>

      {/* Kennzahlen-Grid mit robuster Textumbruch-Sicherheit */}
      <div className="health-rail-grid" role="region" aria-label="People-Health Kennzahlen">
        {metrics.map((m) => {
          const isFluktuation = m.label.includes('Fluktuation');
          const isAufwand = m.label.includes('Personalaufwand');

          return (
            <article
              key={m.label}
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border)',
                borderLeft: isFluktuation
                  ? '4px solid var(--color-warning, #FFB800)'
                  : isAufwand
                  ? '4px solid var(--color-primary, #00D9C6)'
                  : '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
                minWidth: 0,
                boxSizing: 'border-box',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  overflowWrap: 'anywhere',
                }}
              >
                {m.label}
              </span>

              <div
                style={{
                  fontSize: 'clamp(15px, 3.5vw, 18px)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-text)',
                  lineHeight: 1.35,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {m.val}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
