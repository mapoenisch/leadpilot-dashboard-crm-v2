// Designprobe Dashboard-Testkachel (Teilauftrag 0): Linie und Fläche.
// Klare Linie mit dezentem Schatten; die Datenpunkte liegen exakt auf dem Wert (keine Tiefenverschiebung).
// Die Fläche (filled) ergänzt einen ruhigen Verlauf. Zugang für Tastatur und Touch: Bereichsregler.
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
import { CHART_VIEWBOX } from './chartTypes';
import type { TimeDepthChartProps } from './chartTypes';
import {
  areaPath,
  formatAxis,
  formatDe,
  linePath,
  linePoints,
  niceScale,
  summarizeSeries,
} from './depthGeometry';

const AREA = { left: 56, top: 26, width: 470, height: 196 };
const THEME = MANAGEMENT_CHART_THEME.colors;

export interface DepthLineChartProps extends TimeDepthChartProps {
  filled?: boolean;
}

export function DepthLineChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  reducedMotion,
  formatValue,
  stableLegend = false,
  filled = false,
}: DepthLineChartProps) {
  const [active, setActive] = useActiveDatum(data);
  const scale = useMemo(() => {
    const valid = data
      .map((d) => d.value)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const max = valid.length > 0 ? Math.max(...valid) : 0;
    return niceScale(max);
  }, [data]);
  const points = useMemo(() => linePoints(data, AREA, scale.max), [data, scale.max]);
  const baseline = AREA.top + AREA.height;
  const summaryId = `${idPrefix}-summary`;
  const summary = useMemo(
    () => summarizeSeries(data, unit, period, 'trend', formatValue),
    [data, unit, period, formatValue],
  );
  const fillId = `${idPrefix}-area`;
  const shadowId = `${idPrefix}-line-shadow`;
  const hatchedId = `${idPrefix}-hatched`;
  const slot = points.length > 1 ? AREA.width / (points.length - 1) : AREA.width;
  const activePoint = active === null ? null : (points[active] ?? null);
  const activeEntry = active === null ? null : (data[active] ?? null);
  const transition = reducedMotion ? '' : 'transition-opacity duration-150';

  const historyStartPrefixCount = useMemo(() => {
    let count = 0;
    for (const p of points) {
      if (p.status === 'vor_historienbeginn') count++;
      else break;
    }
    return count;
  }, [points]);

  const historyZoneWidth = useMemo(() => {
    if (historyStartPrefixCount === 0 || points.length === 0) return 0;
    if (historyStartPrefixCount === points.length) return AREA.width;
    const lastP = points[historyStartPrefixCount - 1]!;
    const nextP = points[historyStartPrefixCount]!;
    return Math.max(0, (lastP.x + nextP.x) / 2 - AREA.left);
  }, [historyStartPrefixCount, points]);

  return (
    <div
      className="flex flex-col gap-[10px]"
      data-testid={filled ? 'depth-area-chart' : 'depth-line-chart'}
    >
      <ScrollableChart label={`${title}: ${filled ? 'Fläche' : 'Linie'}, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label={`${title}: ${filled ? 'Fläche' : 'Linie'}`}
          aria-describedby={summaryId}
          className="block h-auto w-full min-w-[560px]"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={THEME.primary} stopOpacity="0.32" />
              <stop offset="100%" stopColor={THEME.primary} stopOpacity="0.02" />
            </linearGradient>
            <pattern
              id={hatchedId}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke={THEME.neutral}
                strokeWidth="1"
                strokeOpacity="0.25"
              />
            </pattern>
            <filter id={shadowId} x="-10%" y="-20%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {historyZoneWidth > 0 ? (
            <g data-testid="depth-history-zone">
              <rect
                x={AREA.left}
                y={AREA.top}
                width={historyZoneWidth}
                height={AREA.height}
                fill={`url(#${hatchedId})`}
                opacity="0.8"
              />
              <rect
                x={AREA.left}
                y={AREA.top}
                width={historyZoneWidth}
                height={AREA.height}
                fill={THEME.primary}
                opacity="0.04"
              />
              <text
                x={AREA.left + historyZoneWidth / 2}
                y={AREA.top + AREA.height / 2}
                textAnchor="middle"
                fontSize="11"
                fill={THEME.neutral}
                opacity="0.8"
              >
                vor Aufzeichnungsbeginn
              </text>
            </g>
          ) : null}
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
                <text
                  x={AREA.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill={THEME.neutral}
                >
                  {formatValue ? formatAxis(tick) : formatDe(tick)}
                </text>
              </g>
            );
          })}
          {filled ? <path d={areaPath(points, baseline)} fill={`url(#${fillId})`} /> : null}
          <path
            d={linePath(points)}
            transform="translate(0 4)"
            fill="none"
            stroke={THEME.primary}
            strokeWidth="3"
            strokeOpacity="0.35"
            filter={`url(#${shadowId})`}
          />
          <path
            d={linePath(points)}
            fill="none"
            stroke={THEME.primary}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point) => {
            const isNull = point.value === null;
            return (
              <g
                key={`${point.label}-${point.index}`}
                className={transition}
                opacity={active !== null && active !== point.index ? 0.55 : 1}
              >
                {!isNull ? (
                  <circle
                    data-testid="depth-line-point"
                    data-active={active === point.index ? 'true' : 'false'}
                    cx={point.x}
                    cy={point.y}
                    r={active === point.index ? 5 : 3}
                    fill={active === point.index ? '#ffffff' : THEME.darkSurface}
                    stroke={THEME.primary}
                    strokeWidth="1.8"
                  />
                ) : (
                  <circle
                    data-testid="depth-line-point-gap"
                    cx={point.x}
                    cy={baseline}
                    r={active === point.index ? 4.5 : 2.5}
                    fill="none"
                    stroke={active === point.index ? THEME.primary : THEME.neutral}
                    strokeWidth={active === point.index ? 1.5 : 1.2}
                    strokeDasharray="2 2"
                    opacity={active === point.index ? 1 : 0.6}
                  />
                )}
                <text
                  x={point.x}
                  y={baseline + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={THEME.neutral}
                >
                  {point.label}
                </text>
                <rect
                  x={point.x - slot / 2}
                  y={AREA.top}
                  width={slot}
                  height={AREA.height}
                  fill="transparent"
                  onMouseEnter={() => setActive(point.index)}
                />
              </g>
            );
          })}
          {activePoint ? (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={AREA.top}
              y2={baseline}
              stroke={THEME.secondary}
              strokeOpacity="0.5"
              strokeDasharray="2 3"
            />
          ) : null}
        </svg>
      </ScrollableChart>
      <ChartSummary id={summaryId} text={summary} />
      <ChartReadout
        entry={active === null ? null : (data[active] ?? null)}
        unit={unit}
        formatValue={formatValue}
        period={period}
        stableHeight={stableLegend}
      />
      <label className={SLIDER_ROW_CLASS}>
        <span>{SLIDER_LABEL}</span>
        <input
          type="range"
          min={0}
          max={data.length - 1}
          step={1}
          value={active ?? 0}
          // Ohne Auswahl steht der Regler sichtbar auf dem ersten Zeitpunkt: mit Fokus wird er auch
          // tatsächlich gewählt, damit der erste Pfeiltastendruck nicht einen Monat überspringt.
          onFocus={() => setActive((current) => current ?? 0)}
          aria-valuetext={
            activeEntry
              ? activeEntry.value === null
                ? `${activeEntry.label}: ${
                    'status' in activeEntry && activeEntry.status === 'vor_historienbeginn'
                      ? 'vor Aufzeichnungsbeginn'
                      : 'keine Messung'
                  }`
                : `${activeEntry.label}: ${formatDe(activeEntry.value)} ${unit}`
              : 'kein Zeitpunkt gewählt'
          }
          onChange={(event) => setActive(Number(event.target.value))}
          className="min-w-0 flex-1 accent-[#00d9c6]"
        />
      </label>
    </div>
  );
}
