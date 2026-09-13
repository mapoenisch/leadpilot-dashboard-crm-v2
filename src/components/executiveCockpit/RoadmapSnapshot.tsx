import React from 'react';
import { getRoadmapSnapshot } from '@/domain/executiveCockpitData';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

export const RoadmapSnapshot: React.FC = () => {
  const { releases } = getRoadmapSnapshot();

  return (
    <div
      data-testid="roadmap-snapshot"
      className="flex flex-col gap-[12px] w-full relative overflow-hidden rounded-[6px]"
    >
      {/* Szenisches, dekoratives Visual-Asset für räumliche Horizont- und Tiefenwirkung */}
      <img
        src="/assets/roadmap/roadmap-backdrop.webp"
        alt=""
        aria-hidden="true"
        width={1600}
        height={900}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.65] pointer-events-none z-0"
      />

      {/* Semantische Timeline-Ebene über dem szenischen Backdrop */}
      <div className="relative z-[1] flex flex-col gap-[14px] pl-[8px]">
        {/* Vertikale Verbindungslinie */}
        <div className="absolute left-[19px] top-[8px] bottom-[12px] w-[2px] bg-[linear-gradient(180deg,#00D9C6_0%,rgba(0,217,198,0.6)_60%,rgba(143,163,161,0.3)_100%)] shadow-[0_0_10px_rgba(0,217,198,0.5)]" />

        {releases.map((rel, idx) => {
          const isReleased = rel.status === 'Released';
          const isInDev = rel.status === 'In Entwicklung';
          // G39 Welle 1: Status-Farben aus Build-Zeit-bekannten Werten →
          // Klassen-Ternaries (Muster Auftrag 053 Nachtrag 2), kein style.
          const dotBorderClass = isReleased
            ? 'border-[#00D9C6]'
            : isInDev
              ? 'border-[#7CEFE6]'
              : 'border-[#8FA3A1]';
          const dotShadowClass = isReleased
            ? 'shadow-[0_0_10px_#00D9C666]'
            : isInDev
              ? 'shadow-[0_0_10px_#7CEFE666]'
              : 'shadow-[0_0_10px_#8FA3A166]';
          const dotColorClass = isReleased
            ? 'text-[#00D9C6]'
            : isInDev
              ? 'text-[#7CEFE6]'
              : 'text-[#8FA3A1]';
          const badgeBgClass = isReleased
            ? 'bg-[rgba(0,217,198,0.15)]'
            : isInDev
              ? 'bg-[rgba(124,239,230,0.18)]'
              : 'bg-[rgba(255,255,255,0.08)]';
          const badgeBorderClass = isReleased
            ? 'border-[rgba(0,217,198,0.3)]'
            : isInDev
              ? 'border-[rgba(124,239,230,0.35)]'
              : 'border-[rgba(255,255,255,0.15)]';

          return (
            <div key={idx} className="flex items-start gap-[14px] relative">
              {/* Dot Icon */}
              <div
                className={`flex items-center justify-center shrink-0 w-[24px] h-[24px] rounded-full border-2 border-solid bg-[rgba(5,18,17,0.95)] z-[2] ${dotBorderClass} ${dotShadowClass}`}
              >
                {isReleased ? (
                  <CheckCircle2 size={13} color="#00D9C6" />
                ) : isInDev ? (
                  <Sparkles size={12} color="#7CEFE6" />
                ) : (
                  <Clock size={12} color="#8FA3A1" />
                )}
              </div>

              {/* Release Box */}
              <div className="flex-1 flex flex-col gap-[4px] border border-solid border-[rgba(0,217,198,0.25)] rounded-[6px] bg-[rgba(5,20,19,0.45)] backdrop-blur-[6px] shadow-[0_0_14px_rgba(0,217,198,0.10)] px-[12px] py-[8px]">
                <div className="flex justify-between items-center flex-wrap gap-[6px]">
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[11px] font-bold text-[#00D9C6]">{rel.quarter}</span>
                    <span className="text-[12.5px] font-semibold text-[#FFFFFF]">{rel.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold rounded-[3px] border border-solid px-[6px] py-[1px] ${badgeBgClass} ${badgeBorderClass} ${dotColorClass}`}
                  >
                    {rel.status}
                  </span>
                </div>
                <div className="text-[11px] leading-[1.35] text-[var(--color-text-muted)]">
                  {rel.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
