import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface ToolbarProps {
  children: React.ReactNode;
  ariaLabel?: string;
  align?: 'left' | 'center' | 'right' | 'between';
  gap?: string;
}

const toolbarVariants = cva('flex items-center flex-wrap', {
  variants: {
    align: {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: {
    align: 'left',
  },
});

export function Toolbar({
  children,
  ariaLabel = 'Aktionsleiste',
  align = 'left',
  gap = 'var(--space-2)',
}: ToolbarProps) {
  // gap ist ein offener String-Prop (einziger verbliebener dynamischer Wert):
  // beide im Repo vorkommenden Werte sind explizit abgebildet, Fallback ist
  // der Default — kein style-Attribut nötig.
  const gapClass = gap === '6px' ? 'gap-[6px]' : 'gap-[var(--space-2)]';

  return (
    <div role="toolbar" aria-label={ariaLabel} className={cn(toolbarVariants({ align }), gapClass)}>
      {children}
    </div>
  );
}
