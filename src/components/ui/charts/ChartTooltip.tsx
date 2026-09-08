import React from 'react';
import { CHART_THEME } from '../chartTheme';

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
  style?: React.CSSProperties;
}

export function ChartTooltip({
  title,
  items,
  x = 0,
  y = 0,
  visible = true,
  style,
}: ChartTooltipProps) {
  if (!visible || items.length === 0) return null;

  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -105%)',
        background: CHART_THEME.colors.tooltipBg,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-modal)',
        pointerEvents: 'none',
        zIndex: 100,
        fontSize: '12px',
        fontFamily: 'var(--font-body)',
        minWidth: '120px',
        maxWidth: '260px',
        backdropFilter: 'blur(6px)',
        transition: 'opacity 150ms ease, transform 150ms ease',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '4px',
            borderBottom: '1px solid var(--color-border-soft)',
            paddingBottom: '3px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {item.color && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <strong style={{ color: 'var(--color-text)' }}>
                {typeof item.value === 'number' ? item.value.toLocaleString('de-DE') : item.value}
              </strong>
              {item.delta !== undefined && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: item.isFavorable !== undefined
                      ? item.isFavorable ? 'var(--color-primary)' : 'var(--color-warning)'
                      : 'var(--color-text-muted)',
                  }}
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
