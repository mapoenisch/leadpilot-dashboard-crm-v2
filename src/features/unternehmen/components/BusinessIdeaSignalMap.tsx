import React, { useState } from 'react';
import { IDEE, VALUE } from '../../../domain/unternehmenData';
import { FACELIFT_SOURCES } from '../../../domain/faceliftVisualData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';

export const BusinessIdeaSignalMap: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  // Exakte Ableitung aus Domain-Daten
  const p0 = IDEE.paragraphs[0] ?? '';
  const p1 = IDEE.paragraphs[1] ?? '';
  const phase1MarketText = (p0.split('.')[0] ?? '') + '.';
  const phase2FrictionText1 = p0.split('. ')[1] || '';
  const phase2FrictionText2 = (p1.split('.')[0] ?? '') + '.';

  return (
    <div className="facelift-business-idea-signal-map w-full box-border rounded-[var(--radius-lg)] border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Kopfbereich */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)] border-b border-solid border-border-soft">
        <div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold text-text tracking-[0.01em]">
            Geschäftsidee Signal-Map
          </h3>
          <p className="mt-[2px] mr-0 mb-0 ml-0 text-[0.8125rem] text-[var(--color-text-muted)]">
            Von der DACH-KMU-Situation über die Vertriebsreibung zur LeadPilot-Mechanik und dem
            messbaren Nutzen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-controls="business-idea-details-panel"
          aria-expanded={showDetails}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
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
        <div className="bg-background-deep rounded-[var(--radius-md)] border border-solid border-border-soft border-t-[3px] border-t-border p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-[var(--color-text-muted)]">
                PHASE 01
              </span>
              <FaceliftGlyph name="focus" tone="neutral" size={16} />
            </div>

            <h4 className="mt-0 mr-0 mb-[var(--space-2)] ml-0 font-display text-[0.9375rem] font-semibold text-text">
              DACH-KMU-Situation
            </h4>

            {/* KfW & Destatis Metriken & URLs direkt an der Station */}
            <div className="flex flex-col gap-[var(--space-2)] my-[var(--space-2)] mx-0">
              <div className="p-[var(--space-2)] rounded-[var(--radius-sm)] bg-surface border border-solid border-border-soft">
                <div className="text-[0.75rem] font-bold text-primary font-display">
                  {FACELIFT_SOURCES.kfw.metric}
                </div>
                <div className="mt-[2px] text-[0.6875rem] text-[var(--color-text-muted)]">
                  Quelle: {FACELIFT_SOURCES.kfw.name}
                </div>
                <a
                  href={FACELIFT_SOURCES.kfw.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.625rem] text-cyan-light underline break-all inline-block mt-[2px]"
                >
                  {FACELIFT_SOURCES.kfw.url}
                </a>
              </div>

              <div className="p-[var(--space-2)] rounded-[var(--radius-sm)] bg-surface border border-solid border-border-soft">
                <div className="text-[0.75rem] font-bold text-primary font-display">
                  {FACELIFT_SOURCES.destatis.metric}
                </div>
                <div className="mt-[2px] text-[0.6875rem] text-[var(--color-text-muted)]">
                  Quelle: {FACELIFT_SOURCES.destatis.name}
                </div>
                <a
                  href={FACELIFT_SOURCES.destatis.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.625rem] text-cyan-light underline break-all inline-block mt-[2px]"
                >
                  {FACELIFT_SOURCES.destatis.url}
                </a>
              </div>
            </div>

            <p className="mt-[var(--space-2)] mr-0 mb-0 ml-0 text-[0.75rem] text-[var(--color-text-muted)] leading-[1.4]">
              {phase1MarketText}
            </p>
          </div>
        </div>

        {/* Verbinder 1 -> 2 (Desktop Horizontal) */}
        <div className="signal-connector-horizontal" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10h12m-4-4l4 4-4 4"
              stroke="var(--color-border)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 1 -> 2 (Mobile Vertikal) */}
        <div className="signal-connector-vertical" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12m-4-4l4 4 4-4"
              stroke="var(--color-border)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 02: Vertriebsreibung */}
        <div className="bg-background-deep rounded-[var(--radius-md)] border border-solid border-[rgba(255,122,61,0.3)] border-t-[3px] border-t-accent p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-accent">PHASE 02</span>
              <FaceliftGlyph name="challenge" tone="attention" size={16} />
            </div>

            <h4 className="mt-0 mr-0 mb-[var(--space-2)] ml-0 font-display text-[0.9375rem] font-semibold text-text">
              Vertriebsreibung
            </h4>

            <div className="flex flex-col gap-[var(--space-2)] my-[var(--space-2)] mx-0">
              <div className="p-[var(--space-2)] rounded-[var(--radius-sm)] bg-surface border border-solid border-[rgba(255,122,61,0.2)]">
                <p className="m-0 text-[0.75rem] text-text leading-[1.4]">{phase2FrictionText1}</p>
              </div>

              <div className="p-[var(--space-2)] rounded-[var(--radius-sm)] bg-surface border border-solid border-border-soft">
                <p className="m-0 text-[0.75rem] text-[var(--color-text-muted)] leading-[1.4]">
                  {phase2FrictionText2}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verbinder 2 -> 3 (Desktop Horizontal) */}
        <div className="signal-connector-horizontal" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10h12m-4-4l4 4-4 4"
              stroke="var(--color-accent)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 2 -> 3 (Mobile Vertikal) */}
        <div className="signal-connector-vertical" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12m-4-4l4 4 4-4"
              stroke="var(--color-accent)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 03: LeadPilot-Mechanik */}
        <div className="bg-background-deep rounded-[var(--radius-md)] border border-solid border-[rgba(0,217,198,0.4)] border-t-[3px] border-t-primary p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-primary">PHASE 03</span>
              <FaceliftGlyph name="ready" tone="accent" size={16} />
            </div>

            <h4 className="mt-0 mr-0 mb-[var(--space-2)] ml-0 font-display text-[0.9375rem] font-semibold text-text">
              LeadPilot-Mechanik
            </h4>

            <ul className="my-[var(--space-2)] mx-0 pl-[16px] flex flex-col gap-[6px] text-[0.75rem] text-text leading-[1.35]">
              {IDEE.usps.map((u, i) => (
                <li key={i} className={i === 0 ? 'text-cyan-light' : 'text-text'}>
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verbinder 3 -> 4 (Desktop Horizontal) */}
        <div className="signal-connector-horizontal" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10h12m-4-4l4 4-4 4"
              stroke="var(--color-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 3 -> 4 (Mobile Vertikal) */}
        <div className="signal-connector-vertical" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12m-4-4l4 4 4-4"
              stroke="var(--color-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 04: Nutzen */}
        <div className="bg-background-deep rounded-[var(--radius-md)] border border-solid border-[rgba(0,217,198,0.3)] border-t-[3px] border-t-primary p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)] shadow-[0_0_16px_rgba(0,217,198,0.08)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-primary">PHASE 04</span>
              <FaceliftGlyph name="success" tone="positive" size={16} />
            </div>

            <h4 className="mt-0 mr-0 mb-[var(--space-2)] ml-0 font-display text-[0.9375rem] font-semibold text-text">
              Nutzen
            </h4>

            <div className="p-[var(--space-2)] rounded-[var(--radius-sm)] bg-surface border border-solid border-[rgba(0,217,198,0.3)] mb-[var(--space-2)]">
              <blockquote className="m-0 text-[0.75rem] text-text italic leading-[1.35]">
                {VALUE.heroStatement}
              </blockquote>
            </div>

            <div className="flex flex-col gap-[4px]">
              {VALUE.coreBenefits.slice(0, 2).map((cb, idx) => (
                <div
                  key={idx}
                  className="text-[0.6875rem] text-[var(--color-text-muted)] leading-[1.3]"
                >
                  <strong className="text-cyan-light">{cb.title}:</strong> {cb.desc}
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
          className="mt-[var(--space-5)] pt-[var(--space-4)] border-t border-solid border-border flex flex-col gap-[var(--space-4)]"
        >
          <div className="bg-background-deep p-[var(--space-4)] rounded-[var(--radius-md)]">
            <h4 className="mt-0 mr-0 mb-[var(--space-2)] ml-0 font-display text-text">
              {IDEE.title} – {IDEE.subtitle}
            </h4>
            {IDEE.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-[0.8125rem] text-[var(--color-text-muted)] leading-[1.5] mt-0 mr-0 mb-[var(--space-2)] ml-0"
              >
                {p}
              </p>
            ))}
          </div>

          <div className="bg-background-deep p-[var(--space-4)] rounded-[var(--radius-md)]">
            <h4 className="mt-0 mr-0 mb-[var(--space-2)] ml-0 font-display text-text">
              Alleinstellungsmerkmale (USPs im Original):
            </h4>
            <ul className="m-0 pl-[20px] flex flex-col gap-[6px]">
              {IDEE.usps.map((u, i) => (
                <li key={i} className="text-[0.8125rem] text-text">
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
