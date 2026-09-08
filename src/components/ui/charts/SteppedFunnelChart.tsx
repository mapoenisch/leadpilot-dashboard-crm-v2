import React from 'react';
import { CHART_THEME, formatChartMetric } from '../chartTheme';
import { StatusChip } from '../StatusChip';
import { Icon } from '../Icon';

export interface FunnelStage {
  name: string;
  count: number;
  value?: number;
  conversionRateToNext?: number;
  isBottleneck?: boolean;
  bottleneckReason?: string;
}

export interface SteppedFunnelChartProps {
  stages: FunnelStage[];
  unit?: string;
  valueUnit?: string;
}

export function SteppedFunnelChart({
  stages = [],
  unit = 'Leads',
  valueUnit = '€',
}: SteppedFunnelChartProps) {
  if (!stages || stages.length === 0) return null;

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const widthPct = Math.max(18, (stage.count / maxCount) * 100);
        const nextStage = !isLast ? stages[idx + 1] : null;
        const calcConv = nextStage && stage.count > 0 ? (nextStage.count / stage.count) * 100 : stage.conversionRateToNext;

        return (
          <div key={stage.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Stage Bar Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Stage Info */}
              <div style={{ width: '120px', flexShrink: 0, fontSize: '12px', display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stage.name}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Stufe {idx + 1}
                </span>
              </div>

              {/* Funnel Step Bar */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    minWidth: '60px',
                    height: '32px',
                    background: stage.isBottleneck
                      ? 'linear-gradient(90deg, rgba(255, 122, 61, 0.4) 0%, rgba(255, 122, 61, 0.85) 100%)'
                      : isLast
                      ? 'linear-gradient(90deg, rgba(0, 217, 198, 0.5) 0%, #00D9C6 100%)'
                      : 'linear-gradient(90deg, rgba(0, 217, 198, 0.25) 0%, rgba(0, 217, 198, 0.6) 100%)',
                    borderRadius: 'var(--radius-sm)',
                    border: stage.isBottleneck
                      ? '1px solid var(--color-warning)'
                      : isLast
                      ? '1px solid var(--color-primary)'
                      : '1px solid rgba(0, 217, 198, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    boxSizing: 'border-box',
                    boxShadow: stage.isBottleneck ? '0 0 10px rgba(255, 122, 61, 0.25)' : 'none',
                    transition: 'width 300ms ease',
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    {formatChartMetric(stage.count, unit)}
                  </span>
                  {stage.value !== undefined && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-mono)' }}>
                      {formatChartMetric(stage.value, valueUnit)}
                    </span>
                  )}
                </div>

                {stage.isBottleneck && (
                  <StatusChip
                    variant="orange"
                    label={stage.bottleneckReason || 'Engpass erkannt'}
                    size="sm"
                  />
                )}
              </div>
            </div>

            {/* Conversion Connector to Next Stage */}
            {!isLast && calcConv !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '130px', margin: '1px 0' }}>
                <span style={{ color: 'var(--color-primary)', fontSize: '10px', opacity: 0.7 }}>↓</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', background: 'var(--color-bg-deep)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--color-border-soft)' }}>
                  Conversion: <strong style={{ color: calcConv >= 30 ? 'var(--color-primary)' : 'var(--color-warning)' }}>{calcConv.toFixed(1)}%</strong>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
