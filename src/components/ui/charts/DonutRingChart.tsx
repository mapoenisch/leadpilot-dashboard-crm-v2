import React, { useState } from 'react';
import { CHART_THEME, formatChartMetric } from '../chartTheme';
import { ChartTooltip } from './ChartTooltip';

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

  const hoveredSeg = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < segments.length ? segments[hoverIdx] : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        padding: '6px 0',
        width: '100%',
      }}
    >
      {/* 1. Ring Chart with Center Metric */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="-1.15 -1.15 2.3 2.3"
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
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
                style={{
                  cursor: 'pointer',
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: '0 0',
                  transition: 'transform 150ms ease, opacity 150ms ease',
                }}
                onMouseEnter={() => setHoverIdx(p.idx)}
              />
            );
          })}

          {/* Inner Cutout for Donut */}
          <circle cx="0" cy="0" r="0.65" fill="var(--color-surface)" />
        </svg>

        {/* Centered Total Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {hoveredSeg ? hoveredSeg.label : totalLabel}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text)', marginTop: '1px' }}>
            {hoveredSeg
              ? formatChartMetric(hoveredSeg.value, unit)
              : formatChartMetric(total, unit)}
          </span>
        </div>
      </div>

      {/* 2. Sorted Breakdown Comparison Bars */}
      {showBars && (
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
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
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 'var(--radius-sm)',
                  background: isHovered ? 'var(--color-surface-raised)' : 'transparent',
                  transition: 'background 150ms ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: segColor, flexShrink: 0 }} />
                    <span style={{ color: isHovered ? 'var(--color-text)' : 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seg.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <strong style={{ color: 'var(--color-text)' }}>
                      {formatChartMetric(seg.value, unit)}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      ({pct}%)
                    </span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div style={{ width: '100%', height: '4px', background: 'var(--color-bg-deep)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: segColor,
                      borderRadius: '2px',
                      transition: 'width 300ms ease',
                    }}
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
