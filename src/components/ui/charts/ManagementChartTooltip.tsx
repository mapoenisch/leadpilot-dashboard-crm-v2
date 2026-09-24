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

  // Issue #7: Farben aus MANAGEMENT_CHART_THEME als literale Klassen
  // (border #00D9C6/0.2, glow 0.15, neutral #8FA3A1, primary #00D9C6).
  return (
    <div className="pointer-events-none min-w-[180px] rounded-[6px] border border-solid border-[rgba(0,217,198,0.2)] bg-[rgba(5,20,19,0.92)] px-[14px] py-[10px] font-[family-name:var(--font-sans,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif)] text-[12px] text-[#E2E8F0] [backdrop-filter:blur(12px)] [box-shadow:0_8px_32px_rgba(0,0,0,0.6),0_0_12px_rgba(0,217,198,0.15)]">
      <div className="mb-[8px] flex items-center justify-between gap-[8px] border-0 border-b border-solid border-[rgba(0,217,198,0.12)] pb-[6px]">
        <span className="font-bold tracking-[-0.01em] text-[#FFFFFF]">{label}</span>
        {sourceLabel && (
          <span className="rounded-[3px] bg-[rgba(0,217,198,0.12)] px-[5px] py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[#00D9C6]">
            {sourceLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        {payload.map((entry, idx) => {
          const val = typeof entry.value === 'number' ? entry.value : Number(entry.value);
          const color = entry.color || MANAGEMENT_CHART_THEME.colors.primary;

          return (
            <div key={`item-${idx}`} className="flex items-center justify-between gap-[12px]">
              <div className="flex items-center gap-[6px]">
                <span
                  className="inline-block h-[8px] w-[8px] rounded-[2px]"
                  // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Serienfarbe aus Recharts-Payload)
                  style={{ background: color, boxShadow: `0 0 6px ${color}66` }}
                />
                <span className="text-[11.5px] text-[#8FA3A1]">{entry.name || 'Wert'}</span>
              </div>
              <span className="font-bold tabular-nums text-[#FFFFFF]">{valueFormatter(val)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
