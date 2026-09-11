import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
}

const alertVariants = cva(
  'border border-solid border-[var(--color-border-soft)] rounded-md p-4 text-text text-[13.5px]',
  {
    variants: {
      variant: {
        info: 'bg-[rgba(0,217,198,0.08)] border-l-4 border-l-primary',
        success: 'bg-[rgba(61,220,151,0.08)] border-l-4 border-l-success',
        warning: 'bg-[rgba(255,122,61,0.08)] border-l-4 border-l-warning',
        error: 'bg-[rgba(255,90,95,0.08)] border-l-4 border-l-error',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const alertTitleVariants = cva('font-semibold mb-[4px]', {
  variants: {
    variant: {
      info: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }))}>
      {title && <div className={cn(alertTitleVariants({ variant }))}>{title}</div>}
      <div>{children}</div>
    </div>
  );
}
