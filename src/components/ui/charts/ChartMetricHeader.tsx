import { StatusChip } from '../StatusChip';
import { Icon } from '../Icon';
import { cn } from '@/lib/utils';

export interface ChartMetricHeaderProps {
  label: string;
  value: string | number;
  unit?: string;
  baselineValue?: string | number;
  deltaAbsolute?: number;
  deltaPercent?: number;
  isPositiveChange?: boolean;
  goalStatus?: string;
  className?: string;
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
  className,
}: ChartMetricHeaderProps) {
  const formattedVal = typeof value === 'number' ? value.toLocaleString('de-DE') : value;
  const formattedBaseline =
    typeof baselineValue === 'number' ? baselineValue.toLocaleString('de-DE') : baselineValue;

  return (
    <div className={cn('mb-[6px] flex flex-wrap items-start justify-between gap-2', className)}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
          {label}
        </div>
        <div className="mt-[2px] flex items-baseline gap-[6px]">
          <span className="font-display text-[24px] font-bold text-text">{formattedVal}</span>
          {unit && (
            <span className="text-[14px] font-semibold text-[var(--color-primary)]">{unit}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-[4px]">
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
            className={cn(
              'flex items-center gap-[4px] text-[11.5px] font-semibold',
              isPositiveChange ? 'text-[var(--color-primary)]' : 'text-[var(--color-warning)]',
            )}
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
          <div className="text-[10.5px] text-[var(--color-text-muted)]">
            Basis: {formattedBaseline} {unit}
          </div>
        )}
      </div>
    </div>
  );
}
