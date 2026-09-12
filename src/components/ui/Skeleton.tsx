import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps extends VariantProps<typeof skeletonVariants> {
  variant?: SkeletonVariant;
  /** Laufzeit-Breite (z. B. '60%' oder 120) — als Klasse nicht darstellbar. */
  width?: string | number;
  /** Laufzeit-Höhe (z. B. 32 oder '1em'). */
  height?: string | number;
  className?: string;
  /** Nur für Standalone-Nutzung: accessible Status-Label statt aria-hidden. */
  label?: string;
}

const skeletonVariants = cva('skeleton block animate-pulse bg-surface-raised', {
  variants: {
    variant: {
      text: 'h-[12px] rounded',
      rect: 'rounded-md',
      circle: 'rounded-full',
    },
  },
  defaultVariants: {
    variant: 'rect',
  },
});

function toCssSize(value: string | number | undefined): string | number | undefined {
  return typeof value === 'number' ? `${value}px` : value;
}

export function Skeleton({ variant = 'rect', width, height, className, label }: SkeletonProps) {
  // Laufzeit-Geometrie (width/height-Props des Aufrufers) — als
  // Tailwind-Klasse nicht darstellbar (Muster Auftrag 053 Nachtrag 2).
  const runtimeStyle: React.CSSProperties = {};
  const w = toCssSize(width);
  const h = toCssSize(height);
  if (w !== undefined) runtimeStyle.width = w;
  if (h !== undefined) runtimeStyle.height = h;

  return (
    <span
      className={cn(skeletonVariants({ variant }), className)}
      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (width/height-Props), siehe Auftrag 054 Entscheidung 4
      style={runtimeStyle}
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'status' : undefined}
      aria-label={label}
    />
  );
}
