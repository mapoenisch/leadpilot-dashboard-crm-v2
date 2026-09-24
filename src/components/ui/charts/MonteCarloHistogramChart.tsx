import { useState } from 'react';
import { formatChartMetric } from '../chartTheme';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';
import { cn } from '@/lib/utils';

export interface HistogramBucket {
  min: number;
  max: number;
  count: number;
  label?: string;
}

export interface MonteCarloHistogramChartProps {
  buckets: HistogramBucket[];
  totalRuns: number;
  median: number;
  mean?: number;
  p10?: number;
  p90?: number;
  unit?: string;
  minRequiredRuns?: number;
  height?: number;
}

export function MonteCarloHistogramChart({
  buckets = [],
  totalRuns = 0,
  median,
  p10,
  p90,
  unit = '€',
  minRequiredRuns = 3,
  height = 220,
}: MonteCarloHistogramChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Honest readiness check: When runs are too low for true statistical density
  if (totalRuns < minRequiredRuns || buckets.length === 0) {
    return (
      <ChartEmptyState
        title="Monte-Carlo Verteilung im Aufbau"
        message="Eine statistisch belastbare Häufigkeitsverteilung (Histogramm) erfordert mehrere Simulationsläufe. Bei einzelnen Läufen wird der konkrete Einzelwert in der Zeitreihe dargestellt."
        currentCount={totalRuns}
        minRequired={minRequiredRuns}
        requirement={`Aktuell: ${totalRuns} / ${minRequiredRuns} Läufen für Histogramm-Dichte`}
        iconName="trendingUp"
      />
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const minVal = buckets[0]?.min ?? 0;
  const maxVal = buckets[buckets.length - 1]?.max ?? 100;

  const hoveredBucket =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < buckets.length ? buckets[hoverIdx] : null;

  return (
    <div className="relative flex w-full flex-col gap-[10px]">
      {/* Histogram Canvas */}
      <div
        className="relative box-border flex items-end gap-[6px] border-0 border-b border-solid border-border pb-[24px]"
        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (height-Prop des Aufrufers)
        style={{ height: `${height}px` }}
      >
        {buckets.map((b, i) => {
          const heightPct = Math.max(6, (b.count / maxCount) * 100);
          const isMedianBucket = median >= b.min && median <= b.max;
          const isHovered = hoverIdx === i;

          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Histogramm-Bereich ${b.min} bis ${b.max}: ${b.count} Treffer`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onFocus={() => setHoverIdx(i)}
              onBlur={() => setHoverIdx(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHoverIdx(i);
                }
              }}
              className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-[4px]"
            >
              {/* Count label above bar */}
              <span
                className={cn(
                  'font-mono text-[11px] font-semibold',
                  isMedianBucket ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
                  b.count > 0 ? 'opacity-100' : 'opacity-0',
                )}
              >
                {b.count > 0 ? b.count : ''}
              </span>

              {/* Bar Polygon */}
              <div
                className={cn(
                  'w-full rounded-[4px_4px_0_0] border border-solid [transition:height_250ms_ease,background_150ms_ease]',
                  isMedianBucket
                    ? 'border-[var(--color-accent)] shadow-[0_0_10px_rgba(0,229,255,0.35)] [background:linear-gradient(180deg,var(--color-accent)_0%,rgba(0,229,255,0.4)_100%)]'
                    : isHovered
                      ? 'border-[rgba(0,217,198,0.3)] [background:linear-gradient(180deg,var(--color-primary)_0%,rgba(0,217,198,0.5)_100%)]'
                      : 'border-[rgba(0,217,198,0.3)] [background:linear-gradient(180deg,rgba(0,217,198,0.7)_0%,rgba(0,217,198,0.25)_100%)]',
                )}
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Balkenhöhe aus Verteilung)
                style={{ height: `${heightPct}%` }}
              />

              {/* Bottom Bucket Range Label */}
              <span
                className={cn(
                  'max-w-[65px] overflow-hidden text-ellipsis whitespace-nowrap text-center font-mono text-[9.5px]',
                  isMedianBucket
                    ? 'font-bold text-[var(--color-accent)]'
                    : 'font-normal text-[var(--color-text-muted)]',
                )}
              >
                {Math.round(b.min).toLocaleString('de-DE')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating Tooltip */}
      {hoveredBucket && hoverIdx !== null && (
        <ChartTooltip
          title={`Intervall: ${Math.round(hoveredBucket.min).toLocaleString('de-DE')} – ${Math.round(hoveredBucket.max).toLocaleString('de-DE')} ${unit}`}
          items={[
            {
              label: 'Häufigkeit',
              value: `${hoveredBucket.count} Läufe (${Math.round((hoveredBucket.count / totalRuns) * 100)}%)`,
              color: 'var(--color-primary)',
            },
          ]}
        />
      )}

      {/* Statistical Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-[8px] px-[4px] py-0 text-[11.5px] text-[var(--color-text-muted)]">
        <span>
          Min (P10): <strong className="text-text">{formatChartMetric(p10 ?? minVal, unit)}</strong>
        </span>
        <span className="font-semibold text-[var(--color-accent)]">
          P50 Median: <strong>{formatChartMetric(median, unit)}</strong>
        </span>
        <span>
          Max (P90): <strong className="text-text">{formatChartMetric(p90 ?? maxVal, unit)}</strong>
        </span>
      </div>

      <ChartLegend
        size="sm"
        items={[
          { label: 'Median-Intervall', color: 'var(--color-accent)', shape: 'rect' },
          { label: 'Verteilungs-Buckets', color: 'rgba(0, 217, 198, 0.7)', shape: 'rect' },
        ]}
      />
    </div>
  );
}
