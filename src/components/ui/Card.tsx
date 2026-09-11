import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  featured?: boolean;
  variant?: 'default' | 'glass' | 'elevated' | 'warning' | 'info';
  padding?: string;
  children: React.ReactNode;
}

// padding ist ein offener String-Prop: alle im Repo vorkommenden Werte sind
// explizit abgebildet (Fallback = Default) — kein style-Attribut nötig.
const CARD_PADDINGS: Record<string, string> = {
  '0': 'p-0',
  'var(--space-3)': 'p-3',
  'var(--space-4)': 'p-4',
  'var(--space-5)': 'p-5',
};

const cardVariants = cva('rounded-xl transition-[all_200ms_ease]', {
  variants: {
    variant: {
      default: 'bg-surface border border-solid border-border shadow-card',
      glass: 'bg-surface-glass border border-solid border-glass shadow-card backdrop-blur',
      elevated: 'bg-[var(--color-surface-raised)] border border-solid border-border shadow-modal',
      warning: 'bg-surface border border-solid border-warning shadow-glow-orange',
      info: 'bg-surface border border-solid border-primary shadow-glow-cyan',
    },
    featured: {
      true: 'border-primary shadow-glow-cyan',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    featured: false,
  },
});

export function Card({
  featured = false,
  variant = 'default',
  padding = 'var(--space-5)',
  children,
  style,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, featured }), CARD_PADDINGS[padding] ?? 'p-5')}
      // Ausnahme (G38-Entscheidung 5, Nachtrag): style-Passthrough bleibt,
      // weil Konsumenten Overrides übergeben. Disable-Anweisung in Block D.
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
