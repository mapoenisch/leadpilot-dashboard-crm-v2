// Designprobe Dashboard-Testkachel (Teilauftrag 0): Ring mit geringer, gleichmäßiger Tiefe.
// Die Tiefe ist eine gerade Verlängerung nach unten ohne geneigte Perspektive; die Winkel bleiben
// exakte Anteile (siehe donutSegments). Segmente tragen Legende und Werte.
import { useMemo, useState } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import { ChartReadout, LegendButtons, ScrollableChart } from './ChartReadout';
import { CHART_VIEWBOX, SERIES_COLORS, seriesColor } from './chartTypes';
import type { DepthChartProps } from './chartTypes';
import { donutSegments, formatDe } from './depthGeometry';

const RING_GEOMETRY = { cx: 180, cy: 128, outer: 96, inner: 58 };
// Kreis: gleiche Lage und Tiefe, nur ohne Aussparung.
const PIE_GEOMETRY = { ...RING_GEOMETRY, inner: 0 };
const DEPTH = 7;

export function Depth3dDonutChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  reducedMotion,
  solid = false,
}: DepthChartProps) {
  const GEOMETRY = solid ? PIE_GEOMETRY : RING_GEOMETRY;
  const [active, setActive] = useState<number | null>(null);
  const segments = useMemo(() => donutSegments(data, GEOMETRY), [data, GEOMETRY]);
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const glow = `${idPrefix}-ring-glow`;
  const transition = reducedMotion ? '' : 'transition-opacity duration-150';

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-donut-chart">
      <ScrollableChart label={`${title}: ${solid ? 'Kreis' : 'Ring'}, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label={`${title}: ${solid ? 'Kreis' : 'Ring'}`}
          className="block h-auto w-full min-w-[560px]"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <ellipse
            cx={GEOMETRY.cx}
            cy={GEOMETRY.cy + GEOMETRY.outer + DEPTH + 6}
            rx={GEOMETRY.outer * 0.8}
            ry="4"
            fill="rgba(0, 242, 254, 0.35)"
            filter={`url(#${glow})`}
          />
          {segments.map((segment) => {
            const dimmed = active !== null && active !== segment.index;
            const color = seriesColor(segment.index);
            return (
              <g
                key={segment.label}
                data-testid="depth-ring-segment"
                data-active={active === segment.index ? 'true' : 'false'}
                opacity={dimmed ? 0.45 : 1}
                className={transition}
                onMouseEnter={() => setActive(segment.index)}
              >
                <path
                  d={segment.path}
                  transform={`translate(0 ${DEPTH})`}
                  fill={color}
                  fillOpacity="0.45"
                  stroke="#05181a"
                  strokeWidth="0.8"
                />
                <path
                  d={segment.path}
                  fill={color}
                  stroke={active === segment.index ? '#ffffff' : '#05181a'}
                  strokeWidth={active === segment.index ? 1.6 : 0.8}
                />
              </g>
            );
          })}
          {solid ? null : (
            <>
              <text
                x={GEOMETRY.cx}
                y={GEOMETRY.cy - 2}
                textAnchor="middle"
                fontSize="20"
                fontWeight="700"
                fill="#ffffff"
                fontFamily="var(--font-mono, monospace)"
              >
                {formatDe(total)}
                {unit === '%' ? ' %' : ''}
              </text>
              <text
                x={GEOMETRY.cx}
                y={GEOMETRY.cy + 16}
                textAnchor="middle"
                fontSize="10.5"
                fill={MANAGEMENT_CHART_THEME.colors.neutral}
              >
                gesamt
              </text>
            </>
          )}
          <g transform="translate(320 52)">
            {segments.map((segment) => (
              <g key={segment.label} transform={`translate(0 ${segment.index * 30})`}>
                <rect width="10" height="10" y="-9" rx="2" fill={seriesColor(segment.index)} />
                <text x="18" fontSize="12" fill="#e6f3f1">
                  {segment.label}
                </text>
                <text
                  x="180"
                  textAnchor="end"
                  fontSize="12"
                  fill={MANAGEMENT_CHART_THEME.colors.neutral}
                  fontFamily="var(--font-mono, monospace)"
                >
                  {formatDe(Math.round(segment.share * 1000) / 10)} %
                </text>
              </g>
            ))}
          </g>
        </svg>
      </ScrollableChart>
      <ChartReadout
        entry={active === null ? null : (data[active] ?? null)}
        unit={unit}
        period={period}
      />
      <LegendButtons
        data={data}
        activeIndex={active}
        onSelect={setActive}
        colors={SERIES_COLORS}
        ariaLabel={solid ? 'Kreisausschnitt wählen' : 'Segment wählen'}
      />
    </div>
  );
}
