// Trichterdiagramm / Funnel (Auftrag Executive Dashboard Rework Paket 4):
// Gestufter Trichter für Pipeline-Stufen mit Stufenverbindern,
// Größendarstellung nach Volumen/Anzahl und vollem Tastatur- und Screenreader-Zugang.
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import {
  ChartReadout,
  ChartSummary,
  LEGEND_RESERVE_CLASS,
  LegendButtons,
  ScrollableChart,
  useActiveDatum,
} from './ChartReadout';
import { CHART_VIEWBOX, SERIES_COLORS, type DepthChartProps } from './chartTypes';
import {
  formatDe,
  shortenLabel,
  summarizeFunnel,
} from './depthGeometry';

const THEME = MANAGEMENT_CHART_THEME.colors;

export function DepthFunnelChart({
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

  const maxVal = useMemo(
    () => Math.max(...data.map((d) => (Number.isFinite(d.value) ? d.value : 0)), 1),
    [data],
  );

  const cx = CHART_VIEWBOX.width / 2;
  const top = 20;
  const count = Math.max(data.length, 1);
  const maxW = 460;
  const minW = 140;

  // Stufenhöhe und vertikaler Abstand: Bis 6 Stufen gleichmäßig im Standardbereich (220 px),
  // bei mehr als 6 Stufen wächst die Zeichenfläche dynamisch mit garantierten Mindestabständen (gap >= 8),
  // damit Stufen und Beschriftungen sich nie überlappen.
  const minGap = 8;
  const stageH =
    count > 6
      ? 24
      : Math.min(34, Math.max(22, Math.floor((220 - (count - 1) * minGap) / count)));
  const gap =
    count > 1
      ? count > 6
        ? minGap
        : Math.max(minGap, Math.floor((220 - count * stageH) / (count - 1)))
      : 0;

  const contentBottom = top + count * stageH + (count - 1) * gap;
  const viewBoxHeight = Math.max(CHART_VIEWBOX.height, contentBottom + 20);

  const stages = useMemo(() => {
    return data.map((d, index) => {
      const val = Math.max(0, d.value);
      const ratio = val / maxVal;
      const w = Math.round(minW + ratio * (maxW - minW));
      const x = Math.round(cx - w / 2);
      const y = Math.round(top + index * (stageH + gap));
      const color = SERIES_COLORS[index % SERIES_COLORS.length] ?? THEME.primary;
      return {
        index,
        label: d.label,
        value: d.value,
        x,
        y,
        w,
        h: stageH,
        color,
      };
    });
  }, [data, maxVal, cx, top, stageH, gap, minW, maxW]);

  const summaryId = `${idPrefix}-funnel-summary`;
  const summary = useMemo(
    () => summarizeFunnel(data, unit, period, formatValue),
    [data, unit, period, formatValue],
  );

  const activeIndex = active ?? null;
  const activeEntry = activeIndex !== null ? (data[activeIndex] ?? null) : null;
  const activeStage = activeIndex !== null ? (stages[activeIndex] ?? null) : null;
  const extraInfo = activeStage
    ? `Rang ${activeStage.index + 1} von ${stages.length}`
    : undefined;

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-funnel-chart">
      <ScrollableChart label={`${title}: Trichterdiagramm, waagerecht scrollbar`}>
        <div className={cn(count > 6 && 'max-h-[300px] overflow-y-auto')}>
          <svg
            viewBox={`0 0 ${CHART_VIEWBOX.width} ${viewBoxHeight}`}
            width="100%"
            role="img"
            aria-label={`${title}: Trichterdiagramm`}
            aria-describedby={summaryId}
            className="block h-auto w-full min-w-[560px]"
            onMouseLeave={() => setActive(null)}
          >
            {/* Trichterverbinder zwischen den Stufen */}
            {stages.slice(0, -1).map((stage, i) => {
              const next = stages[i + 1];
              if (!next) return null;
              const points = [
                `${stage.x},${stage.y + stage.h}`,
                `${stage.x + stage.w},${stage.y + stage.h}`,
                `${next.x + next.w},${next.y}`,
                `${next.x},${next.y}`,
              ].join(' ');
              return (
                <polygon
                  key={`connector-${stage.label}`}
                  points={points}
                  fill="rgba(0, 217, 198, 0.05)"
                  stroke={THEME.grid}
                  strokeWidth="1"
                />
              );
            })}

            {/* Stufen-Körper & Beschriftungen */}
            {stages.map((stage) => {
              const isSelected = activeIndex === stage.index;
              const isDimmed = activeIndex !== null && !isSelected;
              return (
                <g
                  key={stage.label}
                  data-testid="funnel-stage"
                  data-active={isSelected ? 'true' : 'false'}
                  opacity={isDimmed ? 0.45 : 1}
                  className={reducedMotion ? '' : 'cursor-pointer transition-opacity duration-150'}
                  onMouseEnter={() => setActive(stage.index)}
                  onClick={() => setActive(stage.index)}
                >
                  {/* Stufenbalken mit Eckenrundung */}
                  <rect
                    x={stage.x}
                    y={stage.y}
                    width={stage.w}
                    height={stage.h}
                    rx="5"
                    fill={stage.color}
                    fillOpacity={isSelected ? 0.95 : 0.75}
                    stroke={isSelected ? '#ffffff' : THEME.border}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Stufen-Name links */}
                  <text
                    x={stage.x + 10}
                    y={stage.y + stage.h / 2 + 4}
                    textAnchor="start"
                    fontSize="11"
                    fontWeight="500"
                    fill="#ffffff"
                  >
                    <title>{stage.label}</title>
                    {shortenLabel(stage.label, 20)}
                  </text>

                  {/* Wert rechts */}
                  <text
                    x={stage.x + stage.w - 10}
                    y={stage.y + stage.h / 2 + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="monospace"
                    fill="#ffffff"
                  >
                    {formatValue ? formatValue(stage.value) : `${formatDe(stage.value)} ${unit}`.trim()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </ScrollableChart>

      <ChartSummary id={summaryId} text={summary} />
      <ChartReadout
        entry={activeEntry}
        unit={unit}
        formatValue={formatValue}
        period={period}
        extra={extraInfo}
        stableHeight={stableLegend}
      />

      {data.length > 1 ? (
        <LegendButtons
          data={data}
          activeIndex={activeIndex}
          onSelect={setActive}
          colors={stages.map((s) => s.color)}
          ariaLabel={`${title}: Stufe wählen`}
          stableHeight={stableLegend}
        />
      ) : stableLegend ? (
        <div aria-hidden="true" className={LEGEND_RESERVE_CLASS} />
      ) : null}
    </div>
  );
}
