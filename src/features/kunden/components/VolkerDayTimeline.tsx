import React from 'react';
import { EMPATHY } from '../../../domain/kundenData';

export const VolkerDayTimeline: React.FC = () => {
  const quadrants = EMPATHY.quadrants;
  const heroStatement = EMPATHY.heroStatement;

  return (
    <section
      className="facelift-volker-day-timeline box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)]"
      aria-label="Ein Tag in Volkers Vertrieb – Arbeitsmomente 1 bis 4"
    >
      {/* Header mit Hero Statement */}
      <div className="timeline-header flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(124,239,230,0.25)] bg-[rgba(124,239,230,0.12)] text-[11px] font-bold tracking-[0.05em] uppercase text-[var(--cyan-light,#7CEFE6)] px-[8px] py-[2px]">
            ARBEITSMOMENTE IM VERTRIEB
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Ein Tag in Volkers Vertrieb · Empathy-Perspektiven
          </span>
        </div>

        <h3 className="timeline-heading m-0 font-display text-[1.25rem] font-bold text-text">
          {EMPATHY.title}
        </h3>

        {/* Hero Statement */}
        <div className="timeline-hero-statement rounded-[6px] border-0 border-l-[3px] border-solid border-l-primary bg-[rgba(0,217,198,0.06)] text-[13.5px] font-semibold leading-[1.45] text-text px-[14px] py-[10px]">
          {heroStatement}
        </div>
      </div>

      {/* 4 Arbeitsmomente (Kartenreihe auf Desktop, gestapelt auf Mobile) */}
      <div className="timeline-moments-container grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[var(--space-4,16px)] relative">
        {quadrants.map((quadrant, idx) => {
          const momentNum = idx + 1;
          const isAccent = idx % 2 === 1;

          return (
            <div
              key={idx}
              className={`timeline-moment-card timeline-moment-${momentNum} rounded-md border border-solid flex flex-col gap-[10px] relative p-[var(--space-4,16px)] ${isAccent ? 'border-[rgba(255,122,61,0.22)] bg-[rgba(255,122,61,0.03)]' : 'border-[rgba(0,217,198,0.22)] bg-[rgba(0,217,198,0.03)]'}`}
            >
              {/* Moment-Badge */}
              <div className="flex items-center justify-between gap-[8px]">
                <span
                  className={`inline-flex items-center rounded text-[11px] font-bold tracking-[0.04em] px-[8px] py-[2px] ${isAccent ? 'bg-[rgba(255,122,61,0.14)] text-accent' : 'bg-[rgba(0,217,198,0.14)] text-primary'}`}
                >
                  Arbeitsmoment {momentNum}
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  0{momentNum}/04
                </span>
              </div>

              {/* Titel aus EMPATHY.quadrants[idx].title */}
              <h4
                className={`m-0 font-display text-[14px] font-bold ${isAccent ? 'text-accent' : 'text-primary'}`}
              >
                {quadrant.title}
              </h4>

              {/* Text aus EMPATHY.quadrants[idx].desc */}
              <p className="m-0 flex-grow text-[13px] leading-[1.45] text-text">{quadrant.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
