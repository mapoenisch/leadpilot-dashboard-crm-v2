import React from 'react';
import { ICP_SPECS } from '../../../domain/icpData';

export const IcpFitMap: React.FC = () => {
  const firmografie = ICP_SPECS.firmografie;
  const triggers = ICP_SPECS.triggers;
  const exclusions = ICP_SPECS.exclusion;

  return (
    <section
      className="facelift-icp-fit-map box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="ICP-Fit-Karte & Ausschlusszone"
    >
      <style>{`
        @media (max-width: 600px) {
          .facelift-icp-fit-map {
            padding: 12px 10px !important;
          }
          .icp-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="icp-header flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase px-[8px] py-[2px]">
            ICP-FIT-KARTE
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Qualitative Zielgruppen-Architektur
          </span>
        </div>
        <h3 className="icp-heading m-0 font-display text-[1.25rem] font-bold text-text [overflow-wrap:anywhere]">
          {ICP_SPECS.title}
        </h3>
        <p className="m-0 text-[13px] leading-[1.4] text-[var(--color-text-muted)]">
          Strukturierte Gegenüberstellung des B2B-Mittelstand-Idealprofils und der Ausschlusszone.
        </p>
      </div>

      {/* Haupt-Raster: Fit-Zone (links/oben) vs. Ausschlusszone (rechts/unten) */}
      <div className="icp-grid grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-[var(--space-4,16px)] min-w-0 box-border">
        {/* FIT-ZONE: Idealprofil & Firmografie */}
        <div className="icp-fit-zone rounded-md border border-solid border-[rgba(0,217,198,0.28)] bg-[rgba(0,217,198,0.04)] p-[var(--space-4,16px)] flex flex-col gap-[var(--space-3,12px)] min-w-0 box-border [overflow-wrap:anywhere]">
          <div className="flex items-center justify-between flex-wrap gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <span className="w-[10px] h-[10px] rounded-full bg-primary shadow-[0_0_8px_rgba(0,217,198,0.6)]" />
              <strong className="text-[14px] tracking-[0.02em] text-primary">
                IDEALPROFIL (FIT-ZONE)
              </strong>
            </div>
            <span className="text-[11px] font-semibold rounded bg-[rgba(0,217,198,0.12)] text-primary px-[6px] py-[2px]">
              Fokus B2B-Mittelstand
            </span>
          </div>

          <div className="flex flex-col gap-[10px] mt-[4px] min-w-0">
            {firmografie.map((item) => (
              <div
                key={item.key}
                className="icp-firmografie-item rounded-[6px] border border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] bg-surface flex flex-col gap-[2px] min-w-0 box-border [overflow-wrap:anywhere] px-[10px] py-[8px]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-primary">
                  {item.key}
                </span>
                <span className="text-[13px] leading-[1.35] text-text [overflow-wrap:anywhere]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RECHTE SPALTE: Auslösende Trigger + Ausschlusszone */}
        <div className="flex flex-col gap-[var(--space-4,16px)] min-w-0 box-border">
          {/* AUSLÖSENDE TRIGGER (Auslöser 1–3 in Quellreihenfolge) */}
          <div className="icp-triggers-card rounded-md border border-solid border-[rgba(124,239,230,0.24)] bg-[rgba(124,239,230,0.04)] p-[var(--space-4,16px)] flex flex-col gap-[var(--space-3,12px)] min-w-0 box-border [overflow-wrap:anywhere]">
            <div className="flex items-center justify-between flex-wrap gap-[8px]">
              <strong className="text-[13.5px] tracking-[0.02em] text-[var(--cyan-light,#7CEFE6)]">
                Auslösende Trigger im Vertrieb
              </strong>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Einstiegsindikatoren
              </span>
            </div>

            <div className="flex flex-col gap-[8px] min-w-0">
              {triggers.map((trigger, idx) => (
                <div
                  key={idx}
                  className="icp-trigger-item flex items-start gap-[10px] rounded-[6px] border border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] bg-surface min-w-0 box-border [overflow-wrap:anywhere] px-[10px] py-[8px]"
                >
                  <span className="shrink-0 inline-flex items-center justify-center rounded text-[11px] font-bold bg-[rgba(124,239,230,0.12)] text-[var(--cyan-light,#7CEFE6)] px-[6px] py-[2px]">
                    Auslöser {idx + 1}
                  </span>
                  <span className="text-[12.5px] leading-[1.35] text-text [overflow-wrap:anywhere]">
                    {trigger}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AUSSCHLUSSZONE: „Nicht verfolgen“ */}
          <div className="icp-exclusion-zone rounded-md border border-solid border-[rgba(255,77,77,0.3)] bg-[rgba(255,77,77,0.05)] p-[var(--space-4,16px)] flex flex-col gap-[var(--space-3,12px)] min-w-0 box-border [overflow-wrap:anywhere]">
            <div className="flex items-center justify-between flex-wrap gap-[8px]">
              <div className="flex items-center gap-[8px]">
                <span className="w-[10px] h-[10px] rounded-full bg-[var(--color-error,#FF4D4D)] shadow-[0_0_8px_rgba(255,77,77,0.6)]" />
                <strong className="text-[13.5px] tracking-[0.02em] text-[var(--color-error,#FF4D4D)]">
                  AUSSCHLUSSZONE: „NICHT VERFOLGEN“
                </strong>
              </div>
              <span className="text-[11px] font-bold rounded bg-[rgba(255,77,77,0.14)] text-[var(--color-error,#FF4D4D)] px-[6px] py-[2px]">
                Negative Fit
              </span>
            </div>

            <div className="flex flex-col gap-[8px]">
              {exclusions.map((exclusion, idx) => (
                <div
                  key={idx}
                  className="icp-exclusion-item flex items-start gap-[10px] rounded-[6px] border border-solid border-[rgba(255,77,77,0.2)] bg-surface px-[10px] py-[8px]"
                >
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full text-[11px] font-bold bg-[rgba(255,77,77,0.15)] text-[var(--color-error,#FF4D4D)] w-[20px] h-[20px]">
                    ✕
                  </span>
                  <span className="text-[12.5px] leading-[1.35] text-text break-words">
                    {exclusion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
