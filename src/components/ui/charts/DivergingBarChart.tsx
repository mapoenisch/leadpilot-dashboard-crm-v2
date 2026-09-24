import { formatChartMetric } from '../chartTheme';
import { cn } from '@/lib/utils';

export interface DivergingImpactItem {
  label: string;
  delta: number;
  unit?: string;
  baseline?: number;
  isFavorable?: boolean;
  note?: string;
}

export interface DivergingBarChartProps {
  items: DivergingImpactItem[];
  unit?: string;
}

export function DivergingBarChart({ items = [], unit = '€' }: DivergingBarChartProps) {
  if (!items || items.length === 0) return null;

  const maxAbsDelta = Math.max(...items.map((it) => Math.abs(it.delta)), 1);

  return (
    <div className="flex w-full flex-col gap-[8px]">
      {items.map((it, idx) => {
        const isPos = it.delta >= 0;
        const widthPct = Math.min(100, (Math.abs(it.delta) / maxAbsDelta) * 100);
        const isFav = it.isFavorable !== undefined ? it.isFavorable : isPos;

        const barColor = isFav ? 'text-[var(--color-primary)]' : 'text-[var(--color-warning)]';
        const barBg = isFav
          ? '[background:linear-gradient(90deg,rgba(0,217,198,0.4)_0%,#00D9C6_100%)]'
          : '[background:linear-gradient(90deg,#FF7A3D_0%,rgba(255,122,61,0.4)_100%)]';

        return (
          <div
            key={idx}
            className={cn(
              'flex flex-col gap-[2px] px-0 py-[4px]',
              idx < items.length - 1 && 'border-0 border-b border-solid border-border-soft',
            )}
          >
            {/* Header with Item Name and Delta Value */}
            <div className="flex justify-between text-[12px]">
              <span className="font-medium text-text">{it.label}</span>
              <div className="flex items-baseline gap-[6px]">
                {it.baseline !== undefined && (
                  <span className="text-[10.5px] text-[var(--color-text-muted)]">
                    Basis: {formatChartMetric(it.baseline, it.unit || unit)}
                  </span>
                )}
                <strong className={cn('font-mono', barColor)}>
                  {it.delta >= 0 ? '+' : ''}
                  {formatChartMetric(it.delta, it.unit || unit)}
                </strong>
              </div>
            </div>

            {/* Split Diverging Bar Canvas */}
            <div className="grid h-[14px] grid-cols-[1fr_2px_1fr] items-center gap-[4px] rounded-[3px] bg-background-deep px-[2px] py-0">
              {/* Negative side (left) */}
              <div className="flex h-[8px] justify-end">
                {!isPos && (
                  <div
                    className={cn(
                      'h-full rounded-[2px_0_0_2px] [transition:width_250ms_ease]',
                      barBg,
                    )}
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Balkenbreite aus Daten)
                    style={{ width: `${widthPct}%` }}
                  />
                )}
              </div>

              {/* Center Zero Line */}
              <div className="h-full w-[2px] bg-border" />

              {/* Positive side (right) */}
              <div className="flex h-[8px] justify-start">
                {isPos && (
                  <div
                    className={cn(
                      'h-full rounded-[0_2px_2px_0] [transition:width_250ms_ease]',
                      barBg,
                    )}
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Balkenbreite aus Daten)
                    style={{ width: `${widthPct}%` }}
                  />
                )}
              </div>
            </div>

            {it.note && (
              <span className="text-[10.5px] italic text-[var(--color-text-muted)]">{it.note}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
