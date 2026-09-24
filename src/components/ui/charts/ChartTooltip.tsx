import { cn } from '@/lib/utils';

export interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
  delta?: string | number;
  isFavorable?: boolean;
}

export interface ChartTooltipProps {
  title?: string;
  items: TooltipItem[];
  x?: number;
  y?: number;
  visible?: boolean;
  className?: string;
}

export function ChartTooltip({
  title,
  items,
  x = 0,
  y = 0,
  visible = true,
  className,
}: ChartTooltipProps) {
  if (!visible || items.length === 0) return null;

  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute z-[100] min-w-[120px] max-w-[260px] rounded-md border border-solid border-border bg-background-deep px-[12px] py-[8px] font-body text-[12px] shadow-modal backdrop-blur-[6px] [transform:translate(-50%,-105%)] [transition:opacity_150ms_ease,transform_150ms_ease]',
        className,
      )}
      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Tooltip-Position aus Pointer-Koordinaten)
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {title && (
        <div className="mb-[4px] border-0 border-b border-solid border-border-soft pb-[3px] text-[11px] font-semibold uppercase tracking-[0.04em] text-text">
          {title}
        </div>
      )}

      <div className="flex flex-col gap-[3px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-[12px]">
            <div className="flex items-center gap-[6px]">
              {item.color && (
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-[50%]"
                  // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Serienfarbe aus Daten)
                  style={{ background: item.color }}
                />
              )}
              <span className="text-[var(--color-text-muted)]">{item.label}</span>
            </div>

            <div className="flex items-center gap-[4px]">
              <strong className="text-text">
                {typeof item.value === 'number' ? item.value.toLocaleString('de-DE') : item.value}
              </strong>
              {item.delta !== undefined && (
                <span
                  className={cn(
                    'text-[10.5px] font-semibold',
                    item.isFavorable === undefined
                      ? 'text-[var(--color-text-muted)]'
                      : item.isFavorable
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-warning)]',
                  )}
                >
                  ({item.delta})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
