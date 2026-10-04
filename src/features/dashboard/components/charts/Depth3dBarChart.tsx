// Säulen und Balken mit Tiefe (Designprobe Teilauftrag 0, übernommen in Auftrag 073).
// Stil nach dem bestehenden Funnel (LiveFunnelBarChart): helle Oberkante, dunklere Seitenfläche,
// Verlauf von hell nach dunkel, dezentes Leuchten am Boden. Eigenständige Weiterentwicklung,
// der bestehende Funnel bleibt unverändert. Nullwerte erhalten keine Fläche, nur eine Markierung
// auf der Nullachse, damit kein Betrag vorgetäuscht wird. Negative Werte reichen unter bzw. links
// der Nullachse (Plan §4, Auftrag 073).
import { useMemo } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import {
  ChartReadout,
  ChartSummary,
  LegendButtons,
  ScrollableChart,
  useActiveDatum,
} from './ChartReadout';
import { CHART_VIEWBOX } from './chartTypes';
import type { DepthChartProps } from './chartTypes';
import {
  formatDe,
  layoutBars,
  layoutHBars,
  niceSignedScale,
  summarizeSeries,
} from './depthGeometry';

const AREA = { left: 56, top: 34, width: 480, height: 190 };
const H_AREA = { left: 96, top: 14, width: 400, height: 210 };
const THEME = MANAGEMENT_CHART_THEME.colors;
/** Kategorien stehen bei baseline + 18; darüber bleibt Abstand für die Wertbeschriftung. */
const CATEGORY_CLEARANCE = 6;

/**
 * Wert negativer Säulen: unter dem Säulenende, solange er die Kategorie darunter nicht berührt;
 * reicht die Säule bis an den unteren Rand, steht er innerhalb der Säule.
 */
export function negativeLabelY(bottom: number, baseline: number): number {
  const below = bottom + 14;
  return below <= baseline + CATEGORY_CLEARANCE ? below : bottom - 6;
}

