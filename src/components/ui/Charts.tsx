import React from 'react';
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

export function SimpleChart({
  config,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px 0', width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            height: `${height}px`,
            paddingBottom: '24px',
            borderBottom: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        >
          {labels.map((label, lIdx) => (
            <div
              key={lIdx}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: '4px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'flex-end',
                  height: '100%',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {datasets.map((ds, dIdx) => {
                  const val = ds.data[lIdx] || 0;
                  const hPct = Math.max(5, (val / maxVal) * 100);
                  const color = ds.color || (ds.colors ? ds.colors[lIdx % ds.colors.length] : CHART_THEME.colors.primary);

                  return (
                    <div
                      key={dIdx}
                      title={`${ds.label ? `${ds.label}: ` : ''}${formatChartMetric(val)}`}
                      style={{
                        width: datasets.length > 1 ? '16px' : '28px',
                        maxWidth: '36px',
                        height: `${hPct}%`,
                        background: color,
                        borderRadius: '3px 3px 0 0',
                        boxShadow: `0 0 8px ${color}33`,
                        transition: 'height 300ms ease',
                      }}
                    />
                  );
                })}
              </div>

              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  marginTop: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textAlign: 'center',
                }}
              >
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px 0', width: '100%' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        style={{ overflow: 'visible' }}
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
