import React from 'react';
import { MANAGEMENT_CHART_THEME, formatManagementMetric } from './managementChartTheme';

export interface ManagementChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: unknown;
    color?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  sourceLabel?: string;
  unit?: string;
  valueFormatter?: (val: number) => string;
}

export const ManagementChartTooltip: React.FC<ManagementChartTooltipProps> = ({
  active,
  payload,
  label,
  sourceLabel = 'Ebene A Baseline',
  unit,
  valueFormatter = (val) => formatManagementMetric(val, unit),
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'rgba(5, 20, 19, 0.92)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${MANAGEMENT_CHART_THEME.colors.border}`,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 12px ${MANAGEMENT_CHART_THEME.colors.glow}`,
        borderRadius: '6px',
        padding: '10px 14px',
        minWidth: '180px',
        color: '#E2E8F0',
        fontSize: '12px',
        fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid rgba(0, 217, 198, 0.12)',
          paddingBottom: '6px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
          {label}
        </span>
        {sourceLabel && (
          <span
            style={{
              fontSize: '9.5px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(0, 217, 198, 0.12)',
              color: MANAGEMENT_CHART_THEME.colors.primary,
              fontWeight: 600,
            }}
          >
            {sourceLabel}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {payload.map((entry, idx) => {
          const val = typeof entry.value === 'number' ? entry.value : Number(entry.value);
          const color = entry.color || MANAGEMENT_CHART_THEME.colors.primary;

          return (
            <div
              key={`item-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: color,
                    display: 'inline-block',
                    boxShadow: `0 0 6px ${color}66`,
                  }}
                />
                <span style={{ color: MANAGEMENT_CHART_THEME.colors.neutral, fontSize: '11.5px' }}>
                  {entry.name || 'Wert'}
                </span>
              </div>
              <span style={{ fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                {valueFormatter(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
