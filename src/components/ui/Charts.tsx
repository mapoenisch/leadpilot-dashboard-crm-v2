import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { CHART_THEME, formatChartMetric } from './chartTheme';
import { DonutRingChart } from './charts/DonutRingChart';
import { ChartLegend } from './charts/ChartLegend';

export * from './charts/index';

export interface ChartDataset {
  label?: string;
  data: number[];
  color?: string;
  colors?: string[];
  fill?: boolean;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'doughnut';
  labels: string[];
  datasets: ChartDataset[];
}

const chartBarWidthVariants = cva('max-w-[36px] rounded-t-[3px] transition-[height_300ms_ease]', {
  variants: {
    multi: {
      true: 'w-[16px]',
      false: 'w-[28px]',
    },
  },
  defaultVariants: {
    multi: false,
  },
});

export function SimpleChart({  config,
  height = 220,
}: {
  config: ChartConfig;
  height?: number;
}) {
  if (!config || !config.labels || !config.datasets || config.datasets.length === 0) {
    return null;
  }

  const { type, labels, datasets } = config;

  // 1. Doughnut / Ring Chart
  if (type === 'doughnut') {
    const ds = datasets[0];
    const segments = labels.map((label, idx) => ({
      label,
      value: ds.data[idx] || 0,
      color: ds.colors ? ds.colors[idx % ds.colors.length] : undefined,
    }));

    return (
      <DonutRingChart
        segments={segments}
        totalLabel="Gesamt"
        size={140}
        showBars={true}
      />
    );
  }

  // 2. Bar Chart
  if (type === 'bar') {
    const allVals = datasets.flatMap((d) => d.data);
    const maxVal = Math.max(...allVals, 1);

    return (
      <div className="flex flex-col gap-[8px] py-[6px] px-0 w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <div
          className="flex items-end gap-[12px] border-b border-solid border-border box-border"
          style={{ height: `${height}px`, paddingBottom: '24px' }}
        >
          {labels.map((label, lIdx) => (
            <div
              key={lIdx}
              className="flex-1 flex flex-col items-center h-full justify-end gap-[4px] min-w-0"
            >
              <div className="flex gap-[4px] items-end h-full w-full justify-center">
                {datasets.map((ds, dIdx) => {
                  const val = ds.data[lIdx] || 0;
                  const hPct = Math.max(5, (val / maxVal) * 100);
                  const color = ds.color || (ds.colors ? ds.colors[lIdx % ds.colors.length] : CHART_THEME.colors.primary);

                  return (
                    <div
                      key={dIdx}
                      title={`${ds.label ? `${ds.label}: ` : ''}${formatChartMetric(val)}`}
                      className={cn(chartBarWidthVariants({ multi: datasets.length > 1 }))}
                      style={{
                        height: `${hPct}%`,
                        background: color,
                        boxShadow: `0 0 8px ${color}33`,
                      }}
                    />
                  );
                })}
              </div>

              <span className="text-[11px] text-[var(--color-text-muted)] mt-[6px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center">
                {label}
              </span>
            </div>
          ))}
        </div>

        {datasets.length > 1 && (
          <ChartLegend
            size="sm"
            items={datasets.map((ds, idx) => ({
              label: ds.label || `Serie ${idx + 1}`,
              color: ds.color || (ds.colors ? ds.colors[0] : CHART_THEME.seriesPalette[idx % CHART_THEME.seriesPalette.length]),
              shape: 'rect',
            }))}
          />
        )}
      </div>
    );
  }

  // 3. Line Chart
  const allVals = datasets.flatMap((d) => d.data);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const svgWidth = Math.max(labels.length * 60, 300);
  const padLeft = 40;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  return (
    <div className="flex flex-col gap-[8px] py-[6px] px-0 w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="overflow-visible"
        role="img"
        aria-label="Verlaufsdiagramm"
      >
        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = padTop + plotHeight * (1 - ratio);
          return (
            <line
              key={idx}
              x1={padLeft}
              y1={y}
              x2={svgWidth - padRight}
              y2={y}
              stroke="var(--color-border-soft)"
              strokeDasharray={idx === 0 ? 'none' : '3 3'}
              strokeWidth="1"
            />
          );
        })}

        {datasets.map((ds, dIdx) => {
          const dsColor = ds.color || CHART_THEME.seriesPalette[dIdx % CHART_THEME.seriesPalette.length];
          const points = ds.data.map((val, idx) => {
            const x = padLeft + (idx / Math.max(labels.length - 1, 1)) * plotWidth;
            const y = padTop + plotHeight - ((val - minVal) / range) * plotHeight;
            return { x, y, val };
          });

          const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
          const fillD = `${pathD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

          return (
            <g key={dIdx}>
              {ds.fill && (
                <path
                  d={fillD}
                  fill={dsColor}
                  opacity="0.12"
                />
              )}
              <path
                d={pathD}
                fill="none"
                stroke={dsColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 6px ${dsColor}44)` }}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={dsColor}
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })}

        {/* X Axis Labels */}
        {labels.map((l, i) => {
          const x = padLeft + (i / Math.max(labels.length - 1, 1)) * plotWidth;
          return (
            <text
              key={i}
              x={x}
              y={height - 6}
              fill="var(--color-text-muted)"
              fontSize="10.5"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {l}
            </text>
          );
        })}
      </svg>

      {datasets.length > 1 && (
        <ChartLegend
          size="sm"
          items={datasets.map((ds, idx) => ({
            label: ds.label || `Serie ${idx + 1}`,
            color: ds.color || CHART_THEME.seriesPalette[idx % CHART_THEME.seriesPalette.length],
            shape: 'line',
          }))}
        />
      )}
    </div>
  );
}
