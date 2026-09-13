import React from 'react';
import { OKR } from '../../../domain/strategieData';

interface ParsedKR {
  krId: string;
  label: string;
  fromVal: string;
  toVal: string;
  note?: string;
}

const KR_REGEX = /(KR \d+): (.+?) von (.+?) auf (.+?)(?: \((.+?)\))?$/;

function parseKeyResult(rawText: string): ParsedKR {
  const match = rawText.match(KR_REGEX);
  if (!match) {
    return {
      krId: 'KR',
      label: rawText,
      fromVal: '—',
      toVal: '—',
    };
  }
  return {
    krId: match[1] ?? 'KR',
    label: match[2] ?? rawText,
    fromVal: match[3] ?? '—',
    toVal: match[4] ?? '—',
    note: match[5],
  };
}

export const GoalRunway: React.FC = () => {
  const objectives = OKR.objectives || [];

  return (
    <section
      className="facelift-goal-runway w-full box-border rounded-[var(--radius-lg,12px)] border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Ziel-Startbahn OKR"
    >
      <style>{`
        .runway-card-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .runway-track {
          display: grid;
          grid-template-columns: minmax(130px, 160px) 1fr minmax(130px, 160px);
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: var(--radius-md, 8px);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--color-border);
        }
        .runway-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          min-width: 0;
          padding: 0 8px;
        }
        .runway-connector-line {
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, rgba(0, 217, 198, 0.25) 0%, rgba(0, 217, 198, 0.8) 100%);
          border-radius: 2px;
          position: relative;
        }
        @media (max-width: 650px) {
          .facelift-goal-runway {
            padding: 12px 8px !important;
          }
          .runway-track {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 12px 10px;
          }
          .runway-connector {
            padding: 4px 0;
          }
          .runway-connector-line {
            height: 2px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center px-[8px] py-[2px] rounded-[4px] text-[11px] font-bold tracking-[0.05em] uppercase text-primary bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.25)] whitespace-normal">
            ZIEL-STARTBAHN
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Ausgangspunkt, Zwischenetappen & Zielkorridore 2026
          </span>
        </div>
        <h3 className="m-0 text-[clamp(1.1rem,4vw,1.25rem)] font-bold text-text font-display [overflow-wrap:anywhere]">
          {OKR.title}
        </h3>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          Visualisierung der Startbahn-Etappen je strategischem Objective: Basis 2025,
          Fortschrittsverlauf und Lücke zur Zielstation 2026.
        </p>
      </div>

      {/* Objectives Liste */}
      <div className="runway-card-grid" role="region" aria-label="OKR Startbahnen">
        {objectives.map((obj, objIdx) => {
          const parsedKrs = (obj.krs || []).map(parseKeyResult);

          return (
            <article
              key={objIdx}
              className="rounded-[var(--radius-md,10px)] border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.01))] p-[var(--space-4,16px)] flex flex-col gap-[14px] min-w-0 box-border [overflow-wrap:anywhere]"
            >
              {/* Objective Header */}
              <div className="flex justify-between items-baseline flex-wrap gap-[8px] border-b border-solid border-border pb-[10px]">
                <h4 className="m-0 text-[14px] font-bold text-text font-display [overflow-wrap:anywhere]">
                  {obj.title}
                </h4>
                <span className="text-[11px] font-semibold text-primary bg-[rgba(0,217,198,0.08)] px-[6px] py-[2px] rounded-[4px] shrink-0">
                  {parsedKrs.length} Key Results
                </span>
              </div>

              {/* Startbahnen der Key Results */}
              <div className="flex flex-col gap-[10px]">
                {parsedKrs.map((kr, krIdx) => (
                  <div key={krIdx} className="runway-track">
                    {/* Basiswert 2025 */}
                    <div className="flex flex-col gap-[2px] min-w-0 [overflow-wrap:anywhere]">
                      <div className="flex items-center gap-[6px] flex-wrap">
                        <span className="text-[10px] font-bold px-[5px] py-[1px] rounded-[3px] text-[var(--color-text-muted)] bg-[rgba(255,255,255,0.08)]">
                          {kr.krId}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.04em]">
                          Basis 2025
                        </span>
                      </div>
                      <div className="text-[15px] font-bold text-text font-display mt-[2px]">
                        {kr.fromVal}
                      </div>
                      <div className="text-[11.5px] text-[var(--color-text-muted)] leading-[1.3]">
                        {kr.label}
                      </div>
                    </div>

                    {/* Startbahn-Verlauf & Lücke */}
                    <div className="runway-connector">
                      <div className="flex items-center justify-center gap-[6px] flex-wrap w-full text-center">
                        <span className="text-[10px] font-bold tracking-[0.03em] uppercase text-primary">
                          Lücke zur Zielstation
                        </span>
                        {kr.note && (
                          <span className="text-[10.5px] font-semibold px-[6px] py-[1px] rounded-[4px] bg-[rgba(0,217,198,0.12)] text-primary border border-solid border-[rgba(0,217,198,0.25)]">
                            {kr.note}
                          </span>
                        )}
                      </div>
                      <div className="runway-connector-line" />
                      <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-[4px]">
                        <span>Zeithorizont GJ 2026</span>
                        <span>➔</span>
                      </div>
                    </div>

                    {/* Zielwert 2026 */}
                    <div className="flex flex-col gap-[2px] min-w-0 items-start bg-[rgba(0,217,198,0.05)] border border-solid border-[rgba(0,217,198,0.2)] px-[10px] py-[8px] rounded-[6px] [overflow-wrap:anywhere]">
                      <div className="flex items-center gap-[6px] flex-wrap">
                        <span className="text-[10px] font-bold px-[5px] py-[1px] rounded-[3px] text-[#001A17] bg-[var(--color-primary,#00D9C6)]">
                          ZIEL 2026
                        </span>
                        <span className="text-[11px] text-primary font-semibold">Zielstation</span>
                      </div>
                      <div className="text-[16px] font-bold text-primary font-display mt-[2px]">
                        {kr.toVal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
