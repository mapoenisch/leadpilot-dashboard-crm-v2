import React, { useState } from 'react';
import { HISTORIE } from '../../../domain/unternehmenData';

export const FundingTimeline: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  // 4 gemeinsame Zeitachsen-Stationen direkt aus HISTORIE.events abgeleitet
  // events[0]: 21.07.2022 - Gründung
  // events[1]: Mai 2023 - Wandeldarlehen
  // events[2]: Q1 2024 - Seed
  // events[3]: Q1 2024 - Launch
  // events[4]: Dez 2025 - Abschluss GJ 2025
  const columns = [
    {
      period: '21.07.2022',
      capitalEvent: HISTORIE.events[0],
      productEvent: null,
      hasConnector: false,
    },
    {
      period: 'Mai 2023',
      capitalEvent: HISTORIE.events[1],
      productEvent: null,
      hasConnector: false,
    },
    {
      period: 'Q1 2024',
      capitalEvent: HISTORIE.events[2],
      productEvent: HISTORIE.events[3],
      hasConnector: true,
    },
    {
      period: 'Dez 2025',
      capitalEvent: null,
      productEvent: HISTORIE.events[4],
      hasConnector: false,
    },
  ];

  return (
    <div className="facelift-funding-timeline w-full box-border rounded-[var(--radius-lg)] border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)] border-b border-solid border-border-soft">
        <div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold text-text tracking-[0.01em]">
            Gemeinsame Gründungs- & Entwicklungszeitachse
          </h3>
          <p className="mt-[2px] mr-0 mb-0 ml-0 text-[0.8125rem] text-[var(--color-text-muted)]">
            Synchronisierte Chronologie: Oben Kapital & Recht, unten Produkt & Markt mit senkrechtem Ermöglichungs-Verbinder.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-controls="funding-timeline-details"
          aria-expanded={showDetails}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
        >
          {showDetails ? 'Ereignisliste verbergen' : 'Ereignisliste anzeigen'}
        </button>
      </div>

      {/* Responsive Styles für 4 Spalten auf Desktop vs gestapelt auf Mobile */}
      <style>{`
        .funding-grid-desktop {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          align-items: stretch;
        }
        .timeline-slot-mobile {
          display: none;
        }
        @media (max-width: 860px) {
          .funding-grid-desktop {
            display: none !important;
          }
          .timeline-slot-mobile {
            display: flex !important;
            flex-direction: column;
            gap: var(--space-4);
          }
        }
      `}</style>

      {/* DESKTOP-ANSICHT: 4 gemeinsame Spalten mit synchronisierten Spuren */}
      <div className="funding-grid-desktop">
        {columns.map((col) => (
          <div
            key={col.period}
            className="flex flex-col justify-between gap-[var(--space-3)]"
          >
            {/* Spaltenkopf: Datum */}
            <div
              className={`px-[10px] py-[4px] rounded-[var(--radius-sm)] bg-surface-raised border border-solid border-border-soft text-center font-mono text-[0.75rem] font-bold ${col.hasConnector ? 'text-primary' : 'text-text'}`}
            >
              {col.period}
            </div>

            {/* OBERE SPUR: Kapital & Recht */}
            <div className="flex-1 flex flex-col">
              <div className="text-[0.625rem] font-mono text-cyan-light uppercase tracking-[0.05em] mb-[var(--space-1)] font-semibold">
                Kapital & Recht
              </div>

              {col.capitalEvent ? (
                <div
                  className={`flex-1 bg-background-deep rounded-[var(--radius-md)] border border-solid p-[var(--space-3)] flex flex-col justify-between gap-[var(--space-2)] ${col.hasConnector ? 'border-[rgba(0,217,198,0.4)] border-t-[3px] border-t-primary' : 'border-border-soft border-t-[3px] border-t-border'}`}
                >
                  <div>
                    <h4 className="mt-0 mr-0 mb-[var(--space-1)] ml-0 font-display text-[0.8125rem] font-semibold text-text">
                      {col.capitalEvent.title}
                    </h4>
                    <p className="m-0 text-[0.6875rem] text-[var(--color-text-muted)] leading-[1.35]">
                      {col.capitalEvent.desc}
                    </p>
                  </div>
                </div>
              ) : (
                /* Leere Zelle sichtbar als Teil der gemeinsamen Zeitachse */
                <div className="flex-1 min-h-[80px] rounded-[var(--radius-md)] border border-dashed border-border-soft bg-[rgba(6,22,19,0.3)] flex items-center justify-center text-border text-[0.75rem] font-mono">
                  —
                </div>
              )}
            </div>

            {/* MITTELBEREICH: Senkrechter Verbinder in Spalte Q1 2024 */}
            <div className="h-[36px] flex items-center justify-center relative">
              {col.hasConnector ? (
                <div className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full bg-cyan-a12 border border-solid border-[rgba(0,217,198,0.4)] text-primary text-[0.625rem] font-mono font-bold">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M5 1v8m-3-3l3 3 3-3" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Ermöglicht Launch</span>
                </div>
              ) : (
                <div
                  className="w-[1px] h-full bg-border-soft"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* UNTERE SPUR: Produkt & Markt */}
            <div className="flex-1 flex flex-col">
              <div className="text-[0.625rem] font-mono text-primary uppercase tracking-[0.05em] mb-[var(--space-1)] font-semibold">
                Produkt & Markt
              </div>

              {col.productEvent ? (
                <div
                  className={`flex-1 bg-background-deep rounded-[var(--radius-md)] border border-solid p-[var(--space-3)] flex flex-col justify-between gap-[var(--space-2)] ${col.hasConnector ? 'border-[rgba(0,217,198,0.4)] border-t-[3px] border-t-primary' : 'border-border-soft border-t-[3px] border-t-border'}`}
                >
                  <div>
                    <h4 className="mt-0 mr-0 mb-[var(--space-1)] ml-0 font-display text-[0.8125rem] font-semibold text-text">
                      {col.productEvent.title}
                    </h4>
                    <p className="m-0 text-[0.6875rem] text-[var(--color-text-muted)] leading-[1.35]">
                      {col.productEvent.desc}
                    </p>
                  </div>
                </div>
              ) : (
                /* Leere Zelle sichtbar als Teil der gemeinsamen Zeitachse */
                <div className="flex-1 min-h-[80px] rounded-[var(--radius-md)] border border-dashed border-border-soft bg-[rgba(6,22,19,0.3)] flex items-center justify-center text-border text-[0.75rem] font-mono">
                  —
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE / TABLET ANSICHT: Gemeinsame Stationen mit sichtbaren Spuren */}
      <div className="timeline-slot-mobile">
        {columns.map((col) => (
          <div
            key={`mob-${col.period}`}
            className={`bg-background-deep rounded-[var(--radius-md)] border border-solid p-[var(--space-4)] flex flex-col gap-[var(--space-3)] ${col.hasConnector ? 'border-[rgba(0,217,198,0.4)]' : 'border-border-soft'}`}
          >
            {/* Datum */}
            <div
              className={`inline-block self-start px-[8px] py-[3px] rounded-[var(--radius-sm)] bg-surface-raised border border-solid border-border font-mono text-[0.75rem] font-bold ${col.hasConnector ? 'text-primary' : 'text-text'}`}
            >
              {col.period}
            </div>

            {/* Kapital & Recht */}
            <div className="pl-[var(--space-2)] border-l-2 border-solid border-l-cyan-light">
              <div className="text-[0.625rem] font-mono text-cyan-light uppercase mb-[2px]">
                Kapital & Recht
              </div>
              {col.capitalEvent ? (
                <div>
                  <div className="text-[0.8125rem] font-semibold text-text">
                    {col.capitalEvent.title}
                  </div>
                  <div className="text-[0.75rem] text-[var(--color-text-muted)] mt-[2px] leading-[1.35]">
                    {col.capitalEvent.desc}
                  </div>
                </div>
              ) : (
                <div className="text-[0.75rem] text-[var(--color-text-muted)]">—</div>
              )}
            </div>

            {/* Senkrechter Verbinder in Q1 2024 */}
            {col.hasConnector && (
              <div className="self-start flex items-center gap-[6px] px-[8px] py-[3px] rounded-full bg-cyan-a12 border border-solid border-[rgba(0,217,198,0.4)] text-primary text-[0.6875rem] font-mono font-bold">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M5 1v8m-3-3l3 3 3-3" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Finanzierung ermöglicht Produkt-Launch (GA)</span>
              </div>
            )}

            {/* Produkt & Markt */}
            <div className="pl-[var(--space-2)] border-l-2 border-solid border-l-primary">
              <div className="text-[0.625rem] font-mono text-primary uppercase mb-[2px]">
                Produkt & Markt
              </div>
              {col.productEvent ? (
                <div>
                  <div className="text-[0.8125rem] font-semibold text-text">
                    {col.productEvent.title}
                  </div>
                  <div className="text-[0.75rem] text-[var(--color-text-muted)] mt-[2px] leading-[1.35]">
                    {col.productEvent.desc}
                  </div>
                </div>
              ) : (
                <div className="text-[0.75rem] text-[var(--color-text-muted)]">—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ausklappbare Detail-Ereignisliste */}
      {showDetails && (
        <div
          id="funding-timeline-details"
          className="mt-[var(--space-5)] pt-[var(--space-4)] border-t border-solid border-border flex flex-col gap-[var(--space-3)]"
        >
          <div className="text-[0.8125rem] text-[var(--color-text-muted)] mb-[var(--space-1)]">
            Vollständige Meilensteine (Original-Historie):
          </div>
          {HISTORIE.events.map((e, idx) => (
            <div
              key={idx}
              className="flex gap-[var(--space-4)] items-center bg-background-deep px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-md)] border border-solid border-border-soft"
            >
              <div className="px-[10px] py-[4px] bg-surface text-primary rounded-[var(--radius-sm)] font-bold text-[0.75rem] font-mono shrink-0">
                {e.date}
              </div>
              <div>
                <div className="text-text text-[0.875rem] font-semibold">
                  {e.title}
                </div>
                <div className="text-[var(--color-text-muted)] text-[0.75rem] mt-[2px]">
                  {e.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
