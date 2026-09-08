import React from 'react';
import { EMPATHY } from '../../../domain/kundenData';

export const VolkerDayTimeline: React.FC = () => {
  const quadrants = EMPATHY.quadrants;
  const heroStatement = EMPATHY.heroStatement;

  return (
    <section
      className="facelift-volker-day-timeline"
      aria-label="Ein Tag in Volkers Vertrieb – Arbeitsmomente 1 bis 4"
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
      }}
    >
      {/* Header mit Hero Statement */}
      <div className="timeline-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              color: 'var(--cyan-light, #7CEFE6)',
              backgroundColor: 'rgba(124, 239, 230, 0.12)',
              border: '1px solid rgba(124, 239, 230, 0.25)',
            }}
          >
            ARBEITSMOMENTE IM VERTRIEB
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Ein Tag in Volkers Vertrieb · Empathy-Perspektiven
          </span>
        </div>

        <h3
          className="timeline-heading"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {EMPATHY.title}
        </h3>

        {/* Hero Statement */}
        <div
          className="timeline-hero-statement"
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0, 217, 198, 0.06)',
            borderLeft: '3px solid var(--color-primary)',
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.45,
          }}
        >
          {heroStatement}
        </div>
      </div>

      {/* 4 Arbeitsmomente (Kartenreihe auf Desktop, gestapelt auf Mobile) */}
      <div
        className="timeline-moments-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4, 16px)',
          position: 'relative',
        }}
      >
        {quadrants.map((quadrant, idx) => {
          const momentNum = idx + 1;
          const isAccent = idx % 2 === 1;

          return (
            <div
              key={idx}
              className={`timeline-moment-card timeline-moment-${momentNum}`}
              style={{
                backgroundColor: isAccent ? 'rgba(255, 122, 61, 0.03)' : 'rgba(0, 217, 198, 0.03)',
                border: isAccent
                  ? '1px solid rgba(255, 122, 61, 0.22)'
                  : '1px solid rgba(0, 217, 198, 0.22)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: 'var(--space-4, 16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative',
              }}
            >
              {/* Moment-Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    backgroundColor: isAccent ? 'rgba(255, 122, 61, 0.14)' : 'rgba(0, 217, 198, 0.14)',
                    color: isAccent ? 'var(--color-accent, #FF7A3D)' : 'var(--color-primary)',
                  }}
                >
                  Arbeitsmoment {momentNum}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  0{momentNum}/04
                </span>
              </div>

              {/* Titel aus EMPATHY.quadrants[idx].title */}
              <h4
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isAccent ? 'var(--color-accent, #FF7A3D)' : 'var(--color-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {quadrant.title}
              </h4>

              {/* Text aus EMPATHY.quadrants[idx].desc */}
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  lineHeight: 1.45,
                  flexGrow: 1,
                }}
              >
                {quadrant.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
