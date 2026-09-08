import React, { useState } from 'react';
import { VALUE } from '../../../domain/unternehmenData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';

export const ValueBenefitStage: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  const benefits = [
    {
      badge: 'Kontakt wird Kunde',
      title: VALUE.coreBenefits[0].title,
      desc: VALUE.coreBenefits[0].desc,
      glyph: 'contactToCustomer' as const,
      tone: 'positive' as const,
    },
    {
      badge: 'Fokus statt Reporting-Aufwand',
      title: VALUE.coreBenefits[1].title,
      desc: VALUE.coreBenefits[1].desc,
      glyph: 'focus' as const,
      tone: 'accent' as const,
    },
    {
      badge: 'Vom ersten Tag handlungsfähig',
      title: VALUE.coreBenefits[2].title,
      desc: VALUE.coreBenefits[2].desc,
      glyph: 'ready' as const,
      tone: 'neutral' as const,
    },
  ];

  return (
    <div
      className="facelift-value-benefit-stage"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Horizontale Hauptaussage (Hero Statement) */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg-deep)',
          border: '1px solid rgba(0, 217, 198, 0.35)',
          boxShadow: '0 0 20px rgba(0, 217, 198, 0.08)',
          padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: 'var(--color-primary)',
          }}
          aria-hidden="true"
        />
        <div
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--cyan-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 'var(--space-1)',
            fontWeight: 600,
          }}
        >
          Kernversprechen der LeadPilot Plattform
        </div>
        <blockquote
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.45,
            letterSpacing: '0.01em',
          }}
        >
          {VALUE.heroStatement}
        </blockquote>
      </div>

      {/* Responsive Styles für Desktop (2-Spaltig) vs Mobile (Bild vor Vorteilen) */}
      <style>{`
        .value-benefit-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: var(--space-5);
          alignItems: stretch;
        }
        .benefit-cards-container {
          order: 1;
        }
        .benefit-graphic-container {
          order: 2;
        }
        @media (max-width: 860px) {
          .value-benefit-layout {
            grid-template-columns: 1fr;
          }
          .benefit-graphic-container {
            order: 1 !important;
          }
          .benefit-cards-container {
            order: 2 !important;
          }
        }
      `}</style>

      {/* Grid: 3 gestapelte Vorteile & Großes Vektor-Symbolbild */}
      <div className="value-benefit-layout">
        {/* Links: Drei vertikal gestapelte Kernvorteile */}
        <div
          className="benefit-cards-container"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
          {benefits.map((b, idx) => (
            <div
              key={b.badge}
              style={{
                backgroundColor: 'var(--color-bg-deep)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${
                  idx === 0
                    ? 'rgba(0, 217, 198, 0.3)'
                    : idx === 1
                    ? 'rgba(255, 122, 61, 0.3)'
                    : 'var(--color-border-soft)'
                }`,
                borderLeft: `3px solid ${
                  idx === 0
                    ? 'var(--color-primary)'
                    : idx === 1
                    ? 'var(--color-accent)'
                    : 'var(--cyan-light)'
                }`,
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-2)',
                  marginBottom: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <FaceliftGlyph name={b.glyph} tone={b.tone} size={16} />
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {b.badge}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color:
                      idx === 0
                        ? 'var(--color-primary)'
                        : idx === 1
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)',
                    fontWeight: 600,
                  }}
                >
                  0{idx + 1}
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--cyan-light)',
                  marginTop: '2px',
                }}
              >
                {b.title}
              </div>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.45,
                }}
              >
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Rechts (bzw. auf Mobile dazwischen): Großes menschlich-vertriebsnahes Symbolbild */}
        <div
          className="benefit-graphic-container"
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            position: 'relative',
          }}
        >
          {/* Eigene Vertriebs- und Beziehungs-Vektorgrafik (Kein Standard-Icon) */}
          <svg
            width="100%"
            height="220"
            viewBox="0 0 320 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Vertriebsnahe Symbolgrafik: Strukturierte Lead-zu-Kunde Qualifizierung und persönliche B2B-Kundenbeziehung"
            style={{ maxWidth: '320px', height: 'auto' }}
          >
            {/* Hintergrund-Gitter / Fokus-Koordinaten */}
            <circle cx="160" cy="110" r="95" stroke="var(--color-border-soft)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="160" cy="110" r="60" stroke="rgba(0, 217, 198, 0.2)" strokeWidth="1" />
            <circle cx="160" cy="110" r="28" fill="var(--color-surface-raised)" stroke="var(--color-primary)" strokeWidth="1.5" />

            {/* Horizontale & Vertikale Führungsachsen */}
            <line x1="30" y1="110" x2="290" y2="110" stroke="var(--color-border-soft)" strokeWidth="1" />
            <line x1="160" y1="20" x2="160" y2="200" stroke="var(--color-border-soft)" strokeWidth="1" />

            {/* Lead-Trichter / Funnel-Pfade */}
            <path
              d="M 50 50 Q 110 90 145 105"
              stroke="var(--color-border)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 50 170 Q 110 130 145 115"
              stroke="var(--color-border)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 175 105 Q 210 90 270 50"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 175 115 Q 210 130 270 170"
              stroke="var(--cyan-light)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Input-Knoten (Leads / Erstkontakt) */}
            <circle cx="50" cy="50" r="8" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2" />
            <circle cx="50" cy="170" r="8" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2" />

            {/* Zentraler Menschlich-Berater-Knoten (Vertriebsleiter / Match) */}
            <circle cx="160" cy="102" r="7" fill="var(--color-primary)" />
            <path
              d="M 148 122 C 148 114 154 113 160 113 C 166 113 172 114 172 122"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Output-Knoten (Zahlende B2B-Kunden) */}
            <circle cx="270" cy="50" r="10" fill="var(--cyan-a12)" stroke="var(--color-primary)" strokeWidth="2" />
            <path d="M 266 50 L 269 53 L 275 47" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            <circle cx="270" cy="170" r="10" fill="var(--cyan-a12)" stroke="var(--color-primary)" strokeWidth="2" />
            <path d="M 266 170 L 269 173 L 275 167" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Textuelle Signal-Beschriftung im SVG */}
            <text x="50" y="32" fill="var(--color-accent)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
              B2B-LEAD
            </text>
            <text x="160" y="142" fill="var(--cyan-light)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
              QUALIFIZIERUNG
            </text>
            <text x="270" y="32" fill="var(--color-primary)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
              KUNDE (ARR)
            </text>
          </svg>

          <div
            style={{
              marginTop: 'var(--space-2)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
            }}
          >
            Persönliche B2B-Abschlüsse statt Excel-Verlust
          </div>
        </div>
      </div>

      {/* Button & Ausklappbare Detail-Referenz */}
      <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-controls="value-benefit-details"
          aria-expanded={showDetails}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 10px',
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
          {showDetails ? 'Referenzübersicht verbergen' : 'Referenzübersicht anzeigen'}
        </button>
      </div>

      {showDetails && (
        <div
          id="value-benefit-details"
          style={{
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {VALUE.coreBenefits.map((b, i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--color-bg-deep)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {b.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                {b.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
