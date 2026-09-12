import React from 'react';
import { HR } from '../../../domain/organisationData';

export const PeopleHealthRail: React.FC = () => {
  const metrics = HR.metrics || [];
  const dateMatch = metrics.map((m) => m.label.match(/\d{2}\.\d{2}\.\d{4}/)?.[0]).find(Boolean);
  const dateText = dateMatch ? ` zum Stichtag ${dateMatch}` : '';

  return (
    <section
      className="facelift-people-health-rail box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="People-Health Kennzahlenleiste"
    >
      <style>{`
        .health-rail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }
        @media (max-width: 600px) {
          .facelift-people-health-rail {
            padding: 12px 8px !important;
          }
          .health-rail-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase whitespace-normal px-[8px] py-[2px]">
            PEOPLE HEALTH
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Organisations- & Personalkennzahlen im Überblick
          </span>
        </div>
        <h3 className="m-0 font-display font-bold text-text text-[clamp(1.1rem,4vw,1.25rem)] [overflow-wrap:anywhere]">
          People-Health-Leiste & Kennzahlenprofil
        </h3>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          Übersicht der zentralen personalwirtschaftlichen Messgrößen{dateText}.
        </p>
      </div>

      {/* Verbindliche Neutralitätsnotiz (0 Kausalität behauptet) */}
      <div
        role="note"
        aria-label="Neutralitätshinweis"
        className="rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] flex items-center gap-[10px] flex-wrap text-[12px] leading-[1.4] text-[var(--color-text-muted)] px-[14px] py-[10px]"
      >
        <span className="font-bold text-text">ℹ️ Hinweis:</span>
        <span>Kennzahlen im Überblick; keine nachgewiesenen Wirkzusammenhänge.</span>
      </div>

      {/* Kennzahlen-Grid mit robuster Textumbruch-Sicherheit */}
      <div className="health-rail-grid" role="region" aria-label="People-Health Kennzahlen">
        {metrics.map((m) => {
          const isFluktuation = m.label.includes('Fluktuation');
          const isAufwand = m.label.includes('Personalaufwand');

          return (
            <article
              key={m.label}
              className={`rounded-md border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] flex flex-col justify-between gap-[8px] min-w-0 box-border [overflow-wrap:anywhere] break-words p-[14px] ${isFluktuation ? 'border-l-4 border-l-[var(--color-warning,#FFB800)]' : isAufwand ? 'border-l-4 border-l-[var(--color-primary,#00D9C6)]' : ''}`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] [overflow-wrap:anywhere] text-[var(--color-text-muted)]">
                {m.label}
              </span>

              <div className="font-display font-bold text-text leading-[1.35] [overflow-wrap:anywhere] break-words text-[clamp(15px,3.5vw,18px)]">
                {m.val}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
