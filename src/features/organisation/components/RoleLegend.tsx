import React from 'react';
import { TEAM } from '../../../domain/organisationData';

export const RoleLegend: React.FC = () => {
  const bottlenecks = TEAM.bottlenecks || [];

  return (
    <aside
      className="facelift-role-legend box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-4,16px)] flex flex-col gap-[var(--space-4,16px)] [overflow-wrap:anywhere]"
      aria-label="Rollen-Landkarte und Engpass-Legende"
    >
      <div className="flex items-center justify-between flex-wrap gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="inline-flex items-center rounded border border-solid border-border bg-[rgba(255,255,255,0.05)] text-[11px] font-bold tracking-[0.05em] uppercase text-[var(--color-text-muted)] px-[8px] py-[2px]">
            LEGENDE & DETAILS
          </span>
          <strong className="text-[13px] text-text">
            Rollen-Landkarte & Engpass-Dokumentation
          </strong>
        </div>
        <span className="text-[11px] text-[var(--color-text-muted)]">Quelle: TEAM.bottlenecks</span>
      </div>

      {/* Liste der 3 Engpässe und der Maßnahme als Quellentexte */}
      <div className="flex flex-col gap-[8px] min-w-0">
        {bottlenecks.map((item, idx) => {
          const isMeasure = item.startsWith('Maßnahme:');

          return (
            <div
              key={idx}
              className={`flex items-start gap-[10px] min-w-0 rounded-md border border-solid px-[12px] py-[10px] ${isMeasure ? 'border-[rgba(0,217,198,0.3)] bg-[rgba(0,217,198,0.04)]' : 'border-[rgba(255,122,61,0.3)] bg-[rgba(255,122,61,0.05)]'}`}
            >
              <span
                className={`text-[12px] font-bold leading-[1.4] shrink-0 ${isMeasure ? 'text-primary' : 'text-accent'}`}
              >
                {isMeasure ? '✅' : '⚠️'}
              </span>
              <span className="text-[12px] leading-[1.4] text-text [overflow-wrap:anywhere]">
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
