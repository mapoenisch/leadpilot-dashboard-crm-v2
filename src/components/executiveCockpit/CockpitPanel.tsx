import React from 'react';

export interface CockpitPanelProps {
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const CockpitPanel: React.FC<CockpitPanelProps> = ({
  title,
  subtitle,
  sourceLabel,
  badge,
  actions,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <section
      data-testid="cockpit-panel"
      // G39 Welle 1: style-Spread entfernt — 0 Aufrufer übergeben style
      // (per Suche bestätigt), keine Passthrough-Notwendigkeit wie bei
      // Badge/Card/Button. Eigene Styles als Klassen.
      className={`cockpit-panel flex flex-col relative overflow-hidden rounded-[8px] border border-solid border-[rgba(0,217,198,0.16)] bg-[linear-gradient(145deg,rgba(11,30,28,0.72)_0%,rgba(5,18,17,0.82)_100%)] backdrop-blur-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(0,217,198,0.12)] ${className}`}
    >
      {/* Subtile Lichtkante oben */}
      <div className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none bg-[linear-gradient(90deg,transparent_0%,rgba(0,217,198,0.4)_50%,transparent_100%)]" />

      {/* Header */}
      <div className="flex justify-between items-start gap-[12px] border-b border-solid border-[rgba(0,217,198,0.08)] px-[20px] pt-[16px] pb-[12px]">
        <div className="flex flex-col gap-[2px] min-w-0">
          <div className="flex items-center gap-[8px] flex-wrap">
            <h3 className="m-0 font-display text-[15px] font-bold tracking-[-0.01em] text-[#FFFFFF]">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className="m-0 text-[12px] leading-[1.4] text-[var(--color-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-[8px] shrink-0">
          {sourceLabel && (
            <span className="font-semibold text-[10px] uppercase tracking-[0.06em] rounded border border-solid border-[rgba(0,217,198,0.16)] bg-[rgba(0,217,198,0.08)] text-[#00D9C6] px-[7px] py-[2px]">
              {sourceLabel}
            </span>
          )}
          {actions}
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col flex-1 ${noPadding ? 'p-0' : 'px-[20px] py-[18px]'}`}>
        {children}
      </div>
    </section>
  );
};
