import React from 'react';
import { CockpitKpiItem } from '@/domain/executiveCockpitData';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface CockpitKpiRailProps {
  kpis: CockpitKpiItem[];
}

export const CockpitKpiRail: React.FC<CockpitKpiRailProps> = ({ kpis }) => {
  return (
    <div
      data-testid="cockpit-kpi-rail"
      className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[var(--space-4)] w-full"
    >
      {kpis.map((kpi) => {
        const isNegative = kpi.isNegativeAlert || kpi.rawValue < 0;
        // G39 Welle 1: Laufzeit-Auswahl aus Build-Zeit-bekannten Farbwerten
        // → Klassen-Ternaries (Muster Auftrag 053 Nachtrag 2), kein style.
        const valueColorClass = isNegative ? 'text-[#FF7A3D]' : 'text-[#00D9C6]';
        const cardBorderClass = isNegative ? 'border-[rgba(255,122,61,0.28)]' : 'border-[rgba(0,217,198,0.18)]';
        const cardShadowClass = isNegative
          ? 'shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05),0_0_16px_rgba(255,122,61,0.1)]'
          : 'shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05),0_0_16px_rgba(0,217,198,0.08)]';
        const valueShadowClass = isNegative
          ? '[text-shadow:0_0_16px_rgba(255,122,61,0.2)]'
          : '[text-shadow:0_0_16px_rgba(0,217,198,0.2)]';
        const deltaBgClass = isNegative
          ? 'bg-[rgba(255,122,61,0.12)]'
          : kpi.deltaType === 'positive'
          ? 'bg-[rgba(0,217,198,0.12)]'
          : 'bg-[rgba(255,255,255,0.06)]';
        const deltaColorClass = isNegative
          ? 'text-[#FF7A3D]'
          : kpi.deltaType === 'positive'
          ? 'text-[#00D9C6]'
          : 'text-[var(--color-text-muted)]';
        const deltaBorderClass = isNegative
          ? 'border-[rgba(255,122,61,0.25)]'
          : kpi.deltaType === 'positive'
          ? 'border-[rgba(0,217,198,0.25)]'
          : 'border-[rgba(255,255,255,0.1)]';

        return (
          <div
            key={kpi.id}
            data-testid={`cockpit-kpi-${kpi.id}`}
            className={`flex flex-col justify-between min-h-[135px] relative overflow-hidden rounded-[8px] border border-solid ${cardBorderClass} ${cardShadowClass} bg-[linear-gradient(135deg,rgba(11,30,28,0.75)_0%,rgba(5,18,17,0.85)_100%)] backdrop-blur-[12px] px-[20px] py-[18px]`}
          >
            {/* Oben: Label & Delta */}
            <div className="flex justify-between items-start gap-[8px]">
              <span className="text-[12px] font-semibold tracking-[0.02em] text-[var(--color-text-muted)]">
                {kpi.label}
              </span>
              {kpi.delta && (
                <span
                  className={`inline-flex items-center gap-[3px] text-[11px] font-semibold rounded border border-solid px-[6px] py-[2px] ${deltaBgClass} ${deltaColorClass} ${deltaBorderClass}`}
                >
                  {isNegative ? (
                    <ArrowDownRight size={12} />
                  ) : kpi.deltaType === 'positive' ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <Minus size={10} />
                  )}
                  {kpi.delta}
                </span>
              )}
            </div>

            {/* Mitte: Dominanter Wert */}
            <div className={`font-display text-[30px] font-bold tracking-[-0.02em] leading-[1.15] my-[10px] mx-0 mb-[6px] ${valueColorClass} ${valueShadowClass}`}>
              {kpi.value}
            </div>

            {/* Unten: Kontextnotiz */}
            <div className="text-[11.5px] leading-[1.35] border-t border-solid border-[rgba(255,255,255,0.06)] pt-[6px] text-[var(--color-text-muted)]">
              {kpi.note}
            </div>
          </div>
        );
      })}
    </div>
  );
};
