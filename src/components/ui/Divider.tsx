import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Divider hat keine Varianten — cva nur als Basis (Muster-Einheitlichkeit).
const dividerVariants = cva(
  'border-0 border-t border-solid border-[var(--color-border-soft)] my-4 mx-0'
);

export function Divider() {
  return <hr className={cn(dividerVariants())} />;
}
