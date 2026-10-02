// Designprobe Dashboard-Testkachel (Teilauftrag 0): Säulen mit Tiefe.
// Stil nach dem bestehenden Funnel (LiveFunnelBarChart): helle Oberkante, dunklere Seitenfläche,
// Verlauf von hell nach dunkel, dezentes Leuchten am Boden. Eigenständige Weiterentwicklung,
// der bestehende Funnel bleibt unverändert.
import { useMemo, useState } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import { ChartReadout, LegendButtons } from './ChartReadout';
import { CHART_VIEWBOX } from './chartTypes';
import type { DepthChartProps } from './chartTypes';
import { formatDe, layoutBars, niceScale } from './depthGeometry';

const AREA = { left: 56, top: 34, width: 480, height: 190 };
const THEME = MANAGEMENT_CHART_THEME.colors;

export function Depth3dBarChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  reducedMotion,
}: DepthChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const scale = useMemo(() => niceScale(Math.max(...data.map((d) => d.value), 0)), [data]);
  const bars = useMemo(() => layoutBars(data, AREA, scale.max), [data, scale.max]);
  const baseline = AREA.top + AREA.height;
  const front = `${idPrefix}-front`;
  const glow = `${idPrefix}-glow`;
  const transition = reducedMotion ? '' : 'transition-opacity duration-150';

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-bar-chart">
      <svg
        viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
        width="100%"
        role="img"
        aria-label={`${title}: Säulen`}
        className="block h-auto w-full"
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={front} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5fe8f0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#2a6f73" stopOpacity="0.9" />
          </linearGradient>
          <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {scale.ticks.map((tick) => {
          const y = baseline - (tick / scale.max) * AREA.height;
          return (
            <g key={tick}>
              <line
                x1={AREA.left}
                x2={AREA.left + AREA.width}
                y1={y}
                y2={y}
                stroke={tick === 0 ? THEME.border : THEME.grid}
                strokeDasharray={tick === 0 ? undefined : '3 4'}
              />
              <text x={AREA.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill={THEME.neutral}>
                {formatDe(tick)}
              </text>
            </g>
          );
        })}

        {bars.map((bar) => {
          const frontWidth = bar.width - bar.depth;
          const dimmed = active !== null && active !== bar.index;
          const cx = bar.x + frontWidth / 2;
          return (
            <g
              key={bar.label}
              data-testid="depth-bar"
              data-active={active === bar.index ? 'true' : 'false'}
              opacity={dimmed ? 0.45 : 1}
              className={transition}
              onMouseEnter={() => setActive(bar.index)}
            >
              <ellipse
                cx={cx}
                cy={baseline}
                rx={Math.max(frontWidth * 0.55, 12)}
                ry={3.5}
                fill="rgba(0, 242, 254, 0.5)"
                filter={`url(#${glow})`}
                opacity={active === bar.index ? 0.95 : 0.65}
              />
              <rect
                x={bar.x}
                y={bar.y}
                width={frontWidth}
                height={bar.height}
                fill={`url(#${front})`}
                stroke="#7cefe6"
                strokeWidth="1"
              />
              <polygon
                points={`${bar.x},${bar.y} ${bar.x + bar.depth},${bar.y - bar.depth} ${bar.x + bar.width},${bar.y - bar.depth} ${bar.x + frontWidth},${bar.y}`}
                fill="#b3f9f4"
                stroke="#7cefe6"
                strokeWidth="1"
              />
              <polygon
                points={`${bar.x + frontWidth},${bar.y} ${bar.x + bar.width},${bar.y - bar.depth} ${bar.x + bar.width},${bar.y + bar.height - bar.depth} ${bar.x + frontWidth},${bar.y + bar.height}`}
                fill="#005e55"
                stroke="#008a7d"
                strokeWidth="0.8"
              />
              <text
                x={cx}
                y={bar.y - bar.depth - 6}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="700"
                fill="#ffffff"
                fontFamily="var(--font-mono, monospace)"
              >
                {formatDe(bar.value)}
              </text>
              <text
                x={cx}
                y={baseline + 18}
                textAnchor="middle"
                fontSize="10.5"
                fill={THEME.neutral}
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartReadout
        entry={active === null ? null : (data[active] ?? null)}
        unit={unit}
        period={period}
      />
      <LegendButtons
        data={data}
        activeIndex={active}
        onSelect={setActive}
        ariaLabel="Säule wählen"
      />
    </div>
  );
}
