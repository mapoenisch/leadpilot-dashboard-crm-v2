import React from 'react';
import { BUYER_PERSONA_VOLKER } from '../../../domain/personaData';

export const PersonaDossier: React.FC = () => {
  const p = BUYER_PERSONA_VOLKER;

  return (
    <article
      className="facelift-persona-dossier"
      aria-label={`Entscheider-Dossier: ${p.name}`}
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
      {/* Dossier Header mit Profil-Karte */}
      <div
        className="persona-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-3, 12px)',
          borderBottom: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))',
          paddingBottom: 'var(--space-4, 16px)',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {/* Avatar-Badge */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 217, 198, 0.12)',
              border: '1px solid rgba(0, 217, 198, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              fontWeight: 800,
              fontSize: '18px',
              fontFamily: 'var(--font-display)',
              flexShrink: 0,
            }}
          >
            V
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0, 217, 198, 0.15)',
                  color: 'var(--color-primary)',
                }}
              >
                ENTSCHEIDER-DOSSIER
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {p.age} Jahre · {p.role}
              </span>
            </div>
            <h3
              className="persona-heading"
              style={{
                margin: '4px 0 0',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {p.name}
            </h3>
          </div>
        </div>

        {/* Paket-Fit Badge */}
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 154, 102, 0.08)',
            border: '1px solid rgba(255, 154, 102, 0.25)',
            fontSize: '12px',
            color: 'var(--color-accent, #FF7A3D)',
            maxWidth: '380px',
            lineHeight: 1.35,
          }}
        >
          <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Paket-Fit
          </strong>
          {p.packageFit}
        </div>
      </div>

      {/* Unternehmenskontext */}
      <div
        className="persona-company-context"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Referenzumfeld:</span>
        <span>{p.companyType}</span>
      </div>

      {/* Zitat */}
      <blockquote
        className="persona-quote"
        style={{
          margin: 0,
          fontStyle: 'italic',
          color: 'var(--color-primary)',
          fontSize: '13.5px',
          background: 'rgba(0, 217, 198, 0.05)',
          borderLeft: '3px solid var(--color-primary)',
          padding: '12px 14px',
          borderRadius: '0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0',
          lineHeight: 1.45,
        }}
      >
        {p.quote}
      </blockquote>

      {/* 2-Spalten-Raster: Ziele vs. Schmerzpunkte */}
      <div
        className="persona-goals-pains-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4, 16px)',
        }}
      >
        {/* Ziele */}
        <div
          className="persona-goals-card"
          style={{
            backgroundColor: 'rgba(0, 217, 198, 0.03)',
            border: '1px solid rgba(0, 217, 198, 0.2)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: 'var(--space-4, 16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
              }}
            />
            <strong style={{ fontSize: '13.5px', color: 'var(--color-primary)', letterSpacing: '0.02em' }}>
              Strategische Vertriebsziele
            </strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.4 }}>
            {p.goals.map((goal, i) => (
              <li key={i}>{goal}</li>
            ))}
          </ul>
        </div>

        {/* Schmerzpunkte */}
        <div
          className="persona-pains-card"
          style={{
            backgroundColor: 'rgba(255, 122, 61, 0.04)',
            border: '1px solid rgba(255, 122, 61, 0.2)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: 'var(--space-4, 16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-accent, #FF7A3D)',
              }}
            />
            <strong style={{ fontSize: '13.5px', color: 'var(--color-accent, #FF7A3D)', letterSpacing: '0.02em' }}>
              Schmerzpunkte im Alltag (Pain Points)
            </strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.4 }}>
            {p.painPoints.map((pain, i) => (
              <li key={i}>{pain}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Genutzte Kanäle */}
      <div
        className="persona-channels-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          paddingTop: 'var(--space-2, 8px)',
          borderTop: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Informations- & Kontaktkanäle:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {p.channels.map((ch, i) => (
            <span
              key={i}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.08))',
                color: 'var(--color-text)',
              }}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
};
