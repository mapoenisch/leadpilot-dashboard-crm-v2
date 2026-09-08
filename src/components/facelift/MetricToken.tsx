import React from 'react';
import { VisualTone } from '../../domain/faceliftVisualData';

export interface MetricDelta {
  value: string | number;
  isPositive?: boolean;
  label?: string;
}

export interface MetricTokenProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: MetricDelta;
  tone?: VisualTone;
  subtext?: string;
  glyph?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const TONE_STYLES: Record<VisualTone, { valueColor: string; borderColor: string; bgColor: string }> = {
  positive: {
    valueColor: 'var(--color-primary)',
    borderColor: 'rgba(0, 217, 198, 0.3)',
    bgColor: 'var(--cyan-a12)',
  },
  attention: {
    valueColor: 'var(--color-accent)',
    borderColor: 'rgba(255, 122, 61, 0.3)',
    bgColor: 'var(--orange-a14)',
  },
  neutral: {
    valueColor: 'var(--color-text)',
    borderColor: 'var(--color-border)',
    bgColor: 'var(--color-surface)',
  },
  accent: {
    valueColor: 'var(--cyan-light)',
    borderColor: 'rgba(124, 239, 230, 0.3)',
    bgColor: 'rgba(0, 217, 198, 0.08)',
  },
};

const SIZES = {
  sm: {
    padding: 'var(--space-2) var(--space-3)',
    labelFontSize: '0.75rem',
    valueFontSize: '1.125rem',
    unitFontSize: '0.75rem',
  },
  md: {
    padding: 'var(--space-3) var(--space-4)',
    labelFontSize: '0.8125rem',
    valueFontSize: '1.5rem',
    unitFontSize: '0.875rem',
  },
  lg: {
    padding: 'var(--space-4) var(--space-5)',
    labelFontSize: '0.875rem',
    valueFontSize: '2rem',
    unitFontSize: '1rem',
  },
};

export const MetricToken: React.FC<MetricTokenProps> = ({
  label,
  value,
  unit,
  delta,
  tone = 'neutral',
  subtext,
  glyph,
  size = 'md',
  className = '',
  style,
}) => {
  const toneStyle = TONE_STYLES[tone];
  const sizeConfig = SIZES[size];

  return (
    <div
      className={`facelift-metric-token ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${toneStyle.borderColor}`,
        backgroundColor: toneStyle.bgColor,
        padding: sizeConfig.padding,
        boxSizing: 'border-box',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.02em',
            color: 'var(--color-text-muted)',
            fontSize: sizeConfig.labelFontSize,
          }}
        >
          {label}
        </span>
        {glyph && <span style={{ flexShrink: 0 }}>{glyph}</span>}
      </div>

      <div
        style={{
          marginTop: 'var(--space-1)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-1)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: toneStyle.valueColor,
            fontSize: sizeConfig.valueFontSize,
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              fontSize: sizeConfig.unitFontSize,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {(delta || subtext) && (
        <div
          style={{
            marginTop: 'var(--space-2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '0.75rem',
          }}
        >
          {delta && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.6875rem',
                backgroundColor:
                  delta.isPositive === undefined
                    ? 'var(--color-surface-raised)'
                    : delta.isPositive
                    ? 'var(--cyan-a12)'
                    : 'var(--orange-a14)',
                color:
                  delta.isPositive === undefined
                    ? 'var(--color-text)'
                    : delta.isPositive
                    ? 'var(--color-primary)'
                    : 'var(--color-accent)',
                border: `1px solid ${
                  delta.isPositive === undefined
                    ? 'var(--color-border)'
                    : delta.isPositive
                    ? 'rgba(0, 217, 198, 0.3)'
                    : 'rgba(255, 122, 61, 0.3)'
                }`,
              }}
            >
              {delta.isPositive ? '+' : ''}
              {delta.value}
              {delta.label ? ` ${delta.label}` : ''}
            </span>
          )}
          {subtext && (
            <span
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.6875rem',
              }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
