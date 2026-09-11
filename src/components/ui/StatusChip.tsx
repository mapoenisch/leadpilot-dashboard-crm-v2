import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type StatusChipVariant = 'cyan' | 'orange' | 'mint' | 'neutral';

export interface StatusChipProps {
  variant?: StatusChipVariant;
  label: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const statusChipVariants = cva(
  'inline-flex items-center gap-[6px] border border-solid rounded-full font-body font-semibold tracking-[0.02em] whitespace-nowrap',
  {
    variants: {
      variant: {
        cyan: 'border-primary text-primary bg-primary-soft',
        orange: 'border-accent text-accent bg-accent-soft',
        mint: 'border-success text-success bg-success-soft',
        neutral: 'border-border text-[var(--color-text-muted)] bg-[rgba(255,255,255,0.03)]',
      },
      size: {
        sm: 'px-[8px] py-[3px] text-[11px]',
        md: 'px-[10px] py-[4px] text-xs',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

const statusChipDotVariants = cva('rounded-full', {
  variants: {
    variant: {
      cyan: 'bg-primary',
      orange: 'bg-accent',
      mint: 'bg-success',
      neutral: 'bg-text-muted',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export function StatusChip({
  variant = 'neutral',
  label,
  icon,
  pulse = false,
  size = 'md',
}: StatusChipProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldPulse = pulse && !prefersReducedMotion;

  return (
    <span className={cn(statusChipVariants({ variant, size }))}>
      {shouldPulse ? (
        <span
          className={cn(
            'pulse-live inline-block w-[7px] h-[7px]',
            statusChipDotVariants({ variant })
          )}
        />
      ) : icon ? (
        icon
      ) : (
        <span
          className={cn(
            'inline-block w-[6px] h-[6px]',
            statusChipDotVariants({ variant })
          )}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
