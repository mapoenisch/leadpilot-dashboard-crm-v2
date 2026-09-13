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

const TONE_CLASSES: Record<
  VisualTone,
  { valueClass: string; borderClass: string; bgClass: string }
> = {
  positive: {
    valueClass: 'text-primary',
    borderClass: 'border-[rgba(0,217,198,0.3)]',
    bgClass: 'bg-cyan-a12',
  },
  attention: {
    valueClass: 'text-accent',
    borderClass: 'border-[rgba(255,122,61,0.3)]',
    bgClass: 'bg-orange-a14',
  },
  neutral: {
    valueClass: 'text-text',
    borderClass: 'border-border',
    bgClass: 'bg-surface',
  },
  accent: {
    valueClass: 'text-cyan-light',
    borderClass: 'border-[rgba(124,239,230,0.3)]',
    bgClass: 'bg-[rgba(0,217,198,0.08)]',
  },
};

const SIZE_CLASSES = {
  sm: {
    paddingClass: 'py-[var(--space-2)] px-[var(--space-3)]',
    labelClass: 'text-[0.75rem]',
    valueClass: 'text-[1.125rem]',
    unitClass: 'text-[0.75rem]',
  },
  md: {
    paddingClass: 'py-[var(--space-3)] px-[var(--space-4)]',
    labelClass: 'text-[0.8125rem]',
    valueClass: 'text-[1.5rem]',
    unitClass: 'text-[0.875rem]',
  },
  lg: {
    paddingClass: 'py-[var(--space-4)] px-[var(--space-5)]',
    labelClass: 'text-[0.875rem]',
    valueClass: 'text-[2rem]',
    unitClass: 'text-[1rem]',
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
  const toneClasses = TONE_CLASSES[tone];
  const sizeClasses = SIZE_CLASSES[size];
  // G39 Welle 1: eigene Anteile als Klassen; Aufrufer-Overrides via
  // style-Passthrough (Konsumenten u. a. in features/**).
  const ownClassName =
    `facelift-metric-token flex flex-col justify-between box-border rounded-md border border-solid ` +
    `${toneClasses.borderClass} ${toneClasses.bgClass} ${sizeClasses.paddingClass} ` +
    `transition-[border-color_0.2s_ease,background-color_0.2s_ease]${className ? ` ${className}` : ''}`;

  return (
    <div
      className={ownClassName}
      // eslint-disable-next-line react/forbid-dom-props -- Passthrough des Aufrufer-style-Props (externe Konsumenten), siehe Auftrag 054 Block D
      style={style}
    >
      <div className="flex items-center justify-between gap-[var(--space-2)]">
        <span
          className={`font-display tracking-[0.02em] text-[var(--color-text-muted)] ${sizeClasses.labelClass}`}
        >
          {label}
        </span>
        {glyph && <span className="shrink-0">{glyph}</span>}
      </div>

      <div className="flex items-baseline gap-[var(--space-1)] mt-[var(--space-1)]">
        <span
          className={`font-mono font-bold tracking-[-0.02em] leading-[1.2] ${toneClasses.valueClass} ${sizeClasses.valueClass}`}
        >
          {value}
        </span>
        {unit && (
          <span
            className={`font-body font-medium text-[var(--color-text-muted)] ${sizeClasses.unitClass}`}
          >
            {unit}
          </span>
        )}
      </div>

      {(delta || subtext) && (
        <div className="flex flex-wrap items-center gap-[var(--space-2)] mt-[var(--space-2)] text-[0.75rem]">
          {delta && (
            <span
              className={`font-mono font-medium rounded px-[6px] py-[2px] text-[0.6875rem] border border-solid ${
                delta.isPositive === undefined
                  ? 'bg-surface-raised text-text border-border'
                  : delta.isPositive
                    ? 'bg-cyan-a12 text-primary border-[rgba(0,217,198,0.3)]'
                    : 'bg-orange-a14 text-accent border-[rgba(255,122,61,0.3)]'
              }`}
            >
              {delta.isPositive ? '+' : ''}
              {delta.value}
              {delta.label ? ` ${delta.label}` : ''}
            </span>
          )}
          {subtext && (
            <span className="text-[0.6875rem] text-[var(--color-text-muted)]">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
};
