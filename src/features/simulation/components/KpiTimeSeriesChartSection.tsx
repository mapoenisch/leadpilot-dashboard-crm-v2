import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { BaselineComparisonMode } from '../../../types/kpi';
import { SimulationRun } from '../../../types/scenario';
import {
  AggregatedTimeSeriesPoint,
  KpiConfigItem,
  RUN_OVERLAY_COLORS,
} from './kpiTimeSeriesConfig';

interface KpiTimeSeriesChartSectionProps {
  activeKpiConfig: KpiConfigItem;
  comparisonMode: BaselineComparisonMode;
  rawTimeSeries: AggregatedTimeSeriesPoint[];
  completedRuns: SimulationRun[];
  selectedRunIds: string[];
  onToggleRunSelection: (runId: string) => void;
}

export const KpiTimeSeriesChartSection: React.FC<KpiTimeSeriesChartSectionProps> = ({
  activeKpiConfig,
  comparisonMode,
  rawTimeSeries,
  completedRuns,
  selectedRunIds,
  onToggleRunSelection,
}) => {
  const [hoveredTick, setHoveredTick] = useState<number | null>(null);

  // Transform values per comparison mode
  const transformValue = useCallback(
    (val: number): number => {
      if (comparisonMode === 'DELTA') {
        return val - activeKpiConfig.baseline;
      }
      if (comparisonMode === 'PERCENT') {
        if (activeKpiConfig.baseline === 0) return 0;
        return parseFloat(
          (((val - activeKpiConfig.baseline) / Math.abs(activeKpiConfig.baseline)) * 100).toFixed(
            1,
          ),
        );
      }
      return val;
    },
    [comparisonMode, activeKpiConfig],
  );

  const formatDisplayValue = (val: number): string => {
    if (comparisonMode === 'PERCENT') {
      return `${val >= 0 ? '+' : ''}${val.toLocaleString('de-DE')} %`;
    }
    if (comparisonMode === 'DELTA') {
      return `${val >= 0 ? '+' : ''}${val.toLocaleString('de-DE')} ${activeKpiConfig.unit}`;
    }
    return `${val.toLocaleString('de-DE')} ${activeKpiConfig.unit}`;
  };

  // Compute SVG chart metrics & boundaries
  const chartData = useMemo(() => {
    if (rawTimeSeries.length === 0) return null;

    const points = rawTimeSeries.map((pt) => {
      const p10Raw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.p10
          : activeKpiConfig.key === 'liveMRR'
            ? pt.metrics.mrr.p10
            : activeKpiConfig.key === 'liveCustomers'
              ? pt.metrics.customers.p10
              : activeKpiConfig.key === 'liveWonDeals'
                ? pt.metrics.wonDeals.p10
                : (pt.metrics.ebitda?.p10 ?? 0);

      const medianRaw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.median
          : activeKpiConfig.key === 'liveMRR'
            ? pt.metrics.mrr.median
            : activeKpiConfig.key === 'liveCustomers'
              ? pt.metrics.customers.median
              : activeKpiConfig.key === 'liveWonDeals'
                ? pt.metrics.wonDeals.median
                : (pt.metrics.ebitda?.median ?? 0);

      const p90Raw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.p90
          : activeKpiConfig.key === 'liveMRR'
            ? pt.metrics.mrr.p90
            : activeKpiConfig.key === 'liveCustomers'
              ? pt.metrics.customers.p90
              : activeKpiConfig.key === 'liveWonDeals'
                ? pt.metrics.wonDeals.p90
                : (pt.metrics.ebitda?.p90 ?? 0);

      const meanRaw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.mean
          : activeKpiConfig.key === 'liveMRR'
            ? pt.metrics.mrr.mean
            : activeKpiConfig.key === 'liveCustomers'
              ? pt.metrics.customers.mean
              : activeKpiConfig.key === 'liveWonDeals'
                ? pt.metrics.wonDeals.mean
                : (pt.metrics.ebitda?.mean ?? 0);

      return {
        tick: pt.tick,
        date: pt.simulatedDate,
        p10: transformValue(p10Raw),
        median: transformValue(medianRaw),
        p90: transformValue(p90Raw),
        mean: transformValue(meanRaw),
        rawMedian: medianRaw,
      };
    });

    const targetTransformed =
      activeKpiConfig.target?.targetValue !== undefined
        ? transformValue(activeKpiConfig.target.targetValue)
        : undefined;

    // Determine Y min & max
    const allYValues: number[] = [];
    points.forEach((p) => {
      allYValues.push(p.p10, p.median, p.p90, p.mean);
    });
    if (targetTransformed !== undefined) allYValues.push(targetTransformed);

    // Add selected runs data
    const selectedRunsData = selectedRunIds.map((id, idx) => {
      const run = completedRuns.find((r) => r.runId === id);
      const ts = run?.timeSeries || [];
      const pts = ts.map((t) => ({
        tick: t.tick,
        val: transformValue(activeKpiConfig.timeSeriesExtractor(t)),
      }));
      pts.forEach((p) => allYValues.push(p.val));
      return {
        runId: id,
        color: RUN_OVERLAY_COLORS[idx % RUN_OVERLAY_COLORS.length],
        points: pts,
      };
    });

    let minY = Math.min(...allYValues);
    let maxY = Math.max(...allYValues);
    if (minY === maxY) {
      minY = minY * 0.9;
      maxY = maxY * 1.1 || 100;
    }
    const padding = (maxY - minY) * 0.08;
    minY -= padding;
    maxY += padding;

    return { points, minY, maxY, targetTransformed, selectedRunsData };
  }, [rawTimeSeries, activeKpiConfig, selectedRunIds, completedRuns, transformValue]);

  return (
    <Card padding="var(--space-5)">
      <div className="flex justify-between items-center flex-wrap gap-[var(--space-3)] mb-[var(--space-3)]">
        <div>
          <h4 className="m-0 text-[15px] text-text">
            Zeitreihen-Verlauf & Unsicherheitsband (P10 · P50 Median · P90)
          </h4>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Visualisiert die zeitliche Entwicklung über alle Ticks. Ebene A (31.12.2025) ist als
            unveränderlicher Startpunkt bei Tick 0 fixiert.
          </span>
        </div>
        <div className="flex gap-[12px] text-[12px] items-center flex-wrap">
          <span className="flex items-center gap-[4px]">
            <span className="block w-[12px] h-[12px] rounded-[2px] border border-solid border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.15)]" />
            P10–P90 Band
          </span>
          <span className="flex items-center gap-[4px]">
            <span className="block w-[14px] h-[3px] bg-accent" />
            P50 Median
          </span>
          {activeKpiConfig.target && (
            <span className="flex items-center gap-[4px]">
              <span className="block w-[14px] h-[2px] border-0 border-t-2 border-dashed border-[#22c55e]" />
              Zielpfad
            </span>
          )}
        </div>
      </div>

      {chartData && chartData.points.length > 0 ? (
        <div className="w-full relative">
          <svg viewBox="0 0 800 320" className="w-full h-[320px] overflow-visible">
            {/* Grid Lines */}
            <line
              x1="50"
              y1="20"
              x2="780"
              y2="20"
              stroke="var(--color-border-soft)"
              strokeDasharray="3 3"
            />
            <line
              x1="50"
              y1="90"
              x2="780"
              y2="90"
              stroke="var(--color-border-soft)"
              strokeDasharray="3 3"
            />
            <line
              x1="50"
              y1="160"
              x2="780"
              y2="160"
              stroke="var(--color-border-soft)"
              strokeDasharray="3 3"
            />
            <line
              x1="50"
              y1="230"
              x2="780"
              y2="230"
              stroke="var(--color-border-soft)"
              strokeDasharray="3 3"
            />
            <line x1="50" y1="280" x2="780" y2="280" stroke="var(--color-border)" />

            {/* Y Axis Labels */}
            <text x="40" y="24" fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
              {formatDisplayValue(chartData.maxY)}
            </text>
            <text x="40" y="164" fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
              {formatDisplayValue((chartData.maxY + chartData.minY) / 2)}
            </text>
            <text x="40" y="284" fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
              {formatDisplayValue(chartData.minY)}
            </text>

            {/* SVG Scaler Functions */}
            {(() => {
              const pts = chartData.points;
              const maxX = Math.max(pts.length - 1, 1);
              const getY = (val: number) => {
                const range = chartData.maxY - chartData.minY || 1;
                return 280 - ((val - chartData.minY) / range) * 260;
              };
              const getX = (idx: number) => 50 + (idx / maxX) * 730;

              // Build P10-P90 Corridor Polygon
              const p90Coords = pts.map((p, i) => `${getX(i)},${getY(p.p90)}`).join(' ');
              const p10CoordsReversed = pts
                .slice()
                .reverse()
                .map((p, i) => `${getX(pts.length - 1 - i)},${getY(p.p10)}`)
                .join(' ');
              const polygonPath = `${p90Coords} ${p10CoordsReversed}`;

              // Build Median Line Path
              const medianPath = pts
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.median)}`)
                .join(' ');

              // Build Target Path if available
              const targetPath =
                chartData.targetTransformed !== undefined
                  ? `M 50 ${getY(chartData.targetTransformed)} L 780 ${getY(chartData.targetTransformed)}`
                  : null;

              return (
                <g>
                  {/* Corridor Polygon */}
                  <polygon
                    points={polygonPath}
                    fill="rgba(0, 229, 255, 0.12)"
                    stroke="rgba(0, 229, 255, 0.3)"
                    strokeWidth="1"
                  />

                  {/* Target Line */}
                  {targetPath && (
                    <path d={targetPath} stroke="#22c55e" strokeWidth="2" strokeDasharray="5 4" />
                  )}

                  {/* Selected Run Overlays */}
                  {chartData.selectedRunsData.map((sRun) => {
                    const runPath = sRun.points
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.val)}`)
                      .join(' ');
                    return (
                      <path
                        key={sRun.runId}
                        d={runPath}
                        fill="none"
                        stroke={sRun.color}
                        strokeWidth="1.8"
                        strokeDasharray="2 2"
                        opacity="0.85"
                      />
                    );
                  })}

                  {/* Median Line */}
                  <path d={medianPath} fill="none" stroke="var(--color-accent)" strokeWidth="2.8" />

                  {/* Ebene A Baseline Marker at Tick 0 */}
                  <circle
                    cx="50"
                    cy={getY(pts[0]?.median ?? 0)}
                    r="4.5"
                    fill="var(--color-primary)"
                  />
                  <text
                    x="54"
                    y={getY(pts[0]?.median ?? 0) - 8}
                    fill="var(--color-primary)"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Ebene A (01.01.26)
                  </text>

                  {/* Data Points on Median */}
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle
                        cx={getX(i)}
                        cy={getY(p.median)}
                        r={hoveredTick === p.tick ? 5 : 2.5}
                        fill="var(--color-accent)"
                        onMouseEnter={() => setHoveredTick(p.tick)}
                        onMouseLeave={() => setHoveredTick(null)}
                        className="cursor-pointer"
                      />
                      {/* X-axis tick labels (sparse) */}
                      {i % Math.max(1, Math.floor(pts.length / 6)) === 0 && (
                        <text
                          x={getX(i)}
                          y="298"
                          fill="var(--color-text-muted)"
                          fontSize="9"
                          textAnchor="middle"
                        >
                          {p.date}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              );
            })()}
          </svg>

          {/* Hovered Tick Details Bar */}
          {hoveredTick !== null && (
            <div className="rounded border border-solid border-border bg-background-deep flex justify-between text-[12px] mt-[10px] px-[12px] py-[8px]">
              <span>
                <strong>Tick #{hoveredTick}</strong>
              </span>
              <span>
                P10:{' '}
                {chartData.points.find((p) => p.tick === hoveredTick)?.p10.toLocaleString('de-DE')}
              </span>
              <span className="font-bold text-accent">
                P50 (Median):{' '}
                {chartData.points
                  .find((p) => p.tick === hoveredTick)
                  ?.median.toLocaleString('de-DE')}
              </span>
              <span>
                P90:{' '}
                {chartData.points.find((p) => p.tick === hoveredTick)?.p90.toLocaleString('de-DE')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-[30px] text-[var(--color-text-muted)]">
          Keine Zeitreihendaten für diese Version verfügbar.
        </div>
      )}

      {/* 4. Individual Run Overlays (Max 5) */}
      {completedRuns.length > 0 && (
        <div className="border-0 border-t border-solid border-border-soft mt-[16px] pt-[12px]">
          <div className="flex justify-between items-center mb-[8px]">
            <span className="text-[12.5px] font-semibold text-text">
              Einzel-Run Overlays (Maximal 5 auswählbar, Entscheidungen 1300–1301):
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {selectedRunIds.length} / 5 ausgewählt
            </span>
          </div>
          <div className="flex gap-[8px] flex-wrap">
            {completedRuns.slice(0, 15).map((r, idx) => {
              const isSelected = selectedRunIds.includes(r.runId);
              const colorIdx = selectedRunIds.indexOf(r.runId);
              const assignedColor = colorIdx >= 0 ? RUN_OVERLAY_COLORS[colorIdx] : undefined;
              return (
                <Button
                  key={r.runId}
                  size="sm"
                  variant={isSelected ? 'primary' : 'secondary'}
                  onClick={() => onToggleRunSelection(r.runId)}
                  style={{
                    borderColor: assignedColor,
                    color: isSelected ? '#fff' : assignedColor || 'var(--color-text-muted)',
                    background: isSelected ? assignedColor : undefined,
                  }}
                >
                  Run #{idx + 1} ({activeKpiConfig.runValueExtractor(r).toLocaleString('de-DE')}{' '}
                  {activeKpiConfig.unit})
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
