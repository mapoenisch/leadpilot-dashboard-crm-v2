import React, { useState } from 'react';
import { BRIDGES_ROWS, SOURCES_ROWS, NOTE_DATEN } from '../../../domain/execData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';
import { Table } from '../../../components/ui/Table';

export const SourceDecisionFlow: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="facelift-source-decision-flow box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Header */}
      <div className="border-0 border-b border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)]">
        <div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            Datenfluss: Source → Bridge → Decision
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[2px] mb-0 mr-0 ml-0">
            Gerichteter Ablauf von den verbindlichen Primärquellen über die Systemschnittstellen zur einheitlichen Entscheidungsbasis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="source-decision-raw-table"
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
          {showTable ? 'Detailtabellen verbergen' : 'Detailtabellen anzeigen'}
        </button>
      </div>

      {/* Responsive Styles für Verbinder */}
      <style>{`
        .flow-connector-horizontal {
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 0 var(--space-1);
        }
        .flow-connector-vertical {
          display: none;
          align-items: center;
          justifyContent: center;
          padding: var(--space-2) 0;
        }
        @media (max-width: 960px) {
          .source-flow-grid {
            grid-template-columns: 1fr !important;
          }
          .flow-connector-horizontal {
            display: none !important;
          }
          .flow-connector-vertical {
            display: flex !important;
          }
        }
      `}</style>

      {/* Gerichteter Datenfluss mit sichtbaren Verbindern */}
      <div className="source-flow-grid grid grid-cols-[1fr_32px_1fr_32px_1fr] items-stretch gap-0">
        {/* Phase 01: Primäre Datenquellen */}
        <div className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-[var(--color-text-muted)]">
                PHASE 01
              </span>
              <FaceliftGlyph name="ready" tone="neutral" size={16} />
            </div>

            <h4 className="m-0 mb-[var(--space-3)] font-display text-[0.9375rem] font-semibold tracking-[0.01em] text-text">
              Primäre Datenquellen
            </h4>

            <div className="flex flex-col gap-[var(--space-2)]">
              {SOURCES_ROWS.map(([quelle, zweck]) => (
                <div
                  key={quelle}
                  className="rounded border border-solid border-border-soft bg-surface p-[var(--space-2)]"
                >
                  <div className="font-display text-[0.75rem] font-semibold text-text">
                    {quelle}
                  </div>
                  <div className="text-[0.6875rem] leading-[1.35] mt-[2px] text-[var(--color-text-muted)]">
                    {zweck}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verbinder 1 -> 2 (Desktop Horizontal) */}
        <div className="flow-connector-horizontal" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m-5-5l5 5-5 5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 1 -> 2 (Mobile Vertikal) */}
        <div className="flow-connector-vertical" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14m-5-5l5 5 5-5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 02: Systemschnittstellen & Datenfluss */}
        <div className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-[var(--color-text-muted)]">
                PHASE 02
              </span>
              <FaceliftGlyph name="focus" tone="accent" size={16} />
            </div>

            <h4 className="m-0 mb-[var(--space-3)] font-display text-[0.9375rem] font-semibold tracking-[0.01em] text-text">
              Systemschnittstellen
            </h4>

            <div className="flex flex-col gap-[var(--space-2)]">
              {BRIDGES_ROWS.map(([system, zweck]) => (
                <div
                  key={system}
                  className="rounded border border-solid border-border-soft bg-surface p-[var(--space-2)]"
                >
                  <div className="font-display text-[0.75rem] font-semibold text-text">
                    {system}
                  </div>
                  <div className="text-[0.6875rem] leading-[1.35] mt-[2px] text-[var(--color-text-muted)]">
                    {zweck}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verbinder 2 -> 3 (Desktop Horizontal) */}
        <div className="flow-connector-horizontal" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m-5-5l5 5-5 5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Verbinder 2 -> 3 (Mobile Vertikal) */}
        <div className="flow-connector-vertical" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14m-5-5l5 5 5-5"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Phase 03: Konsistente Entscheidungsbasis */}
        <div className="rounded-md border border-solid border-[rgba(0,217,198,0.3)] bg-background-deep shadow-[0_0_16px_rgba(0,217,198,0.08)] p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]">
          <div>
            <div className="flex items-center justify-between mb-[var(--space-2)]">
              <span className="font-mono text-[0.6875rem] font-bold text-primary">
                PHASE 03
              </span>
              <FaceliftGlyph name="contactToCustomer" tone="positive" size={16} />
            </div>

            <h4 className="m-0 mb-[var(--space-3)] font-display text-[0.9375rem] font-semibold tracking-[0.01em] text-text">
              {NOTE_DATEN.title}
            </h4>

            <div className="rounded border border-solid border-border-soft bg-surface p-[var(--space-3)]">
              <p className="m-0 text-[0.8125rem] leading-[1.45] text-text">
                {NOTE_DATEN.paragraphs[0]}
              </p>
            </div>
          </div>

          <div className="border-0 border-t border-solid border-border-soft flex items-center justify-between pt-[var(--space-2)]">
            <span className="font-mono text-[0.6875rem] text-[var(--color-text-muted)]">
              Single Source of Truth
            </span>
            <span className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-solid border-[rgba(0,217,198,0.3)] bg-cyan-a12 text-primary font-mono text-[0.6875rem] font-semibold px-[8px] py-[2px]">
              Entscheidungsreif
            </span>
          </div>
        </div>
      </div>

      {/* Detailtabellen als Fallback */}
      {showTable && (
        <div
          id="source-decision-raw-table"
          className="border-0 border-t border-solid border-border flex flex-col gap-[var(--space-4)] mt-[var(--space-5)] pt-[var(--space-4)]"
        >
          <div>
            <h4 className="m-0 mb-[var(--space-2)] text-[0.875rem] text-text">
              Systemschnittstellen & Datenfluss (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'System' },
                { key: '1', label: 'Verwendungszweck' },
              ]}
              rows={BRIDGES_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>

          <div>
            <h4 className="m-0 mb-[var(--space-2)] text-[0.875rem] text-text">
              Verwendete Datenquellen (Tabelle):
            </h4>
            <Table
              columns={[
                { key: '0', label: 'Quelle' },
                { key: '1', label: 'Zweck' },
              ]}
              rows={SOURCES_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};
