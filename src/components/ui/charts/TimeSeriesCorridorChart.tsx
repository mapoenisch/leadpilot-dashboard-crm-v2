import { useState } from 'react';
import { formatChartMetric } from '../chartTheme';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';

export interface TimeSeriesPoint {
  tick: number;
  label?: string;
  p10: number;
  median: number;
  p90: number;
  target?: number;
  event?: { title: string; type?: string };
}

export interface TimeSeriesCorridorChartProps {
  points: TimeSeriesPoint[];
  unit?: string;
  height?: number;
  baselineValue?: number;
  targetValue?: number;
  showCorridor?: boolean;
  showTarget?: boolean;
  ariaLabel?: string;
}

export function TimeSeriesCorridorChart({
  points = [],
  unit = '€',
  height = 240,
  baselineValue,
  targetValue,
  showCorridor = true,
  showTarget = true,
  ariaLabel = 'Zeitreihen-Verlauf mit Unsicherheitskorridor',
}: TimeSeriesCorridorChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return null;
  }

  // Calculate Y min and max across all series
  const allVals: number[] = [];
  points.forEach((p) => {
    allVals.push(p.p10, p.median, p.p90);
    if (p.target !== undefined) allVals.push(p.target);
  });
  if (baselineValue !== undefined) allVals.push(baselineValue);
  if (targetValue !== undefined) allVals.push(targetValue);

  const rawMin = Math.min(...allVals, 0);
  const rawMax = Math.max(...allVals, 100);
  const padding = (rawMax - rawMin) * 0.08 || 10;
  const minY = Math.floor(rawMin - padding);
  const maxY = Math.ceil(rawMax + padding);
  const rangeY = maxY - minY || 1;

  // Layout Dimensions inside SVG
  const svgWidth = 700;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const getX = (idx: number) => padLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
  const getY = (val: number) => padTop + plotHeight - ((val - minY) / rangeY) * plotHeight;

  // Build Corridor Polygon
  const p90Coords = points.map((p, i) => `${getX(i)},${getY(p.p90)}`).join(' ');
  const p10CoordsRev = points
    .slice()
    .reverse()
    .map((p, i) => `${getX(points.length - 1 - i)},${getY(p.p10)}`)
    .join(' ');
  const corridorPath = `${p90Coords} ${p10CoordsRev}`;

  // Build Median Line Path
  const medianPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.median)}`)
    .join(' ');

  // Build Target Line Path
  const targetY = targetValue !== undefined ? getY(targetValue) : undefined;

  // Thin out x-axis labels to avoid overlap
  const maxLabels = 7;
  const step = Math.ceil(points.length / maxLabels);

  const hoveredPoint =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < points.length ? points[hoverIdx] : null;

  return (
    <div className="relative flex w-full flex-col gap-[8px]">
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        height={height}
        className="w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <desc>
          P50-Median von{' '}
          {points[0]?.median !== undefined ? formatChartMetric(points[0].median, unit) : '—'} bis{' '}
          {points[points.length - 1]?.median !== undefined
            ? formatChartMetric(points[points.length - 1]?.median as number, unit)
            : '—'}
          .
        </desc>

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

        {/* P10 - P90 Uncertainty Corridor */}
        {showCorridor && (
          <polygon
            points={corridorPath}
            fill="rgba(0, 217, 198, 0.12)"
            stroke="rgba(0, 217, 198, 0.35)"
            strokeWidth="1"
          />
        )}

        {/* Target Line */}
        {showTarget && targetY !== undefined && (
          <g>
            <line
              x1={padLeft}
              y1={targetY}
              x2={svgWidth - padRight}
              y2={targetY}
              stroke="var(--color-success)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={svgWidth - padRight}
              y={targetY - 5}
              fill="var(--color-success)"
              fontSize="10"
              fontFamily="var(--font-body)"
              textAnchor="end"
              fontWeight="600"
            >
              Ziel: {targetValue !== undefined ? formatChartMetric(targetValue, unit) : ''}
            </text>
          </g>
        )}

        {/* Baseline Anchor Indicator at Tick 0 */}
        {baselineValue !== undefined && points.length > 0 && points[0] && (
          <g>
            <circle
              cx={getX(0)}
              cy={getY(points[0].median)}
              r="4.5"
              fill="var(--color-primary)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Dominant P50 Median Line */}
        <path
          d={medianPath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="[filter:drop-shadow(0_0_6px_rgba(0,217,198,0.4))]"
        />

        {/* X-Axis Tick Labels & Event Markers */}
        {points.map((p, idx) => {
          const isLabeled = idx % step === 0 || idx === points.length - 1;
          const x = getX(idx);
          const yMedian = getY(p.median);

          return (
            <g key={idx}>
              {/* Event Marker */}
              {p.event && (
                <g>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + plotHeight}
                    stroke="var(--color-accent)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  <circle cx={x} cy={padTop + 6} r="3.5" fill="var(--color-accent)" />
                </g>
              )}

              {/* X Axis Label */}
              {isLabeled && (
                <text
                  x={x}
                  y={padTop + plotHeight + 18}
                  fill="var(--color-text-muted)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  #{p.tick}
                </text>
              )}

              {/* Interactive Hit Area */}
              <rect
                x={x - plotWidth / (points.length * 2)}
                y={padTop}
                width={plotWidth / points.length}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
              />

              {/* Active Point Circle */}
              {hoverIdx === idx && (
                <g>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + plotHeight}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={x}
                    cy={yMedian}
                    r="5"
                    fill="var(--color-accent)"
                    stroke="var(--color-surface)"
                    strokeWidth="2.5"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && hoverIdx !== null && (
        <ChartTooltip
          title={`Tick #${hoveredPoint.tick}`}
          x={getX(hoverIdx)}
          y={getY(hoveredPoint.median)}
          items={[
            {
              label: 'P50 Median',
              value: formatChartMetric(hoveredPoint.median, unit),
              color: 'var(--color-primary)',
            },
            {
              label: 'P90 (Optimistisch)',
              value: formatChartMetric(hoveredPoint.p90, unit),
              color: 'rgba(0, 217, 198, 0.6)',
            },
            {
              label: 'P10 (Pessimistisch)',
              value: formatChartMetric(hoveredPoint.p10, unit),
              color: 'rgba(0, 217, 198, 0.3)',
            },
          ]}
        />
      )}

      {/* Standard Legend */}
      <ChartLegend
        size="sm"
        items={[
          { label: 'P50 Median', color: 'var(--color-primary)', shape: 'line' },
          { label: 'P10–P90 Korridor', color: 'rgba(0, 217, 198, 0.4)', shape: 'rect' },
          ...(showTarget && targetValue !== undefined
            ? [
                {
                  label: `Ziel (${formatChartMetric(targetValue, unit)})`,
                  color: 'var(--color-success)',
                  shape: 'dashed' as const,
                },
              ]
            : []),
          ...(baselineValue !== undefined
            ? [{ label: 'Ebene A Basis', color: 'var(--color-primary)', shape: 'circle' as const }]
            : []),
        ]}
      />
    </div>
  );
}
