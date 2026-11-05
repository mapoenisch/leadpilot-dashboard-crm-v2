// Kompakter Trendverlauf / Sparkline (Auftrag Executive Dashboard Rework Paket 4):
// Schlanke Trendkurve mit sanftem Glow-Verlauf, Min/Max-Referenz, Delta-Indikator,
// hervorgehobenem Endpunkt sowie Schieberegler für vollen Tastaturzugang.
import { useMemo } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import {
  ChartReadout,
  ChartSummary,
  ScrollableChart,
  SLIDER_LABEL,
  SLIDER_ROW_CLASS,
  useActiveDatum,
} from './ChartReadout';
import { CHART_VIEWBOX, type DepthChartProps } from './chartTypes';
import {
  areaPath,
  formatDe,
  linePath,
  niceSignedScale,
  summarizeSeries,
  type LinePoint,
} from './depthGeometry';

const THEME = MANAGEMENT_CHART_THEME.colors;
const AREA = { left: 50, top: 44, width: 460, height: 160 };

export function DepthSparklineChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  reducedMotion,
  formatValue,
  stableLegend = false,
}: DepthChartProps) {
  const [active, setActive] = useActiveDatum(data);

  const values = useMemo(() => data.map((d) => d.value), [data]);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 1;

  const scale = useMemo(() => niceSignedScale(minVal, maxVal, 3), [minVal, maxVal]);
  const span = scale.max - scale.min > 0 ? scale.max - scale.min : 1;
  const baseline = AREA.top + AREA.height;

  const points = useMemo<LinePoint[]>(() => {
    if (data.length === 0) return [];
    if (data.length === 1) {
      const y = AREA.top + AREA.height / 2;
      return [{ x: AREA.left + AREA.width / 2, y, value: data[0]?.value ?? 0, label: data[0]?.label ?? '', index: 0 }];
    }
    const step = AREA.width / (data.length - 1);
    return data.map((d, index) => {
      const y = AREA.top + AREA.height - ((d.value - scale.min) / span) * AREA.height;
      return {
        x: Math.round(AREA.left + index * step),
        y: Math.round(y),
        value: d.value,
        label: d.label,
        index,
      };
    });
  }, [data, scale.min, span]);

  const summaryId = `${idPrefix}-sparkline-summary`;
  const summary = useMemo(
    () => summarizeSeries(data, unit, period, 'trend', formatValue),
    [data, unit, period, formatValue],
  );

  const fillId = `${idPrefix}-sparkline-fill`;
  const glowId = `${idPrefix}-sparkline-glow`;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const delta = firstPoint && lastPoint ? lastPoint.value - firstPoint.value : 0;
  const deltaPct =
    firstPoint && firstPoint.value !== 0
      ? Math.round((delta / Math.abs(firstPoint.value)) * 1000) / 10
      : 0;
  const deltaText = `${delta >= 0 ? '+' : ''}${formatDe(deltaPct)} %`;
  const deltaPositive = delta >= 0;

  const activeEntry = active === null ? null : (data[active] ?? null);
  const activePoint = active === null ? null : (points[active] ?? null);
  const slotWidth = points.length > 1 ? AREA.width / (points.length - 1) : AREA.width;

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-sparkline-chart">
      <ScrollableChart label={`${title}: Trendverlauf, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label={`${title}: Kompakter Trendverlauf`}
          aria-describedby={summaryId}
          className="block h-auto w-full min-w-[560px]"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={THEME.primary} stopOpacity="0.32" />
              <stop offset="100%" stopColor={THEME.primary} stopOpacity="0.01" />
            </linearGradient>
            <filter id={glowId} x="-10%" y="-20%" width="120%" height="150%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Min & Max Hilfslinien */}
          {scale.ticks.map((tick) => {
            const y = AREA.top + AREA.height - ((tick - scale.min) / span) * AREA.height;
            return (
              <g key={tick}>
                <line
                  x1={AREA.left}
                  y1={y}
                  x2={AREA.left + AREA.width}
                  y2={y}
                  stroke={tick === 0 ? THEME.border : THEME.grid}
                  strokeDasharray={tick === 0 ? undefined : '2 4'}
                />
                <text
                  x={AREA.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9.5"
                  fill={THEME.neutral}
                >
                  {formatValue ? formatValue(tick) : formatDe(tick)}
                </text>
              </g>
            );
          })}

          {/* Delta-Badge oben rechts */}
          {points.length > 1 ? (
            <g transform={`translate(${AREA.left + AREA.width - 70}, ${AREA.top - 24})`}>
              <rect
                x="0"
                y="0"
                width="70"
                height="20"
                rx="10"
                fill={deltaPositive ? 'rgba(0, 217, 198, 0.12)' : 'rgba(255, 122, 61, 0.12)'}
                stroke={deltaPositive ? THEME.primary : THEME.warning}
                strokeWidth="1"
              />
              <text
                x="35"
                y="14"
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fontFamily="monospace"
                fill={deltaPositive ? THEME.primary : THEME.warning}
              >
                {deltaText}
              </text>
            </g>
          ) : null}

          {/* Fläche unter der Kurve */}
          {points.length > 0 ? (
            <path d={areaPath(points, baseline)} fill={`url(#${fillId})`} />
          ) : null}

          {/* Schatten & Hauptlinie */}
          {points.length > 0 ? (
            <>
              <path
                d={linePath(points)}
                fill="none"
                stroke={THEME.primary}
                strokeWidth="4"
                strokeOpacity="0.4"
                filter={`url(#${glowId})`}
              />
              <path
                d={linePath(points)}
                fill="none"
                stroke={THEME.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {/* Startpunkt */}
          {firstPoint ? (
            <circle
              cx={firstPoint.x}
              cy={firstPoint.y}
              r={3.5}
              fill="#ffffff"
              stroke={THEME.primary}
              strokeWidth="2"
            />
          ) : null}

          {/* Endpunkt mit Heiligenschein / Puls */}
          {lastPoint ? (
            <g>
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={8}
                fill={THEME.primary}
                fillOpacity="0.25"
                className={reducedMotion ? '' : 'animate-pulse'}
              />
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4.5}
                fill="#ffffff"
                stroke={THEME.primary}
                strokeWidth="2.2"
              />
            </g>
          ) : null}

          {/* Interaktive Segmente & Hover-Erfassung */}
          {points.map((point) => (
            <g key={point.label} opacity={active !== null && active !== point.index ? 0.45 : 1}>
              <circle
                data-testid="depth-sparkline-point"
                data-active={active === point.index ? 'true' : 'false'}
                cx={point.x}
                cy={point.y}
                r={active === point.index ? 6 : 2.5}
                fill={active === point.index ? '#ffffff' : THEME.primary}
                stroke={active === point.index ? THEME.primary : 'none'}
                strokeWidth={active === point.index ? 2 : 0}
              />
              <text
                x={point.x}
                y={baseline + 16}
                textAnchor="middle"
                fontSize="9.5"
                fill={THEME.neutral}
              >
                {point.label}
              </text>
              <rect
                x={point.x - slotWidth / 2}
                y={AREA.top}
                width={slotWidth}
                height={AREA.height}
                fill="transparent"
                onMouseEnter={() => setActive(point.index)}
              />
            </g>
          ))}

          {/* Vertikale Cursorlinie bei aktivem Punkt */}
          {activePoint ? (
            <line
              x1={activePoint.x}
              y1={AREA.top}
              x2={activePoint.x}
              y2={baseline}
              stroke={THEME.secondary}
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
          ) : null}
        </svg>
      </ScrollableChart>

      <ChartSummary id={summaryId} text={summary} />
      <ChartReadout
        entry={active === null ? (lastPoint ? data[lastPoint.index] ?? null : null) : activeEntry}
        unit={unit}
        formatValue={formatValue}
        period={period}
        stableHeight={stableLegend}
      />

      {data.length > 1 ? (
        <label className={SLIDER_ROW_CLASS}>
          <span>{SLIDER_LABEL}</span>
          <input
            type="range"
            min={0}
            max={data.length - 1}
            step={1}
            value={active ?? data.length - 1}
            onFocus={() => setActive((current) => current ?? data.length - 1)}
            aria-valuetext={
              activeEntry
                ? `${activeEntry.label}: ${formatDe(activeEntry.value)} ${unit}`
                : 'kein Zeitpunkt gewählt'
            }
            onChange={(event) => setActive(Number(event.target.value))}
            className="min-w-0 flex-1 accent-[#00d9c6]"
          />
        </label>
      ) : null}
    </div>
  );
}
