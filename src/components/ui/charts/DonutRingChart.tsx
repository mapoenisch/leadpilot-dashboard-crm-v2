import { useState } from 'react';
import { formatChartMetric, CHART_THEME } from '../chartTheme';
import { cn } from '@/lib/utils';

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
  note?: string;
}

export interface DonutRingChartProps {
  segments: DonutSegment[];
  totalLabel?: string;
  unit?: string;
  size?: number;
  showBars?: boolean;
}

export function DonutRingChart({
  segments = [],
  totalLabel = 'Gesamt',
  unit = '',
  size = 160,
  showBars = true,
}: DonutRingChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0) || 1;
  const colors = CHART_THEME.seriesPalette;

  let currentAngle = 0;
  const paths = segments.map((seg, idx) => {
    const val = seg.value || 0;
    const sliceAngle = (val / total) * 2 * Math.PI;
    const x1 = Math.cos(currentAngle);
    const y1 = Math.sin(currentAngle);
    const x2 = Math.cos(currentAngle + sliceAngle);
    const y2 = Math.sin(currentAngle + sliceAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
    currentAngle += sliceAngle;
    const segColor = seg.color || colors[idx % colors.length];
    return { pathData, color: segColor, val, label: seg.label, idx };
  });

  const hoveredSeg =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < segments.length ? segments[hoverIdx] : null;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4 px-0 py-[6px]">
      {/* 1. Ring Chart with Center Metric */}
      <div
        className="relative shrink-0"
        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (size-Prop des Aufrufers)
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg
          width={size}
          height={size}
          viewBox="-1.15 -1.15 2.3 2.3"
          className="overflow-visible [transform:rotate(-90deg)]"
          role="img"
          aria-label={`${totalLabel}: ${formatChartMetric(total, unit)}`}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {paths.map((p) => {
            const isHovered = hoverIdx === p.idx;
            return (
              <path
                key={p.idx}
                d={p.pathData}
                fill={p.color}
                stroke="var(--color-surface)"
                strokeWidth="0.04"
                opacity={hoverIdx === null || isHovered ? 1 : 0.45}
                className={cn(
                  'cursor-pointer origin-[0_0] [transition:transform_150ms_ease,opacity_150ms_ease]',
                  isHovered ? '[transform:scale(1.04)]' : '[transform:scale(1)]',
                )}
                onMouseEnter={() => setHoverIdx(p.idx)}
              />
            );
          })}

          {/* Inner Cutout for Donut */}
          <circle cx="0" cy="0" r="0.65" fill="var(--color-surface)" />
        </svg>

        {/* Centered Total Overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
            {hoveredSeg ? hoveredSeg.label : totalLabel}
          </span>
          <span className="mt-[1px] font-display text-[16px] font-bold text-text">
            {hoveredSeg
              ? formatChartMetric(hoveredSeg.value, unit)
              : formatChartMetric(total, unit)}
          </span>
        </div>
      </div>

      {/* 2. Sorted Breakdown Comparison Bars */}
      {showBars && (
        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-[8px]">
          {segments.map((seg, idx) => {
            const pct = Math.round(((seg.value || 0) / total) * 100);
            const segColor = seg.color || colors[idx % colors.length];
            const isHovered = hoverIdx === idx;

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={`${seg.label}: ${formatChartMetric(seg.value, unit)} (${pct} Prozent)`}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(idx)}
                onBlur={() => setHoverIdx(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setHoverIdx(idx);
                  }
                }}
                className={cn(
                  'flex cursor-pointer flex-col gap-[3px] rounded-sm px-[4px] py-[2px] [transition:background_150ms_ease]',
                  isHovered ? 'bg-[var(--color-surface-raised)]' : 'bg-transparent',
                )}
              >
                <div className="flex justify-between text-[12px]">
                  <div className="flex min-w-0 items-center gap-[6px]">
                    <span
                      className="h-[8px] w-[8px] shrink-0 rounded-[50%]"
                      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Segmentfarbe aus Daten)
                      style={{ background: segColor }}
                    />
                    <span
                      className={cn(
                        'overflow-hidden text-ellipsis whitespace-nowrap',
                        isHovered ? 'text-text' : 'text-[var(--color-text-muted)]',
                      )}
                    >
                      {seg.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-[4px]">
                    <strong className="text-text">{formatChartMetric(seg.value, unit)}</strong>
                    <span className="text-[11px] text-[var(--color-text-muted)]">({pct}%)</span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="h-[4px] w-full overflow-hidden rounded-[2px] bg-background-deep">
                  <div
                    className="h-full rounded-[2px] [transition:width_300ms_ease]"
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie/-Farbe (Anteil und Segmentfarbe aus Daten)
                    style={{ width: `${pct}%`, background: segColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
