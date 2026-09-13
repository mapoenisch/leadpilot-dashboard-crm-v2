import { formatChartMetric } from '../chartTheme';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: `${height}px`,
          position: 'relative',
          paddingBottom: `${padBottom}px`,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {computed.map((st, idx) => {
          const topVal = Math.max(st.start, st.end);
          const botVal = Math.min(st.start, st.end);
          const topY = getY(topVal);
          const botY = getY(botVal);
          const barH = Math.max(3, botY - topY);

          const isPos = st.val >= 0;
          const isTotal = st.isTotal;

          const barColor = isTotal
            ? 'var(--color-primary)'
            : isPos
              ? 'var(--color-success)'
              : 'var(--color-warning)';

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                height: '100%',
              }}
            >
              {/* Floating Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: `${topY}px`,
                  height: `${barH}px`,
                  width: '70%',
                  background: isTotal
                    ? 'linear-gradient(180deg, var(--color-primary) 0%, rgba(0, 217, 198, 0.5) 100%)'
                    : isPos
                      ? 'linear-gradient(180deg, var(--color-success) 0%, rgba(78, 204, 163, 0.5) 100%)'
                      : 'linear-gradient(180deg, var(--color-warning) 0%, rgba(255, 122, 61, 0.5) 100%)',
                  borderRadius: '3px',
                  border: `1px solid ${barColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />

              {/* Value Label */}
              <span
                style={{
                  position: 'absolute',
                  top: `${topY - 16}px`,
                  fontSize: '10.5px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: isTotal ? 'var(--color-text)' : barColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {!isTotal && isPos ? '+' : ''}
                {formatChartMetric(st.val, '')}
              </span>

              {/* Step X-Label */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '-24px',
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '90%',
                }}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
