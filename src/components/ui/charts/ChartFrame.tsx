import React from 'react';
import { Card } from '../Card';
import { StatusChip } from '../StatusChip';
import { cn } from '@/lib/utils';

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  headerAction?: React.ReactNode;
  height?: number | string;
  minHeight?: number | string;
  children: React.ReactNode;
  insight?: React.ReactNode;
  className?: string;
}

// Issue #7: statische Gestaltung als Tailwind-Klassen. Nur die vom Aufrufer
// gesetzte Canvas-Höhe ist Laufzeit-Geometrie und bleibt ein style-Wert.
export function ChartFrame({
  title,
  subtitle,
  sourceLabel,
  headerAction,
  height,
  minHeight = '240px',
  children,
  insight,
  className,
}: ChartFrameProps) {
  return (
    <Card
      padding="var(--space-4)"
      className={cn(
        'box-border flex w-full min-w-0 flex-col gap-3 border border-solid border-border bg-surface',
        className,
      )}
    >
      {/* Chart Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            <h3 className="m-0 font-display text-[15px] font-semibold tracking-[-0.01em] text-text">
              {title}
            </h3>
            {sourceLabel && <StatusChip variant="neutral" label={sourceLabel} size="sm" />}
          </div>
          {subtitle && (
            <p className="mb-0 ml-0 mr-0 mt-[3px] text-[12px] leading-[1.4] text-[var(--color-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Chart Canvas Area */}
      <div
        className="relative box-border flex w-full min-w-0 flex-col justify-center overflow-x-auto"
        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (height/minHeight-Props des Aufrufers)
        style={{ minHeight, height: height || 'auto' }}
      >
        {children}
      </div>

      {/* Optional Insight Callout */}
      {insight && (
        <div className="mt-[4px] border-0 border-t border-solid border-border-soft pt-[8px] text-[11.5px] text-[var(--color-text-muted)]">
          {insight}
        </div>
      )}
    </Card>
  );
}
