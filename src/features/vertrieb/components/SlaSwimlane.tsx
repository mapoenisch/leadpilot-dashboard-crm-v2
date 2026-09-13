import React from 'react';
import { SLA } from '../../../domain/vertriebData';

export const SlaSwimlane: React.FC = () => {
  return (
    <section
      className="facelift-sla-swimlane w-full box-border rounded-[var(--radius-lg,12px)] border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="SLA-Swimlanes Marketing & Vertrieb"
    >
      <style>{`
        .swimlane-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .handoff-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .swimlane-container {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .handoff-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 600px) {
          .facelift-sla-swimlane {
            padding: 12px 8px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center px-[8px] py-[2px] rounded-[4px] text-[11px] font-bold tracking-[0.05em] uppercase text-primary bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.25)] whitespace-normal">
            SLA-SWIMLANES
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Prozessverantwortung, Fristen & Rückführungspfade
          </span>
        </div>
        <h3 className="m-0 text-[clamp(1.1rem,4vw,1.25rem)] font-bold text-text font-display [overflow-wrap:anywhere]">
          Service Level Agreement: Marketing ↔ Sales
        </h3>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          Verbindliche Schnittstelle für Lead-Übergabe, Reaktionsfristen und geregelte Rückführung
          nicht-qualifizierter Kontakte.
        </p>
      </div>

      {/* Zentraler Handoff-Knoten */}
      <div className="handoff-banner px-[16px] py-[14px] rounded-[var(--radius-md,8px)] border border-solid border-[rgba(0,217,198,0.35)] bg-[rgba(0,217,198,0.05)] min-w-0">
        <div className="flex flex-col gap-[4px] min-w-0">
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="text-[10px] font-bold uppercase px-[6px] py-[1px] rounded-[4px] bg-primary text-[#061312]">
              ÜBERGABEPUNKT
            </span>
            <strong className="text-[14px] text-text">{SLA.handoff.title}</strong>
          </div>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Kriterium: {SLA.handoff.rows[1]?.[1] ?? ''}
          </span>
        </div>

        <div className="flex items-center gap-[10px] flex-wrap">
          <div className="inline-flex items-center gap-[6px] px-[8px] py-[4px] rounded-[6px] bg-[rgba(255,122,61,0.15)] border border-solid border-[rgba(255,122,61,0.3)] text-accent text-[11px] font-bold flex-wrap">
            <span>⏱️</span>
            <span>FRIST: ERSTKONTAKT ≤ 24H (WERKTAGS)</span>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-[4px] flex-wrap">
            <span>{SLA.handoff.rows[0]?.[1] ?? ''}</span>
            <span className="text-primary font-bold">➔</span>
            <span className="text-text font-semibold">{SLA.handoff.rows[2]?.[1] ?? ''}</span>
          </div>
        </div>
      </div>

      {/* 3 Parallele Bahnen (Swimlanes) */}
      <div className="swimlane-container" role="region" aria-label="SLA-Zuständigkeitsbahnen">
        {/* BAHN 1: Marketing */}
        <article className="rounded-[var(--radius-md,8px)] border border-solid border-border border-t-4 border-t-primary bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[12px] min-w-0">
          <div className="flex justify-between items-start flex-wrap gap-[6px]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-primary">
                BAHN 1
              </span>
              <h4 className="mt-[4px] mr-0 mb-0 ml-0 text-[14px] text-text font-bold">
                Marketing Verantwortung
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-primary bg-[rgba(0,217,198,0.1)] px-[6px] py-[2px] rounded-[4px]">
              Status: MQL
            </span>
          </div>

          <p className="m-0 text-[12px] text-[var(--color-text-muted)] leading-[1.4]">
            Verantwortlich für die kontinuierliche Lead-Generierung und Vorqualifizierung vor dem
            Übergabepunkt.
          </p>

          <ul className="m-0 pl-[16px] text-[12px] flex flex-col gap-[8px] text-text">
            {SLA.marketing.map((item, i) => (
              <li key={i} className="leading-[1.4]">
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-[10px] border-t border-solid border-border text-[11px] text-primary flex items-center gap-[6px] font-semibold flex-wrap">
            <span>➔ Richtung Übergabe:</span>
            <span>Lead an Sales übergeben, wenn Score ≥ 80</span>
          </div>
        </article>

        {/* BAHN 2: Sales */}
        <article className="rounded-[var(--radius-md,8px)] border border-solid border-border border-t-4 border-t-accent bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[12px] min-w-0">
          <div className="flex justify-between items-start flex-wrap gap-[6px]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-accent">
                BAHN 2
              </span>
              <h4 className="mt-[4px] mr-0 mb-0 ml-0 text-[14px] text-text font-bold">
                Sales Verantwortung
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-accent bg-[rgba(255,122,61,0.1)] px-[6px] py-[2px] rounded-[4px]">
              Status: SQL / Demo
            </span>
          </div>

          <p className="m-0 text-[12px] text-[var(--color-text-muted)] leading-[1.4]">
            Verbindliche Bearbeitung der übergebenen MQLs zur Qualifizierung und Durchführung der
            Erstgespräche.
          </p>

          <ul className="m-0 pl-[16px] text-[12px] flex flex-col gap-[8px] text-text">
            {SLA.sales.map((item, i) => (
              <li key={i} className="leading-[1.4]">
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-[10px] border-t border-solid border-border text-[11px] text-accent flex items-center gap-[6px] font-semibold flex-wrap">
            <span>➔ Richtung Abschluss:</span>
            <span>SQL bestätigen oder mit Grund disqualifizieren</span>
          </div>
        </article>

        {/* BAHN 3: Rückgabe & Eskalation */}
        <article className="rounded-[var(--radius-md,8px)] border border-solid border-border border-t-4 border-t-warning bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[12px] min-w-0">
          <div className="flex justify-between items-start flex-wrap gap-[6px]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-warning">
                BAHN 3
              </span>
              <h4 className="mt-[4px] mr-0 mb-0 ml-0 text-[14px] text-text font-bold">
                Rückgabe & Eskalation
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-warning bg-[rgba(255,184,0,0.12)] px-[6px] py-[2px] rounded-[4px]">
              Feedback-Schleife
            </span>
          </div>

          <p className="m-0 text-[12px] text-[var(--color-text-muted)] leading-[1.4]">
            Verfahren bei Nicht-Erreichbarkeit, Disqualifikation oder Fristverletzungen.
          </p>

          <div className="flex flex-col gap-[8px]">
            <div className="px-[10px] py-[8px] rounded-[6px] bg-[rgba(255,184,0,0.05)] border border-solid border-[rgba(255,184,0,0.2)] flex flex-col gap-[3px]">
              <div className="text-[12px] font-bold text-text flex items-center gap-[6px]">
                <span className="text-warning">↩</span>
                <span>Rückgabe an Marketing</span>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] leading-[1.4]">
                Disqualifikation mit konkretem Grund dokumentieren; Lead wird zurück ins
                automatisierte Content-Nurturing überführt.
              </div>
            </div>

            <div className="px-[10px] py-[8px] rounded-[6px] bg-[rgba(255,122,61,0.05)] border border-solid border-[rgba(255,122,61,0.2)] flex flex-col gap-[3px]">
              <div className="text-[12px] font-bold text-accent flex items-center gap-[6px]">
                <span>⚠️</span>
                <span>Eskalation bei Überschreitung der 24h-Frist</span>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] leading-[1.4]">
                Wird die Reaktionszeit von 24 Stunden (werktags) für den Erstkontakt überschritten,
                greift die Eskalationsregel.
              </div>
            </div>
          </div>

          <div className="mt-auto pt-[10px] border-t border-solid border-border text-[11px] text-warning flex items-center gap-[6px] font-semibold flex-wrap">
            <span>↩ Richtung Nurturing:</span>
            <span>Zurück in den Content-Plan (Marketing)</span>
          </div>
        </article>
      </div>
    </section>
  );
};
