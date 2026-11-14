import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BreakpointKey } from '../../../model/dashboardConfigV2';

export interface BreakpointSelectorProps {
  activeBreakpoint: BreakpointKey;
  onBreakpointChange: (bp: BreakpointKey) => void;
  className?: string;
}

export function BreakpointSelector({
  activeBreakpoint,
  onBreakpointChange,
  className,
}: BreakpointSelectorProps) {
  return (
    <div
      data-testid="breakpoint-selector"
      className={cn(
        'flex items-center rounded-md border border-[var(--color-border,#1b3d39)] bg-black/30 p-0.5',
        className,
      )}
    >
      <button
        type="button"
        data-testid="breakpoint-desktop"
        onClick={() => onBreakpointChange('desktop')}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded transition-colors',
          activeBreakpoint === 'desktop'
            ? 'bg-primary/20 text-primary font-semibold'
            : 'text-[var(--color-text-muted)] hover:text-white',
        )}
        title="Desktop-Ansicht (12 Spalten)"
        aria-label="Desktop-Ansicht"
      >
        <Monitor className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-testid="breakpoint-tablet"
        onClick={() => onBreakpointChange('tablet')}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded transition-colors',
          activeBreakpoint === 'tablet'
            ? 'bg-primary/20 text-primary font-semibold'
            : 'text-[var(--color-text-muted)] hover:text-white',
        )}
        title="Tablet-Ansicht (6 Spalten)"
        aria-label="Tablet-Ansicht"
      >
        <Tablet className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-testid="breakpoint-mobile"
        onClick={() => onBreakpointChange('mobile')}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded transition-colors',
          activeBreakpoint === 'mobile'
            ? 'bg-primary/20 text-primary font-semibold'
            : 'text-[var(--color-text-muted)] hover:text-white',
        )}
        title="Smartphone-Ansicht (1 Spalte)"
        aria-label="Smartphone-Ansicht"
      >
        <Smartphone className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
