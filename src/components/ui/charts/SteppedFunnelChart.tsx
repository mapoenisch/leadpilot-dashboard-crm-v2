import { formatChartMetric } from '../chartTheme';
import { StatusChip } from '../StatusChip';
import { cn } from '@/lib/utils';

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
    <div className="flex w-full flex-col gap-[10px]">
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const widthPct = Math.max(18, (stage.count / maxCount) * 100);
        const nextStage = !isLast ? stages[idx + 1] : null;
        const calcConv =
          nextStage && stage.count > 0
            ? (nextStage.count / stage.count) * 100
            : stage.conversionRateToNext;

        return (
          <div key={stage.name} className="flex flex-col gap-[4px]">
            {/* Stage Bar Row */}
            <div className="flex items-center gap-[12px]">
              {/* Stage Info */}
              <div className="flex w-[120px] shrink-0 flex-col text-[12px]">
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-text">
                  {stage.name}
                </strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">Stufe {idx + 1}</span>
              </div>

              {/* Funnel Step Bar */}
              <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                <div
                  className={cn(
                    'box-border flex h-[32px] min-w-[60px] items-center justify-between rounded-sm border border-solid px-[10px] py-0 [transition:width_300ms_ease]',
                    stage.isBottleneck
                      ? 'border-[var(--color-warning)] shadow-[0_0_10px_rgba(255,122,61,0.25)] [background:linear-gradient(90deg,rgba(255,122,61,0.4)_0%,rgba(255,122,61,0.85)_100%)]'
                      : isLast
                        ? 'border-[var(--color-primary)] [background:linear-gradient(90deg,rgba(0,217,198,0.5)_0%,#00D9C6_100%)]'
                        : 'border-[rgba(0,217,198,0.3)] [background:linear-gradient(90deg,rgba(0,217,198,0.25)_0%,rgba(0,217,198,0.6)_100%)]',
                  )}
                  // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Stufenbreite aus Funnel-Daten)
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="text-[12.5px] font-bold text-[#FFFFFF] [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                    {formatChartMetric(stage.count, unit)}
                  </span>
                  {stage.value !== undefined && (
                    <span className="font-mono text-[11px] text-[rgba(255,255,255,0.85)]">
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
              <div className="mx-0 my-[1px] flex items-center gap-[8px] pl-[130px]">
                <span className="text-[10px] text-[var(--color-primary)] opacity-70">↓</span>
                <span className="rounded-[3px] border border-solid border-border-soft bg-background-deep px-[6px] py-[1px] text-[11px] text-[var(--color-text-muted)]">
                  Conversion:{' '}
                  <strong
                    className={
                      calcConv >= 30 ? 'text-[var(--color-primary)]' : 'text-[var(--color-warning)]'
                    }
                  >
                    {calcConv.toFixed(1)}%
                  </strong>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
