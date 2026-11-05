// Trichterdiagramm / Funnel (Auftrag Executive Dashboard Rework Paket 4):
// Gestufter Konvertierungstrichter für Pipeline-Stufen mit Stufenverbindern,
// relativer Konvertierungsrate je Stufe und vollem Tastatur- und Screenreader-Zugang.
import { useMemo } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import {
  ChartReadout,
  ChartSummary,
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
  const top = 24;
  const totalHeight = 220;
  const count = Math.max(data.length, 1);
  const maxW = 460;
  const minW = 140;

  const stageH = Math.min(34, Math.max(22, (totalHeight - (count - 1) * 8) / count));
  const gap = count > 1 ? (totalHeight - count * stageH) / (count - 1) : 0;

  const stages = useMemo(() => {
    return data.map((d, index) => {
      const val = Math.max(0, d.value);
      const ratio = val / maxVal;
      const w = Math.round(minW + ratio * (maxW - minW));
      const x = Math.round(cx - w / 2);
      const y = Math.round(top + index * (stageH + gap));
      const prevVal = index > 0 ? (data[index - 1]?.value ?? 0) : val;
      const convPct =
        index === 0
          ? 100
          : prevVal > 0
            ? Math.round((val / prevVal) * 1000) / 10
            : 0;
      const color = SERIES_COLORS[index % SERIES_COLORS.length] ?? THEME.primary;
      return {
        index,
        label: d.label,
        value: d.value,
        x,
        y,
        w,
        h: stageH,
        convPct,
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
    ? activeStage.index === 0
      ? 'Startstufe (100 %)'
      : `${formatDe(activeStage.convPct)} % Konvertierung zur Vorstufe`
    : undefined;

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-funnel-chart">
      <ScrollableChart label={`${title}: Trichterdiagramm, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
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
                  {shortenLabel(stage.label, 16)}
                </text>

                {/* Konvertierungsmarke in der Mitte (ab Stufe 2) */}
                {stage.index > 0 ? (
                  <text
                    x={cx}
                    y={stage.y + stage.h / 2 + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="rgba(255, 255, 255, 0.9)"
                  >
                    {`${formatDe(stage.convPct)} %`}
                  </text>
                ) : null}

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
      ) : null}
    </div>
  );
}
