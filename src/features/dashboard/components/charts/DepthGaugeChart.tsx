// Tachometer / Skala (Auftrag Executive Dashboard Rework Paket 4):
// Halbbogen / 270°-Radialskala mit Fortschrittsbogen, Skalenmarken, zentrischer Wertanzeige
// und vollständigem Tastatur- und Screenreader-Zugang.
import { useMemo } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import {
  ChartReadout,
  ChartSummary,
  LEGEND_RESERVE_CLASS,
  LegendButtons,
  ScrollableChart,
  useActiveDatum,
} from './ChartReadout';
import { CHART_VIEWBOX, type DepthChartProps } from './chartTypes';
import {
  formatDe,
  gaugeArcPath,
  niceSignedScale,
  polarToCartesian,
  summarizeGauge,
} from './depthGeometry';

const THEME = MANAGEMENT_CHART_THEME.colors;
const GAUGE_GEOMETRY = { cx: 280, cy: 155, radius: 95, startAngle: 225, span: 270 };

export function DepthGaugeChart({
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
  const activeIndex = active ?? 0;
  const activeEntry = data[activeIndex] ?? data[0] ?? { label: title, value: 0 };
  const value = activeEntry.value;

  const isPercentage = unit === '%' || /prozent|marge|quote|rate/i.test(activeEntry.label);
  const scale = useMemo(() => {
    if (isPercentage && value >= 0 && value <= 100) {
      return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
    }
    const low = Math.min(0, value);
    const high = Math.max(1, value);
    return niceSignedScale(low, high, 4);
  }, [value, isPercentage]);

  const span = scale.max - scale.min > 0 ? scale.max - scale.min : 1;
  const t = Math.max(0, Math.min(1, (value - scale.min) / span));
  const currentAngle = (GAUGE_GEOMETRY.startAngle + t * GAUGE_GEOMETRY.span) % 360;

  const bgPath = useMemo(
    () =>
      gaugeArcPath(
        GAUGE_GEOMETRY.cx,
        GAUGE_GEOMETRY.cy,
        GAUGE_GEOMETRY.radius,
        GAUGE_GEOMETRY.startAngle,
        (GAUGE_GEOMETRY.startAngle + GAUGE_GEOMETRY.span) % 360,
      ),
    [],
  );

  const progressPath = useMemo(() => {
    if (t <= 0.001) return '';
    return gaugeArcPath(
      GAUGE_GEOMETRY.cx,
      GAUGE_GEOMETRY.cy,
      GAUGE_GEOMETRY.radius,
      GAUGE_GEOMETRY.startAngle,
      currentAngle,
    );
  }, [t, currentAngle]);

  const tip = useMemo(
    () =>
      polarToCartesian(
        GAUGE_GEOMETRY.cx,
        GAUGE_GEOMETRY.cy,
        GAUGE_GEOMETRY.radius,
        currentAngle,
      ),
    [currentAngle],
  );

  const summaryId = `${idPrefix}-gauge-summary`;
  const summary = useMemo(
    () =>
      summarizeGauge(
        activeEntry.label,
        value,
        unit,
        period,
        scale.min,
        scale.max,
        formatValue,
      ),
    [activeEntry.label, value, unit, period, scale.min, scale.max, formatValue],
  );

  const isNegative = value < 0;
  const strokeColor = isNegative ? THEME.warning : THEME.primary;
  const glowId = `${idPrefix}-gauge-glow`;

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-gauge-chart">
      <ScrollableChart label={`${title}: Tachometer, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label={`${title}: Tachometer`}
          aria-describedby={summaryId}
          className="block h-auto w-full min-w-[560px]"
        >
          <defs>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hintergrundbogen */}
          <path
            d={bgPath}
            fill="none"
            stroke={THEME.gridStrong}
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Skalen-Ticks */}
          {scale.ticks.map((tick) => {
            const tickRatio = (tick - scale.min) / span;
            const angle = (GAUGE_GEOMETRY.startAngle + tickRatio * GAUGE_GEOMETRY.span) % 360;
            const p1 = polarToCartesian(
              GAUGE_GEOMETRY.cx,
              GAUGE_GEOMETRY.cy,
              GAUGE_GEOMETRY.radius - 12,
              angle,
            );
            const p2 = polarToCartesian(
              GAUGE_GEOMETRY.cx,
              GAUGE_GEOMETRY.cy,
              GAUGE_GEOMETRY.radius + 12,
              angle,
            );
            return (
              <line
                key={tick}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={THEME.border}
                strokeWidth="1.5"
              />
            );
          })}

          {/* Fortschrittsbogen */}
          {progressPath ? (
            <path
              d={progressPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="16"
              strokeLinecap="round"
              filter={`url(#${glowId})`}
              className={reducedMotion ? '' : 'transition-all duration-300'}
            />
          ) : null}

          {/* Spitze / Indikatorpunkt */}
          {t > 0.001 ? (
            <circle
              cx={tip.x}
              cy={tip.y}
              r={9}
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="3.5"
              className={reducedMotion ? '' : 'transition-all duration-300'}
            />
          ) : null}

          {/* Skalen-Grenzwerte */}
          <text
            x={GAUGE_GEOMETRY.cx - 95}
            y={GAUGE_GEOMETRY.cy + 75}
            textAnchor="middle"
            fontSize="11"
            fill={THEME.neutral}
          >
            {formatValue ? formatValue(scale.min) : `${formatDe(scale.min)} ${unit}`.trim()}
          </text>
          <text
            x={GAUGE_GEOMETRY.cx + 95}
            y={GAUGE_GEOMETRY.cy + 75}
            textAnchor="middle"
            fontSize="11"
            fill={THEME.neutral}
          >
            {formatValue ? formatValue(scale.max) : `${formatDe(scale.max)} ${unit}`.trim()}
          </text>

          {/* Zentrischer Wert */}
          <text
            x={GAUGE_GEOMETRY.cx}
            y={GAUGE_GEOMETRY.cy - 6}
            textAnchor="middle"
            fontSize="30"
            fontWeight="bold"
            fontFamily="monospace"
            fill={isNegative ? THEME.warning : '#ffffff'}
          >
            {formatValue ? formatValue(value) : `${formatDe(value)} ${unit}`.trim()}
          </text>

          {/* Beschriftung unter dem Wert */}
          <text
            x={GAUGE_GEOMETRY.cx}
            y={GAUGE_GEOMETRY.cy + 22}
            textAnchor="middle"
            fontSize="12"
            fill={THEME.neutral}
          >
            {activeEntry.label}
          </text>
        </svg>
      </ScrollableChart>

      <ChartSummary id={summaryId} text={summary} />
      <ChartReadout
        entry={activeEntry}
        unit={unit}
        formatValue={formatValue}
        period={period}
        stableHeight={stableLegend}
      />

      {data.length > 1 ? (
        <LegendButtons
          data={data}
          activeIndex={activeIndex}
          onSelect={setActive}
          ariaLabel={`${title}: Kennzahl wählen`}
          stableHeight={stableLegend}
        />
      ) : stableLegend ? (
        <div aria-hidden="true" className={LEGEND_RESERVE_CLASS} />
      ) : null}
    </div>
  );
}
