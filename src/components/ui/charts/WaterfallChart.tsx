import { formatChartMetric } from '../chartTheme';
import { cn } from '@/lib/utils';

// Issue #7: Balken-Tonalität als literale Klassen statt Inline-Style.
const WATERFALL_TONE = {
  total: {
    bar: 'border-[var(--color-primary)] [background:linear-gradient(180deg,var(--color-primary)_0%,rgba(0,217,198,0.5)_100%)]',
    label: 'text-[var(--color-primary)]',
  },
  positive: {
    bar: 'border-[var(--color-success)] [background:linear-gradient(180deg,var(--color-success)_0%,rgba(78,204,163,0.5)_100%)]',
    label: 'text-[var(--color-success)]',
  },
  negative: {
    bar: 'border-[var(--color-warning)] [background:linear-gradient(180deg,var(--color-warning)_0%,rgba(255,122,61,0.5)_100%)]',
    label: 'text-[var(--color-warning)]',
  },
} as const;

export interface WaterfallStep {
  label: string;
  value: number;
  isTotal?: boolean;
  note?: string;
}

export interface WaterfallChartProps {
  steps: WaterfallStep[];
  unit?: string;
  height?: number;
}

export function WaterfallChart({
  steps = [],
  unit: _unit = '€',
  height = 200,
}: WaterfallChartProps) {
  if (!steps || steps.length === 0) return null;

  // Compute intermediate running balances
  let running = 0;
  const computed = steps.map((st) => {
    if (st.isTotal) {
      const val = running;
      return { ...st, start: 0, end: val, val, isTotal: true };
    }
    const start = running;
    const end = running + st.value;
    running = end;
    return { ...st, start, end, val: st.value, isTotal: false };
  });

  const allVals = computed.flatMap((c) => [c.start, c.end, 0]);
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;

  const padTop = 20;
  const padBottom = 30;
  const plotH = height - padTop - padBottom;

  const getY = (v: number) => padTop + plotH - ((v - minVal) / range) * plotH;

  return (
    <div className="flex w-full flex-col gap-[8px]">
      <div
        className="relative flex items-stretch border-0 border-b border-solid border-border"
        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (height-Prop, abgeleiteter Innenabstand)
        style={{ height: `${height}px`, paddingBottom: `${padBottom}px` }}
      >
        {computed.map((st, idx) => {
          const topVal = Math.max(st.start, st.end);
          const botVal = Math.min(st.start, st.end);
          const topY = getY(topVal);
          const botY = getY(botVal);
          const barH = Math.max(3, botY - topY);

          const isPos = st.val >= 0;
          const isTotal = st.isTotal;
          const tone = isTotal
            ? WATERFALL_TONE.total
            : isPos
              ? WATERFALL_TONE.positive
              : WATERFALL_TONE.negative;

          return (
            <div key={idx} className="relative flex h-full flex-1 flex-col items-center">
              {/* Floating Bar */}
              <div
                className={cn(
                  'absolute flex w-[70%] items-center justify-center rounded-[3px] border border-solid',
                  tone.bar,
                )}
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Balkenlage aus Daten)
                style={{ top: `${topY}px`, height: `${barH}px` }}
              />

              {/* Value Label */}
              <span
                className={cn(
                  'absolute whitespace-nowrap font-mono text-[10.5px] font-semibold',
                  isTotal ? 'text-text' : tone.label,
                )}
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Label-Lage aus Daten)
                style={{ top: `${topY - 16}px` }}
              >
                {!isTotal && isPos ? '+' : ''}
                {formatChartMetric(st.val, '')}
              </span>

              {/* Step X-Label */}
              <span className="absolute bottom-[-24px] max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[10px] text-[var(--color-text-muted)]">
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
