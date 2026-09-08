import React, { useState } from 'react';
import { IDEE, VALUE } from '../../../domain/unternehmenData';
import { FACELIFT_SOURCES } from '../../../domain/faceliftVisualData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';

export const BusinessIdeaSignalMap: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  // Exakte Ableitung aus Domain-Daten
  const phase1MarketText = IDEE.paragraphs[0].split('.')[0] + '.';
  const phase2FrictionText1 = IDEE.paragraphs[0].split('. ')[1] || '';
  const phase2FrictionText2 = IDEE.paragraphs[1].split('.')[0] + '.';

  return (
    <div
      className="facelift-business-idea-signal-map"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Kopfbereich */}
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
            Geschäftsidee Signal-Map
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Von der DACH-KMU-Situation über die Vertriebsreibung zur LeadPilot-Mechanik und dem messbaren Nutzen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-controls="business-idea-details-panel"
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
          {showDetails ? 'Ausführliche Texte verbergen' : 'Ausführliche Texte anzeigen'}
        </button>
      </div>

      {/* Responsive Styles für 4 Phasen in einer Reihe auf Desktop */}
      <style>{`
        .signal-map-grid {
          display: grid;
          grid-template-columns: 1fr 24px 1fr 24px 1fr 24px 1fr;
          align-items: stretch;
          gap: 0;
        }
        .signal-connector-horizontal {
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 0 2px;
        }
        .signal-connector-vertical {
          display: none;
          align-items: center;
          justifyContent: center;
          padding: var(--space-2) 0;
        }
        @media (min-width: 768px) and (max-width: 1199px) {
          .signal-map-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: var(--space-4) !important;
          }
          .signal-connector-horizontal {
            display: none !important;
          }
          .signal-connector-vertical {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .signal-map-grid {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
          .signal-connector-horizontal {
            display: none !important;
          }
          .signal-connector-vertical {
            display: flex !important;
          }
        }
      `}</style>

      {/* Signal-Map Kette */}
      <div className="signal-map-grid">
        {/* Phase 01: DACH-KMU-Situation */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            borderTop: '3px solid var(--color-border)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                PHASE 01
              </span>
              <FaceliftGlyph name="focus" tone="neutral" size={16} />
            </div>

            <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
              DACH-KMU-Situation
            </h4>

            {/* KfW & Destatis Metriken & URLs direkt an der Station */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 'var(--space-2) 0' }}>
              <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
                  {FACELIFT_SOURCES.kfw.metric}
                </div>
                <div style={{ marginTop: '2px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                  Quelle: {FACELIFT_SOURCES.kfw.name}
                </div>
                <a
                  href={FACELIFT_SOURCES.kfw.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.625rem', color: 'var(--cyan-light)', textDecoration: 'underline', wordBreak: 'break-all', display: 'inline-block', marginTop: '2px' }}
                >
                  {FACELIFT_SOURCES.kfw.url}
                </a>
              </div>

              <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
                  {FACELIFT_SOURCES.destatis.metric}
                </div>
                <div style={{ marginTop: '2px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                  Quelle: {FACELIFT_SOURCES.destatis.name}
                </div>
                <a
                  href={FACELIFT_SOURCES.destatis.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.625rem', color: 'var(--cyan-light)', textDecoration: 'underline', wordBreak: 'break-all', display: 'inline-block', marginTop: '2px' }}
                >
                  {FACELIFT_SOURCES.destatis.url}
                </a>
              </div>
            </div>

            <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {phase1MarketText}
            </p>
          </div>
        </div>

        {/* Verbinder 1 -> 2 (Desktop Horizontal) */}
        <div className="signal-connector-horizontal" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12m-4-4l4 4-4 4" stroke="var(--color-border)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Verbinder 1 -> 2 (Mobile Vertikal) */}
        <div className="signal-connector-vertical" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12m-4-4l4 4 4-4" stroke="var(--color-border)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Phase 02: Vertriebsreibung */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 122, 61, 0.3)',
            borderTop: '3px solid var(--color-accent)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                PHASE 02
              </span>
              <FaceliftGlyph name="challenge" tone="attention" size={16} />
            </div>

            <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Vertriebsreibung
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 'var(--space-2) 0' }}>
              <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(255, 122, 61, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                  {phase2FrictionText1}
                </p>
              </div>

              <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {phase2FrictionText2}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verbinder 2 -> 3 (Desktop Horizontal) */}
        <div className="signal-connector-horizontal" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12m-4-4l4 4-4 4" stroke="var(--color-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Verbinder 2 -> 3 (Mobile Vertikal) */}
        <div className="signal-connector-vertical" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12m-4-4l4 4 4-4" stroke="var(--color-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Phase 03: LeadPilot-Mechanik */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0, 217, 198, 0.4)',
            borderTop: '3px solid var(--color-primary)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                PHASE 03
              </span>
              <FaceliftGlyph name="ready" tone="accent" size={16} />
            </div>

            <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
              LeadPilot-Mechanik
            </h4>

            <ul style={{ margin: 'var(--space-2) 0', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.35 }}>
              {IDEE.usps.map((u, i) => (
                <li key={i} style={{ color: i === 0 ? 'var(--cyan-light)' : 'var(--color-text)' }}>
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verbinder 3 -> 4 (Desktop Horizontal) */}
        <div className="signal-connector-horizontal" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12m-4-4l4 4-4 4" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Verbinder 3 -> 4 (Mobile Vertikal) */}
        <div className="signal-connector-vertical" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12m-4-4l4 4 4-4" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Phase 04: Nutzen */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0, 217, 198, 0.3)',
            borderTop: '3px solid var(--color-primary)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            boxShadow: '0 0 16px rgba(0, 217, 198, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                PHASE 04
              </span>
              <FaceliftGlyph name="success" tone="positive" size={16} />
            </div>

            <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Nutzen
            </h4>

            <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(0, 217, 198, 0.3)', marginBottom: 'var(--space-2)' }}>
              <blockquote style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text)', fontStyle: 'italic', lineHeight: 1.35 }}>
                {VALUE.heroStatement}
              </blockquote>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {VALUE.coreBenefits.slice(0, 2).map((cb, idx) => (
                <div key={idx} style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                  <strong style={{ color: 'var(--cyan-light)' }}>{cb.title}:</strong> {cb.desc}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ausklappbare Detailtexte der Geschäftsidee */}
      {showDetails && (
        <div
          id="business-idea-details-panel"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ backgroundColor: 'var(--color-bg-deep)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              {IDEE.title} – {IDEE.subtitle}
            </h4>
            {IDEE.paragraphs.map((p, i) => (
              <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 var(--space-2)' }}>
                {p}
              </p>
            ))}
          </div>

          <div style={{ backgroundColor: 'var(--color-bg-deep)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Alleinstellungsmerkmale (USPs im Original):
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {IDEE.usps.map((u, i) => (
                <li key={i} style={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
