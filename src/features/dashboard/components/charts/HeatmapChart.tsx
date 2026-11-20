// Auftrag 170 (P14b): Heatmap „Woche × Wochentag“ oder „Phase × Woche“.
// Sequenzielle Farbstufen aus den Türkis-Tokens, Legende mit Wertebereich, jede Zelle mit Text im
// zugänglichen Namen; leere Zellen schraffiert (Muster, nicht Farbe allein). Tastatur: Pfeiltasten.
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import { ScrollableChart, ChartSummary } from './ChartReadout';
import { CHART_VIEWBOX, SERIES_COLORS, type TimeDepthChartProps } from './chartTypes';
import { toHeatmapGrid, NO_DATA_LABEL } from '../../model/timeseries/toHeatmapGrid';
import type { HeatmapCell } from '../../model/timeseries/types';
import type { TimeSeriesPoint } from '../../data/dashboardData';
import { formatDe } from './depthGeometry';

const THEME = MANAGEMENT_CHART_THEME.colors;
/** Dunkel (niedrig) bis hell (hoch): vorhandene Abstufung der Säulen- und Anteilsfarben. */
export const HEATMAP_STEPS = [...SERIES_COLORS].reverse();
const MARGIN = { left: 150, top: 30, right: 16, bottom: 12 };
const GAP = 3;

export function heatmapStep(value: number, min: number, max: number): number {
  if (max <= min) return HEATMAP_STEPS.length - 1;
  const ratio = (value - min) / (max - min);
  return Math.min(HEATMAP_STEPS.length - 1, Math.floor(ratio * HEATMAP_STEPS.length));
}

function rowsAsPoints(data: TimeDepthChartProps['data']): TimeSeriesPoint[] {
  return data.map((d) => ({
    at: 'at' in d && d.at ? d.at : d.label,
    value: d.value,
    status: 'status' in d && d.status ? d.status : 'belegt',
    measuredAt: null,
  }));
}