export function Depth3dBarChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  reducedMotion,
  formatValue,
  stableLegend = false,
  orientation = 'vertical',
}: DepthChartProps) {
  const horizontal = orientation === 'horizontal';
  const [active, setActive] = useActiveDatum(data);
  const scale = useMemo(() => {
    const values = data.map((d) => d.value);
    return niceSignedScale(Math.min(...values, 0), Math.max(...values, 0));
  }, [data]);
  const bars = useMemo(() => layoutBars(data, AREA, scale), [data, scale]);
  const hBars = useMemo(() => layoutHBars(data, H_AREA, scale), [data, scale]);
  const span = scale.max - scale.min;
  const baseline = AREA.top + AREA.height;
  const front = `${idPrefix}-front`;
  const glow = `${idPrefix}-glow`;
  const summaryId = `${idPrefix}-summary`;
  const summary = useMemo(
    () => summarizeSeries(data, unit, period, 'ranking', formatValue),
    [data, unit, period, formatValue],
  );
  const transition = reducedMotion ? '' : 'transition-opacity duration-150';

  return (
    <div
      className="flex flex-col gap-[10px]"
      data-testid={horizontal ? 'depth-hbar-chart' : 'depth-bar-chart'}
    >
      <ScrollableChart
        label={`${title}: ${horizontal ? 'Balken' : 'Säulen'}, waagerecht scrollbar`}
      >
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label={`${title}: ${horizontal ? 'Balken' : 'Säulen'}`}
          aria-describedby={summaryId}
          className="block h-auto w-full min-w-[560px]"
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
            if (horizontal) {
              const x = H_AREA.left + ((tick - scale.min) / span) * H_AREA.width;
              return (
                <g key={tick}>
                  <line
                    x1={x}
                    x2={x}
                    y1={H_AREA.top}
                    y2={H_AREA.top + H_AREA.height}
                    stroke={tick === 0 ? THEME.border : THEME.grid}
                    strokeDasharray={tick === 0 ? undefined : '3 4'}
                  />
                  <text
                    x={x}
                    y={H_AREA.top + H_AREA.height + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill={THEME.neutral}
                  >
                    {formatDe(tick)}
                  </text>
                </g>
              );
            }
            const y = AREA.top + ((scale.max - tick) / span) * AREA.height;
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
                <text
                  x={AREA.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill={THEME.neutral}
                >
                  {formatDe(tick)}
                </text>
              </g>
            );
          })}

          {horizontal
            ? hBars.map((bar) => {
                const dimmed = active !== null && active !== bar.index;
                const frontThickness = bar.thickness - bar.depth;
                const top = bar.y + bar.depth;
                const right = bar.x + bar.length;
                const cy = top + frontThickness / 2;
                return (
                  <g
                    key={bar.label}
                    data-testid="depth-bar"
                    data-active={active === bar.index ? 'true' : 'false'}
                    opacity={dimmed ? 0.45 : 1}
                    className={transition}
                    onMouseEnter={() => setActive(bar.index)}
                  >
                    {bar.length > 0 ? (
                      <>
                        <rect
                          x={bar.x}
                          y={top}
                          width={bar.length}
                          height={frontThickness}
                          fill={`url(#${front})`}
                          stroke="#7cefe6"
                          strokeWidth="1"
                        />
                        <polygon
                          points={`${bar.x},${top} ${bar.x + bar.depth},${bar.y} ${right + bar.depth},${bar.y} ${right},${top}`}
                          fill="#b3f9f4"
                          stroke="#7cefe6"
                          strokeWidth="1"
                        />
                        <polygon
                          points={`${right},${top} ${right + bar.depth},${bar.y} ${right + bar.depth},${bar.y + frontThickness} ${right},${top + frontThickness}`}
                          fill="#005e55"
                          stroke="#008a7d"
                          strokeWidth="0.8"
                        />
                      </>
                    ) : (
                      <line
                        x1={bar.zero}
                        x2={bar.zero}
                        y1={top}
                        y2={top + frontThickness}
                        stroke="#7cefe6"
                        strokeWidth="2"
                      />
                    )}
                    <text
                      x={H_AREA.left - 8}
                      y={cy + 4}
                      textAnchor="end"
                      fontSize="10.5"
                      fill={THEME.neutral}
                    >
                      {bar.label}
                    </text>
                    <text
                      x={bar.negative ? bar.zero + 8 : right + bar.depth + 8}
                      y={cy + 4}
                      fontSize="11.5"
                      fontWeight="700"
                      fill="#ffffff"
                      fontFamily="var(--font-mono, monospace)"
                    >
                      {formatDe(bar.value)}
                    </text>
                  </g>
                );
              })
            : bars.map((bar) => {
                const frontWidth = bar.width - bar.depth;
                const dimmed = active !== null && active !== bar.index;
                const cx = bar.x + frontWidth / 2;
                const hasArea = bar.height > 0;
                return (
                  <g
                    key={bar.label}
                    data-testid="depth-bar"
                    data-active={active === bar.index ? 'true' : 'false'}
                    opacity={dimmed ? 0.45 : 1}
                    className={transition}
                    onMouseEnter={() => setActive(bar.index)}
                  >
                    {hasArea ? (
                      <>
                        <ellipse
                          cx={cx}
                          cy={bar.zero}
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
                      </>
                    ) : (
                      <line
                        x1={bar.x}
                        x2={bar.x + frontWidth}
                        y1={bar.zero}
                        y2={bar.zero}
                        stroke="#7cefe6"
                        strokeWidth="2"
                      />
                    )}
                    <text
                      x={cx}
                      y={
                        bar.negative
                          ? negativeLabelY(bar.y + bar.height, baseline)
                          : bar.y - (hasArea ? bar.depth : 0) - 6
                      }
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
      </ScrollableChart>
      <ChartSummary id={summaryId} text={summary} />
      <ChartReadout
        entry={active === null ? null : (data[active] ?? null)}
        unit={unit}
        formatValue={formatValue}
        period={period}
      />
      <LegendButtons
        stableHeight={stableLegend}
        data={data}
        activeIndex={active}
        onSelect={setActive}
        ariaLabel={horizontal ? 'Balken wählen' : 'Säule wählen'}
      />
    </div>
  );
}
