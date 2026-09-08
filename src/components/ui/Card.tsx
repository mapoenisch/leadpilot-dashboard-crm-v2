import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  featured?: boolean;
  variant?: 'default' | 'glass' | 'elevated' | 'warning' | 'info';
  padding?: string;
  children: React.ReactNode;
}

export function Card({
  featured = false,
  variant = 'default',
  padding = 'var(--space-5)',
  children,
  style,
  ...rest
}: CardProps) {
  let background = 'var(--color-surface)';
  let border = '1px solid var(--color-border)';
  let boxShadow = 'var(--shadow-card)';
  let backdropFilter: string | undefined = undefined;

  switch (variant) {
    case 'glass':
      background = 'var(--color-surface-glass)';
      border = '1px solid var(--color-border-glass)';
      backdropFilter = 'var(--backdrop-blur)';
      boxShadow = 'var(--shadow-card)';
      break;
    case 'elevated':
      background = 'var(--color-surface-raised)';
      border = '1px solid var(--color-border)';
      boxShadow = 'var(--shadow-modal)';
      break;
    case 'warning':
      border = '1px solid var(--color-warning)';
      boxShadow = 'var(--shadow-glow-orange)';
      break;
    case 'info':
      border = '1px solid var(--color-primary)';
      boxShadow = 'var(--shadow-glow-cyan)';
      break;
    default:
      break;
  }

  if (featured) {
    border = '1px solid var(--color-primary)';
    boxShadow = 'var(--shadow-glow-cyan)';
  }

  return (
    <div
      style={{
        background,
        border,
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        transition: 'all 200ms ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