export function HeatmapChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  formatValue,
  extras,
}: TimeDepthChartProps) {
  const patternId = `${idPrefix}-hm-empty-${useId().replace(/:/g, '')}`;
  const summaryId = `${idPrefix}-hm-summary`;
  const source = extras?.heatmap;
  const show = formatValue ?? ((v: number) => `${formatDe(v)} ${unit}`.trim());

  const grid = useMemo(
    () =>
      toHeatmapGrid({
        // Woche × Wochentag: die Kachelreihe ist die Tagesreihe der Heatmap und bereits umgeformt
        // (Einheit, Glättung); die Rohpunkte gelten nur, solange die Kachel keine Zeilen liefert.
        points: data.length > 0 ? rowsAsPoints(data) : (source?.points ?? []),
        phaseSeries: source?.phaseSeries,
        sourceResolution: 'tag',
        aggregationType: source?.aggregation ?? 'keine',
        mode: source?.mode ?? 'woche_wochentag',
        unit,
        formatValue: (v) => formatDe(v),
      }),
    [source, data, unit],
  );
  const cellAt = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of grid.cells) map.set(`${cell.rowIndex}:${cell.colIndex}`, cell);
    return map;
  }, [grid]);

  const [active, setActive] = useState({ row: 0, col: 0 });
  const [hasFocus, setHasFocus] = useState(false);
  const cols = Math.max(grid.colLabels.length, 1);
  const rows = Math.max(grid.rowLabels.length, 1);
  const colWidth = Math.max(16, (CHART_VIEWBOX.width - MARGIN.left - MARGIN.right) / cols - GAP);
  const rowHeight = Math.min(
    28,
    Math.max(14, (CHART_VIEWBOX.height - MARGIN.top - MARGIN.bottom) / rows - GAP),
  );
  const width = Math.max(CHART_VIEWBOX.width, MARGIN.left + MARGIN.right + cols * (colWidth + GAP));
  const height = MARGIN.top + MARGIN.bottom + rows * (rowHeight + GAP);
  // „KW 52“ braucht bei Schriftgröße 10 rund 34 Einheiten: schmalere Spalten nur jede 2./4. KW.
  const labelStep = colWidth + GAP >= 36 ? 1 : colWidth + GAP >= 18 ? 2 : 4;
  const activeCell = hasFocus ? cellAt.get(`${active.row}:${active.col}`) : undefined;

  const onKeyDown = (event: KeyboardEvent<SVGElement>) => {
    const move: Record<string, [number, number]> = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    };
    const step = move[event.key];
    if (!step) return;
    event.preventDefault();
    const row = Math.min(rows - 1, Math.max(0, active.row + step[0]));
    const col = Math.min(cols - 1, Math.max(0, active.col + step[1]));
    setActive({ row, col });
    (event.currentTarget.ownerSVGElement ?? event.currentTarget)
      .querySelector<SVGElement>(`[data-cell="${row}:${col}"]`)
      ?.focus();
  };

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-heatmap-chart">
      <ScrollableChart label={`${title}: Heatmap, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="grid"
          aria-label={`${title}: Heatmap ${grid.mode === 'phase_woche' ? 'Phase × Woche' : 'Woche × Wochentag'}`}
          aria-describedby={summaryId}
          className="block h-auto w-full min-w-[560px]"
        >
          <defs>
            <pattern
              id={patternId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke={THEME.neutral}
                strokeWidth="1.2"
                strokeOpacity="0.45"
              />
            </pattern>
          </defs>
          <g aria-hidden="true">
            {grid.colLabels.map((label, col) =>
              col % labelStep === 0 || col === cols - 1 ? (
                <text
                  key={`c-${col}`}
                  x={MARGIN.left + col * (colWidth + GAP) + colWidth / 2}
                  y={MARGIN.top - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill={THEME.neutral}
                >
                  {label}
                </text>
              ) : null,
            )}
          </g>
          {grid.rowLabels.map((rowLabel, row) => (
            <g key={`r-${row}`} role="row">
              <text
                role="rowheader"
                x={MARGIN.left - 8}
                y={MARGIN.top + row * (rowHeight + GAP) + rowHeight / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fill={THEME.neutral}
              >
                {rowLabel}
              </text>
              {grid.colLabels.map((_, col) => {
                const cell = cellAt.get(`${row}:${col}`);
                if (!cell) return null;
                const isActive = active.row === row && active.col === col;
                const fill =
                  cell.value === null
                    ? `url(#${patternId})`
                    : HEATMAP_STEPS[heatmapStep(cell.value, grid.minValue, grid.maxValue)];
                return (
                  <rect
                    key={`c-${row}-${col}`}
                    role="gridcell"
                    aria-label={cell.accessibleName}
                    data-cell={`${row}:${col}`}
                    data-testid={cell.isNull ? 'heatmap-empty-cell' : 'heatmap-cell'}
                    tabIndex={isActive ? 0 : -1}
                    x={MARGIN.left + col * (colWidth + GAP)}
                    y={MARGIN.top + row * (rowHeight + GAP)}
                    width={colWidth}
                    height={rowHeight}
                    rx={2}
                    fill={fill}
                    stroke={
                      isActive && hasFocus ? THEME.secondary : cell.isNull ? THEME.border : 'none'
                    }
                    strokeWidth={isActive && hasFocus ? 2 : 1}
                    className="cursor-pointer outline-none"
                    onFocus={() => {
                      setActive({ row, col });
                      setHasFocus(true);
                    }}
                    onBlur={() => setHasFocus(false)}
                    onMouseEnter={() => {
                      setActive({ row, col });
                      setHasFocus(true);
                    }}
                    onMouseLeave={() => setHasFocus(false)}
                    onKeyDown={onKeyDown}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </ScrollableChart>
      <ChartSummary
        id={summaryId}
        text={`${title}: Heatmap mit ${grid.colLabels.length} Spalten und ${grid.rowLabels.length} Zeilen, Werte von ${show(grid.minValue)} bis ${show(grid.maxValue)}. Schraffierte Zellen: ${NO_DATA_LABEL}.`}
      />
      <p
        data-testid="chart-readout"
        role="status"
        aria-live="polite"
        className="m-0 min-h-[20px] text-[12px] text-[var(--color-text-muted)]"
      >
        {activeCell
          ? `${activeCell.rowLabel}, ${activeCell.colLabel}: ${activeCell.value === null ? NO_DATA_LABEL : show(activeCell.value)} · ${period}`
          : 'Zelle wählen oder mit den Pfeiltasten wandern.'}
      </p>
      <div
        data-testid="heatmap-legend"
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-muted)]"
      >
        <span className="flex items-center gap-1.5">
          <span>{show(grid.minValue)}</span>
          <svg width={HEATMAP_STEPS.length * 14} height="10" aria-hidden="true">
            {HEATMAP_STEPS.map((color, i) => (
              <rect key={color} x={i * 14} y={0} width={13} height={10} rx={1} fill={color} />
            ))}
          </svg>
          <span>{show(grid.maxValue)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <rect width="14" height="14" rx={2} fill={`url(#${patternId})`} stroke={THEME.border} />
          </svg>
          <span>{NO_DATA_LABEL}</span>
        </span>
      </div>
    </div>
  );
}
