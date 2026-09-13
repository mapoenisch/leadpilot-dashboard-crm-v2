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
    <div className="facelift-value-benefit-stage w-full box-border rounded-[var(--radius-lg)] border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Horizontale Hauptaussage (Hero Statement) */}
      <div className="rounded-[var(--radius-md)] bg-background-deep border border-solid border-[rgba(0,217,198,0.35)] shadow-[0_0_20px_rgba(0,217,198,0.08)] px-[var(--space-5)] py-[var(--space-4)] mb-[var(--space-5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-primary" aria-hidden="true" />
        <div className="text-[0.75rem] font-mono text-cyan-light uppercase tracking-[0.08em] mb-[var(--space-1)] font-semibold">
          Kernversprechen der LeadPilot Plattform
        </div>
        <blockquote className="m-0 font-display text-[1.125rem] font-semibold text-text leading-[1.45] tracking-[0.01em]">
          {VALUE.heroStatement}
        </blockquote>
      </div>

      {/* Responsive Styles für Desktop (2-Spaltig) vs Mobile (Bild vor Vorteilen) */}
      <style>{`
        .value-benefit-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: var(--space-5);
          align-items: stretch;
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
        <div className="benefit-cards-container flex flex-col gap-[var(--space-3)]">
          {benefits.map((b, idx) => (
            <div
              key={b.badge}
              className={`bg-background-deep rounded-[var(--radius-md)] border border-solid p-[var(--space-4)] flex flex-col gap-[var(--space-1)] ${idx === 0 ? 'border-[rgba(0,217,198,0.3)] border-l-[3px] border-l-primary' : idx === 1 ? 'border-[rgba(255,122,61,0.3)] border-l-[3px] border-l-accent' : 'border-border-soft border-l-[3px] border-l-cyan-light'}`}
            >
              <div className="flex items-center justify-between gap-[var(--space-2)] mb-[2px]">
                <div className="flex items-center gap-[var(--space-2)]">
                  <FaceliftGlyph name={b.glyph} tone={b.tone} size={16} />
                  <span className="font-display text-[0.875rem] font-bold text-text tracking-[0.01em]">
                    {b.badge}
                  </span>
                </div>
                <span
                  className={`text-[0.6875rem] font-mono font-semibold ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-accent' : 'text-[var(--color-text-muted)]'}`}
                >
                  0{idx + 1}
                </span>
              </div>

              <div className="text-[0.8125rem] font-semibold text-cyan-light mt-[2px]">
                {b.title}
              </div>

              <p className="mt-[4px] mr-0 mb-0 ml-0 text-[0.8125rem] text-[var(--color-text-muted)] leading-[1.45]">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Rechts (bzw. auf Mobile dazwischen): Großes menschlich-vertriebsnahes Symbolbild */}
        <div className="benefit-graphic-container bg-background-deep rounded-[var(--radius-md)] border border-solid border-border-soft p-[var(--space-4)] flex flex-col items-center justify-center min-h-[260px] relative">
          {/* Eigene Vertriebs- und Beziehungs-Vektorgrafik (Kein Standard-Icon) */}
          <svg
            width="100%"
            height="220"
            viewBox="0 0 320 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Vertriebsnahe Symbolgrafik: Strukturierte Lead-zu-Kunde Qualifizierung und persönliche B2B-Kundenbeziehung"
            className="max-w-[320px] h-auto"
          >
            {/* Hintergrund-Gitter / Fokus-Koordinaten */}
            <circle
              cx="160"
              cy="110"
              r="95"
              stroke="var(--color-border-soft)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle cx="160" cy="110" r="60" stroke="rgba(0, 217, 198, 0.2)" strokeWidth="1" />
            <circle
              cx="160"
              cy="110"
              r="28"
              fill="var(--color-surface-raised)"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
            />

            {/* Horizontale & Vertikale Führungsachsen */}
            <line
              x1="30"
              y1="110"
              x2="290"
              y2="110"
              stroke="var(--color-border-soft)"
              strokeWidth="1"
            />
            <line
              x1="160"
              y1="20"
              x2="160"
              y2="200"
              stroke="var(--color-border-soft)"
              strokeWidth="1"
            />

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
            <circle
              cx="50"
              cy="50"
              r="8"
              fill="var(--color-surface)"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="170"
              r="8"
              fill="var(--color-surface)"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />

            {/* Zentraler Menschlich-Berater-Knoten (Vertriebsleiter / Match) */}
            <circle cx="160" cy="102" r="7" fill="var(--color-primary)" />
            <path
              d="M 148 122 C 148 114 154 113 160 113 C 166 113 172 114 172 122"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Output-Knoten (Zahlende B2B-Kunden) */}
            <circle
              cx="270"
              cy="50"
              r="10"
              fill="var(--cyan-a12)"
              stroke="var(--color-primary)"
              strokeWidth="2"
            />
            <path
              d="M 266 50 L 269 53 L 275 47"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx="270"
              cy="170"
              r="10"
              fill="var(--cyan-a12)"
              stroke="var(--color-primary)"
              strokeWidth="2"
            />
            <path
              d="M 266 170 L 269 173 L 275 167"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Textuelle Signal-Beschriftung im SVG */}
            <text
              x="50"
              y="32"
              fill="var(--color-accent)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              B2B-LEAD
            </text>
            <text
              x="160"
              y="142"
              fill="var(--cyan-light)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              fontWeight="bold"
            >
              QUALIFIZIERUNG
            </text>
            <text
              x="270"
              y="32"
              fill="var(--color-primary)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              KUNDE (ARR)
            </text>
          </svg>

          <div className="mt-[var(--space-2)] text-[0.6875rem] text-[var(--color-text-muted)] font-mono text-center">
            Persönliche B2B-Abschlüsse statt Excel-Verlust
          </div>
        </div>
      </div>

      {/* Button & Ausklappbare Detail-Referenz */}
      <div className="mt-[var(--space-4)] flex justify-end">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-controls="value-benefit-details"
          aria-expanded={showDetails}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[10px] py-[4px]"
        >
          {showDetails ? 'Referenzübersicht verbergen' : 'Referenzübersicht anzeigen'}
        </button>
      </div>

      {showDetails && (
        <div
          id="value-benefit-details"
          className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-solid border-border grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-[var(--space-3)]"
        >
          {VALUE.coreBenefits.map((b, i) => (
            <div
              key={i}
              className="bg-background-deep p-[var(--space-3)] rounded-[var(--radius-md)] border border-solid border-border-soft"
            >
              <div className="text-[0.8125rem] font-semibold text-text">{b.title}</div>
              <div className="text-[0.75rem] text-[var(--color-text-muted)] mt-[4px] leading-[1.4]">
                {b.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
