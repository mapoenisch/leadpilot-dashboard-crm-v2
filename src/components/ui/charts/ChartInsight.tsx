import React from 'react';
import { Icon } from '../Icon';
import { cn } from '@/lib/utils';

export interface ChartInsightProps {
  type?: 'positive' | 'warning' | 'neutral';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

// Issue #7: Tonalität als literale Tailwind-Klassen statt Inline-Style.
const TONE = {
  positive: {
    box: 'bg-[rgba(0,217,198,0.06)] border-[rgba(0,217,198,0.2)]',
    accent: 'text-[var(--color-primary)]',
  },
  warning: {
    box: 'bg-[rgba(255,122,61,0.06)] border-[rgba(255,122,61,0.2)]',
    accent: 'text-[var(--color-warning)]',
  },
  neutral: {
    box: 'bg-[rgba(255,255,255,0.02)] border-border-soft',
    accent: 'text-[var(--color-text-muted)]',
  },
} as const;

export function ChartInsight({ type = 'neutral', title, children, className }: ChartInsightProps) {
  const tone = TONE[type];

  return (
    <div
      className={cn(
        'flex items-start gap-[8px] rounded-sm border border-solid px-[12px] py-[8px] text-[12px] leading-[1.4] text-text',
        tone.box,
        className,
      )}
    >
      <div className={cn('mt-[1px] shrink-0', tone.accent)}>
        <Icon
          name={type === 'positive' ? 'trendingUp' : type === 'warning' ? 'alertTriangle' : 'info'}
          size={14}
        />
      </div>

      <div>
        {title && <strong className={cn('mr-[4px]', tone.accent)}>{title}:</strong>}
        <span className="text-[var(--color-text-muted)]">{children}</span>
      </div>
    </div>
  );
}
