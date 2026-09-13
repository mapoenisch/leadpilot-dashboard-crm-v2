import { useState } from 'react';
import { formatChartMetric } from '../chartTheme';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Histogram Canvas */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          height: `${height}px`,
          gap: '6px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--color-border)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
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
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              {/* Count label above bar */}
              <span
                style={{
                  fontSize: '11px',
                  color: isMedianBucket ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  opacity: b.count > 0 ? 1 : 0,
                }}
              >
                {b.count > 0 ? b.count : ''}
              </span>

              {/* Bar Polygon */}
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  background: isMedianBucket
                    ? 'linear-gradient(180deg, var(--color-accent) 0%, rgba(0, 229, 255, 0.4) 100%)'
                    : isHovered
                      ? 'linear-gradient(180deg, var(--color-primary) 0%, rgba(0, 217, 198, 0.5) 100%)'
                      : 'linear-gradient(180deg, rgba(0, 217, 198, 0.7) 0%, rgba(0, 217, 198, 0.25) 100%)',
                  borderRadius: '4px 4px 0 0',
                  border: isMedianBucket
                    ? '1px solid var(--color-accent)'
                    : '1px solid rgba(0, 217, 198, 0.3)',
                  boxShadow: isMedianBucket ? '0 0 10px rgba(0, 229, 255, 0.35)' : 'none',
                  transition: 'height 250ms ease, background 150ms ease',
                }}
              />

              {/* Bottom Bucket Range Label */}
              <span
                style={{
                  fontSize: '9.5px',
                  color: isMedianBucket ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontWeight: isMedianBucket ? 700 : 400,
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '65px',
                  textAlign: 'center',
                }}
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px',
          color: 'var(--color-text-muted)',
          padding: '0 4px',
        }}
      >
        <span>
          Min (P10):{' '}
          <strong style={{ color: 'var(--color-text)' }}>
            {formatChartMetric(p10 ?? minVal, unit)}
          </strong>
        </span>
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
          P50 Median: <strong>{formatChartMetric(median, unit)}</strong>
        </span>
        <span>
          Max (P90):{' '}
          <strong style={{ color: 'var(--color-text)' }}>
            {formatChartMetric(p90 ?? maxVal, unit)}
          </strong>
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
