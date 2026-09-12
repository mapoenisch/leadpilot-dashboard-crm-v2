import React, { useState } from 'react';
import { HIGHLIGHTS_GOOD_ROWS, HIGHLIGHTS_BAD_ROWS } from '../../../domain/execData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';
import { Table } from '../../../components/ui/Table';

export const PerformancePulse: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  const stationsCount = Math.max(HIGHLIGHTS_BAD_ROWS.length, HIGHLIGHTS_GOOD_ROWS.length);

  return (
    <div className="facelift-performance-pulse box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Header */}
      <div className="border-0 border-b border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-6)] pb-[var(--space-4)]">
        <div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            Performance-Puls 2025
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[3px] mb-0 mr-0 ml-0">
            Zentrale Jahresachse 2025: Operative Herausforderungen (links) und Erfolge (rechts).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="performance-pulse-raw-table"
          aria-expanded={showTable}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]" 
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {showTable ? 'Tabellen verbergen' : 'Tabellen anzeigen'}
        </button>
      </div>

      {/* Desktop Ansicht: Symmetrische vertikale Achse (>= 768px) */}
      <div className="performance-pulse-desktop relative">
        {/* Achsenkopf */}
        <div className="flex justify-center mb-[var(--space-4)]">
          <span className="font-mono text-[0.75rem] font-bold tracking-[0.08em] uppercase rounded-full border border-solid border-border bg-surface-raised text-text px-[14px] py-[4px]">
            Jahresachse 2025
          </span>
        </div>

        {/* Die Stationen entlang der Achse */}
        <div className="flex flex-col gap-[var(--space-5)] relative">
          {/* Durchgehende vertikale Achsenlinie im Hintergrund */}
          <div
            className="absolute top-[10px] bottom-[10px] left-1/2 w-[2px] bg-border -translate-x-1/2 z-0"
            aria-hidden="true"
          />

          {Array.from({ length: stationsCount }).map((_, i) => {
            const bad = HIGHLIGHTS_BAD_ROWS[i];
            const good = HIGHLIGHTS_GOOD_ROWS[i];

            return (
              <div
                key={`station-${i}`}
                className="grid grid-cols-[1fr_48px_1fr] items-center relative z-[1]"
              >
                {/* Linke Seite: Herausforderung */}
                {bad ? (
                  <div className="flex items-center justify-end">
                    <div className="w-full box-border rounded-md border border-solid border-[rgba(255,122,61,0.3)] border-l-[3px] border-l-accent bg-background-deep px-[var(--space-4)] py-[var(--space-3)]">
                      <div className="flex items-center justify-between gap-[var(--space-2)] mb-[4px]">
                        <span className="font-display text-[0.8125rem] font-semibold text-text">
                          {bad[0]}
                        </span>
                        <div className="flex items-center gap-[4px]">
                          <FaceliftGlyph name="challenge" tone="attention" size={14} />
                          <span className="font-mono text-[0.6875rem] font-semibold text-accent">
                            Herausforderung
                          </span>
                        </div>
                      </div>
                      <p className="m-0 text-[0.8125rem] leading-[1.4] text-[var(--color-text-muted)]">
                        {bad[1]}
                      </p>
                    </div>
                    {/* Horizontaler Verbinder zur Achse */}
                    <div
                      className="w-[24px] h-[1px] shrink-0 bg-[rgba(255,122,61,0.4)]"
                      aria-hidden="true"
                    />
                  </div>
                ) : (
                  <div />
                )}

                {/* Zentraler Achsenknoten */}
                <div className="flex items-center justify-center">
                  <div
                    className="w-[14px] h-[14px] rounded-full bg-surface border-2 border-solid border-border shadow-[0_0_8px_rgba(0,217,198,0.2)]"
                    aria-hidden="true"
                  />
                </div>

                {/* Rechte Seite: Erfolg */}
                {good ? (
                  <div className="flex items-center justify-start">
                    {/* Horizontaler Verbinder zur Achse */}
                    <div
                      className="w-[24px] h-[1px] shrink-0 bg-[rgba(0,217,198,0.4)]"
                      aria-hidden="true"
                    />
                    <div className="w-full box-border rounded-md border border-solid border-[rgba(0,217,198,0.3)] border-r-[3px] border-r-primary bg-background-deep px-[var(--space-4)] py-[var(--space-3)]">
                      <div className="flex items-center justify-between gap-[var(--space-2)] mb-[4px]">
                        <span className="font-display text-[0.8125rem] font-semibold text-text">
                          {good[0]}
                        </span>
                        <div className="flex items-center gap-[4px]">
                          <FaceliftGlyph name="success" tone="positive" size={14} />
                          <span className="font-mono text-[0.6875rem] font-semibold text-primary">
                            Erfolg
                          </span>
                        </div>
                      </div>
                      <p className="m-0 text-[0.8125rem] leading-[1.4] text-[var(--color-text-muted)]">
                        {good[1]}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>

        {/* Achsenende */}
        <div className="flex justify-center mt-[var(--space-4)]">
          <span className="font-mono text-[0.6875rem] rounded-full border border-solid border-border bg-surface-raised text-[var(--color-text-muted)] px-[12px] py-[3px]">
            Abschluss Geschäftsjahr 2025
          </span>
        </div>
      </div>

      {/* Mobile Styles via integriertem style-Block (für Schirme < 768px) */}
      <style>{`
        @media (max-width: 767px) {
          .performance-pulse-desktop {
            display: none !important;
          }
          .performance-pulse-mobile {
            display: flex !important;
          }
        }
        @media (min-width: 768px) {
          .performance-pulse-mobile {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Ansicht: Vertikaler Ablauf entlang der linken Achse (< 768px) */}
      <div className="performance-pulse-mobile hidden flex-col relative gap-[var(--space-4)] pl-[24px]">
        {/* Durchgehende linke Achsenlinie */}
        <div
          className="absolute top-[8px] bottom-[8px] left-[7px] w-[2px] bg-border"
          aria-hidden="true"
        />

        {Array.from({ length: stationsCount }).map((_, i) => {
          const bad = HIGHLIGHTS_BAD_ROWS[i];
          const good = HIGHLIGHTS_GOOD_ROWS[i];

          return (
            <React.Fragment key={`mob-station-${i}`}>
              {/* Herausforderung Mobile */}
              {bad && (
                <div className="relative">
                  <div
                    className="absolute rounded-full bg-accent shadow-[0_0_6px_rgba(255,122,61,0.4)] w-[10px] h-[10px] left-[-21px] top-[14px]"
                    aria-hidden="true"
                  />
                  <div className="rounded-md border border-solid border-[rgba(255,122,61,0.3)] border-l-[3px] border-l-accent bg-background-deep p-[var(--space-3)]">
                    <div className="flex items-center justify-between gap-[var(--space-2)] mb-[4px]">
                      <span className="font-display text-[0.8125rem] font-semibold text-text">
                        {bad[0]}
                      </span>
                      <div className="flex items-center gap-[3px]">
                        <FaceliftGlyph name="challenge" tone="attention" size={12} />
                        <span className="font-mono text-[0.625rem] font-semibold text-accent">
                          Herausforderung
                        </span>
                      </div>
                    </div>
                    <p className="m-0 text-[0.75rem] leading-[1.35] text-[var(--color-text-muted)]">
                      {bad[1]}
                    </p>
                  </div>
                </div>
              )}

              {/* Erfolg Mobile */}
              {good && (
                <div className="relative">
                  <div
                    className="absolute rounded-full bg-primary shadow-[0_0_6px_rgba(0,217,198,0.4)] w-[10px] h-[10px] left-[-21px] top-[14px]"
                    aria-hidden="true"
                  />
                  <div className="rounded-md border border-solid border-[rgba(0,217,198,0.3)] border-l-[3px] border-l-primary bg-background-deep p-[var(--space-3)]">
                    <div className="flex items-center justify-between gap-[var(--space-2)] mb-[4px]">
                      <span className="font-display text-[0.8125rem] font-semibold text-text">
                        {good[0]}
                      </span>
                      <div className="flex items-center gap-[3px]">
                        <FaceliftGlyph name="success" tone="positive" size={12} />
                        <span className="font-mono text-[0.625rem] font-semibold text-primary">
                          Erfolg
                        </span>
                      </div>
                    </div>
                    <p className="m-0 text-[0.75rem] leading-[1.35] text-[var(--color-text-muted)]">
                      {good[1]}
                    </p>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Ausklappbare Tabellen-Ansichten */}
      {showTable && (
        <div
          id="performance-pulse-raw-table"
          className="border-0 border-t border-solid border-border grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[var(--space-4)] mt-[var(--space-5)] pt-[var(--space-4)]"
        >
          <div>
            <h4 className="m-0 mb-[var(--space-2)] text-[0.875rem] text-accent">
              Herausforderungen (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'Kategorie' },
                { key: '1', label: 'Handlungsbedarf' },
              ]}
              rows={HIGHLIGHTS_BAD_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>
          <div>
            <h4 className="m-0 mb-[var(--space-2)] text-[0.875rem] text-primary">
              Top Erfolge (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'Kategorie' },
                { key: '1', label: 'Ergebnis' },
              ]}
              rows={HIGHLIGHTS_GOOD_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};
