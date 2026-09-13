import React from 'react';
import { formatChartMetric } from '../chartTheme';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {items.map((it, idx) => {
        const isPos = it.delta >= 0;
        const widthPct = Math.min(100, (Math.abs(it.delta) / maxAbsDelta) * 100);
        const isFav = it.isFavorable !== undefined ? it.isFavorable : isPos;

        const barColor = isFav ? 'var(--color-primary)' : 'var(--color-warning)';
        const barBg = isFav
          ? 'linear-gradient(90deg, rgba(0, 217, 198, 0.4) 0%, #00D9C6 100%)'
          : 'linear-gradient(90deg, #FF7A3D 0%, rgba(255, 122, 61, 0.4) 100%)';

        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '4px 0',
              borderBottom: idx < items.length - 1 ? '1px solid var(--color-border-soft)' : 'none',
            }}
          >
            {/* Header with Item Name and Delta Value */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{it.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                {it.baseline !== undefined && (
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                    Basis: {formatChartMetric(it.baseline, it.unit || unit)}
                  </span>
                )}
                <strong style={{ color: barColor, fontFamily: 'var(--font-mono)' }}>
                  {it.delta >= 0 ? '+' : ''}
                  {formatChartMetric(it.delta, it.unit || unit)}
                </strong>
              </div>
            </div>

            {/* Split Diverging Bar Canvas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2px 1fr',
                gap: '4px',
                alignItems: 'center',
                height: '14px',
                background: 'var(--color-bg-deep)',
                borderRadius: '3px',
                padding: '0 2px',
              }}
            >
              {/* Negative side (left) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', height: '8px' }}>
                {!isPos && (
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      background: barBg,
                      borderRadius: '2px 0 0 2px',
                      transition: 'width 250ms ease',
                    }}
                  />
                )}
              </div>

              {/* Center Zero Line */}
              <div style={{ width: '2px', height: '100%', background: 'var(--color-border)' }} />

              {/* Positive side (right) */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', height: '8px' }}>
                {isPos && (
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      background: barBg,
                      borderRadius: '0 2px 2px 0',
                      transition: 'width 250ms ease',
                    }}
                  />
                )}
              </div>
            </div>

            {it.note && (
              <span
                style={{
                  fontSize: '10.5px',
                  color: 'var(--color-text-muted)',
                  fontStyle: 'italic',
                }}
              >
                {it.note}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
