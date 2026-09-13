import React from 'react';
import { StatusChip } from '../StatusChip';
import { Icon } from '../Icon';

export interface ChartMetricHeaderProps {
  label: string;
  value: string | number;
  unit?: string;
  baselineValue?: string | number;
  deltaAbsolute?: number;
  deltaPercent?: number;
  isPositiveChange?: boolean;
  goalStatus?: string;
  style?: React.CSSProperties;
}

export function ChartMetricHeader({
  label,
  value,
  unit = '',
  baselineValue,
  deltaAbsolute,
  deltaPercent,
  isPositiveChange = true,
  goalStatus,
  style,
}: ChartMetricHeaderProps) {
  const formattedVal = typeof value === 'number' ? value.toLocaleString('de-DE') : value;
  const formattedBaseline =
    typeof baselineValue === 'number' ? baselineValue.toLocaleString('de-DE') : baselineValue;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        marginBottom: '6px',
        ...style,
      }}
    >
      <div>
        <div
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-muted)',
          }}
        >
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            {formattedVal}
          </span>
          {unit && (
            <span style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        {goalStatus && (
          <StatusChip
            variant={
              goalStatus === 'ACHIEVED' ? 'mint' : goalStatus === 'AT_RISK' ? 'orange' : 'neutral'
            }
            label={goalStatus}
            size="sm"
          />
        )}

        {(deltaAbsolute !== undefined || deltaPercent !== undefined) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: isPositiveChange ? 'var(--color-primary)' : 'var(--color-warning)',
            }}
          >
            <Icon name={isPositiveChange ? 'trendingUp' : 'trendingDown'} size={13} />
            <span>
              {deltaAbsolute !== undefined &&
                `${deltaAbsolute >= 0 ? '+' : ''}${deltaAbsolute.toLocaleString('de-DE')} ${unit}`.trim()}
              {deltaPercent !== undefined &&
                ` (${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%)`}
            </span>
          </div>
        )}

        {formattedBaseline !== undefined && (
          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
            Basis: {formattedBaseline} {unit}
          </div>
        )}
      </div>
    </div>
  );
}
