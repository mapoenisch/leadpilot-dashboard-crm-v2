import React, { useState } from 'react';
import { formatChartMetric } from '../chartTheme';
import { ChartLegend } from './ChartLegend';

/**
 * MultiScenarioComparisonChart
 * Implements Multi-Scenario Trajectory comparison adhering to Entscheidung 866:
 * Explicitly compares candidate versions relative to the reference version without synthetic composite scores.
 */

export interface ScenarioSeries {
  id: string;
  name: string;
  isReference: boolean;
  color: string;
  points: { tick: number; value: number }[];
}

export interface MultiScenarioComparisonChartProps {
  series: ScenarioSeries[];
  unit?: string;
  height?: number;
  ariaLabel?: string;
}

export function MultiScenarioComparisonChart({
  series = [],
  unit = '€',
  height = 240,
  ariaLabel = 'Multi-Szenario Trajektorienvergleich',
}: MultiScenarioComparisonChartProps) {
  const [, setHoverIdx] = useState<number | null>(null);

  if (!series || series.length === 0) return null;

  const refSeries = series.find((s) => s.isReference) || series[0];
  const allPoints = series.flatMap((s) => s.points);
  const allVals = allPoints.map((p) => p.value);

  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 100);
  const padding = (maxVal - minVal) * 0.08 || 10;
  const minY = Math.floor(minVal - padding);
  const maxY = Math.ceil(maxVal + padding);
  const rangeY = maxY - minY || 1;

  const maxTicks = Math.max(...series.map((s) => s.points.length), 1);

  const svgWidth = 700;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const getX = (idx: number) => padLeft + (idx / Math.max(maxTicks - 1, 1)) * plotWidth;
  const getY = (val: number) => padTop + plotHeight - ((val - minY) / rangeY) * plotHeight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        style={{ width: '100%', height: `${height}px`, overflow: 'visible' }}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padTop + plotHeight * (1 - ratio);
          const val = minY + ratio * rangeY;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                stroke="var(--color-border-soft)"
                strokeDasharray={idx === 0 ? 'none' : '3 3'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={y + 3.5}
                fill="var(--color-text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {formatChartMetric(val, '')}
              </text>
            </g>
          );
        })}

        {/* Series Trajectories */}
        {series.map((s) => {
          const pathD = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.value)}`)
            .join(' ');

          return (
            <g key={s.id}>
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={s.isReference ? '3' : '2'}
                strokeDasharray={s.isReference ? 'none' : '4 2'}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={s.isReference ? 1 : 0.85}
              />
              {/* Final Point Indicator */}
              {s.points.length > 0 && (
                <circle
                  cx={getX(s.points.length - 1)}
                  cy={getY(s.points[s.points.length - 1].value)}
                  r={s.isReference ? '4.5' : '3.5'}
                  fill={s.color}
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Trajectory Legend */}
      <ChartLegend
        size="sm"
        items={series.map((s) => {
          const finalVal = s.points[s.points.length - 1]?.value ?? 0;
          const refFinal = refSeries?.points[refSeries.points.length - 1]?.value ?? 0;
          const delta = finalVal - refFinal;

          return {
            label: s.isReference ? `${s.name} (Referenz)` : s.name,
            color: s.color,
            shape: s.isReference ? 'line' as const : 'dashed' as const,
            value: `${formatChartMetric(finalVal, unit)}${!s.isReference ? ` (${delta >= 0 ? '+' : ''}${formatChartMetric(delta, unit)})` : ''}`,
          };
        })}
      />
    </div>
  );
}
