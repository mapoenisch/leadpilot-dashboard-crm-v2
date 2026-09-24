import { cn } from '@/lib/utils';

export interface LegendItem {
  label: string;
  color: string;
  value?: number | string;
  sharePercent?: number;
  shape?: 'circle' | 'line' | 'dashed' | 'rect';
}

export interface ChartLegendProps {
  items: LegendItem[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  onItemHover?: (index: number | null) => void;
  className?: string;
}

export function ChartLegend({
  items,
  orientation = 'horizontal',
  size = 'md',
  onItemHover,
  className,
}: ChartLegendProps) {
  const isHoriz = orientation === 'horizontal';

  return (
    <div
      role="list"
      aria-label="Diagrammlegende"
      className={cn(
        'flex flex-wrap text-[var(--color-text-muted)]',
        isHoriz
          ? 'flex-row items-center justify-center gap-3'
          : 'flex-col items-stretch justify-start gap-[6px]',
        size === 'sm' ? 'text-[11px]' : 'text-[12px]',
        className,
      )}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          role="listitem"
          onMouseEnter={() => onItemHover?.(idx)}
          onMouseLeave={() => onItemHover?.(null)}
          className={cn(
            'flex select-none items-center gap-[6px]',
            onItemHover ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          {/* Shape Icon — Form als Klasse, Farbe kommt aus den Daten */}
          {item.shape === 'line' ? (
            <span
              className="inline-block h-[3px] w-[14px] shrink-0 rounded-[1px]"
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Serienfarbe aus Daten)
              style={{ background: item.color }}
            />
          ) : item.shape === 'dashed' ? (
            <span
              className="inline-block h-0 w-[14px] shrink-0 border-0 border-t-2 border-dashed"
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Serienfarbe aus Daten)
              style={{ borderTopColor: item.color }}
            />
          ) : item.shape === 'rect' ? (
            <span
              className="inline-block h-[10px] w-[10px] shrink-0 rounded-[2px]"
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Serienfarbe aus Daten)
              style={{ background: item.color }}
            />
          ) : (
            <span
              className="inline-block h-[8px] w-[8px] shrink-0 rounded-[50%]"
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Serienfarbe aus Daten)
              style={{ background: item.color }}
            />
          )}

          <span className="text-[var(--color-text-muted)]">{item.label}</span>

          {item.value !== undefined && (
            <strong className="ml-[2px] text-text">
              {typeof item.value === 'number' ? item.value.toLocaleString('de-DE') : item.value}
            </strong>
          )}

          {item.sharePercent !== undefined && (
            <span className="text-[10.5px] text-[var(--color-text-muted)] opacity-80">
              ({item.sharePercent.toFixed(0)}%)
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
