import React, { useState } from 'react';
import { PERF } from '../../../domain/produktData';

export const ProductHealth: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  // 6 Kennzahlen sachlich gruppiert in die drei Säulen Stabilität, Nutzung und Onboarding
  // Zielstatus wird automatisch aus dem Werttext abgeleitet (enthält 'erreicht' vs 'verfehlt')
  const healthGroups = [
    {
      id: 'stabilitaet',
      title: 'Stabilität',
      explanation: 'Verfügbarkeit + Support-Tickets: Messung der Systemstabilität und Servicezuverlässigkeit.',
      metrics: [PERF.metrics[0], PERF.metrics[5]],
    },
    {
      id: 'nutzung',
      title: 'Nutzung',
      explanation: 'WAU/MAU + KI-Scoring-Nutzung: Messung der regelmäßigen Plattform- und Feature-Aktivität.',
      metrics: [PERF.metrics[2], PERF.metrics[3]],
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      explanation: 'Aktivierungsrate + Time-to-First-Action: Messung des initialen Einstiegs und der Nutzeraktivierung.',
      metrics: [PERF.metrics[1], PERF.metrics[4]],
    },
  ];

  return (
    <div className="facelift-product-health box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Header */}
      <div className="border-0 border-b border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)]">
        <div>
          <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] mb-[2px] text-[var(--cyan-light)]">
            Produktgesundheit • Qualitätsmatrix
          </div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            {PERF.title}
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[2px] mb-0 mr-0 ml-0">
            Gegliedert in die drei Säulen Stabilität, Nutzung und Onboarding mit abgeleitetem Zielstatus.
          </p>
        </div>

        {/* Legende & Toggle */}
        <div className="flex items-center gap-[var(--space-3)] flex-wrap">
          <div className="flex items-center gap-[var(--space-2)] font-mono text-[0.75rem]">
            <span className="inline-flex items-center gap-[4px] text-primary">
              <span className="w-[8px] h-[8px] rounded-full bg-primary" />
              Ziel erreicht
            </span>
            <span className="inline-flex items-center gap-[4px] text-accent">
              <span className="w-[8px] h-[8px] rounded-full bg-accent" />
              Ziel verfehlt
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            aria-controls="product-health-table"
            aria-expanded={showTable}
            className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
          >
            {showTable ? 'Tabelle verbergen' : 'Tabelle anzeigen'}
          </button>
        </div>
      </div>

      {/* DREI PERFORMANCE-SÄULEN (STABILITÄT, NUTZUNG, ONBOARDING) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[var(--space-4)]">
        {healthGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-4)]"
          >
            <div>
              {/* Gruppenkopf */}
              <div className="border-0 border-b border-solid border-border-soft mb-[var(--space-3)] pb-[var(--space-2)]">
                <h4 className="font-display text-[1rem] font-bold text-text mt-0 mb-[4px] mr-0 ml-0">
                  {group.title}
                </h4>
                <p className="m-0 text-[0.6875rem] leading-[1.4] text-[var(--color-text-muted)]">
                  {group.explanation}
                </p>
              </div>

              {/* Kennzahlen der Säule */}
              <div className="flex flex-col gap-[var(--space-3)]">
                {group.metrics.map((m) => {
                  // Zielstatus direkt aus dem vorhandenen Werttext ableiten
                  const isReached = m.val.toLowerCase().includes('erreicht');
                  return (
                    <div
                      key={m.label}
                      className={`rounded border border-solid p-[var(--space-3)] ${isReached ? 'border-[rgba(0,217,198,0.3)] border-l-[3px] border-l-primary' : 'border-[rgba(255,122,61,0.3)] border-l-[3px] border-l-accent'}`}
                    >
                      <div className="font-body text-[0.6875rem] mb-[4px] text-[var(--color-text-muted)]">
                        {m.label}
                      </div>
                      <div className={`font-display text-[1.0625rem] font-bold leading-[1.3] ${isReached ? 'text-primary' : 'text-accent'}`}>
                        {m.val}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ausklappbare Original-Tabelle */}
      {showTable && (
        <div
          id="product-health-table"
          className="border-0 border-t border-solid border-border flex flex-col gap-[var(--space-2)] mt-[var(--space-5)] pt-[var(--space-4)]"
        >
          <div className="text-[0.8125rem] mb-[var(--space-1)] text-[var(--color-text-muted)]">
            Vollständige Liste der Leistungskennzahlen (Originaldaten):
          </div>
          {PERF.metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-wrap justify-between items-center gap-[var(--space-2)] rounded border border-solid border-border-soft bg-background-deep p-[var(--space-3)]"
            >
              <span className="text-[0.8125rem] font-medium text-text">
                {m.label}
              </span>
              <span className="font-mono text-[0.8125rem] font-bold text-primary">
                {m.val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
