import { memo, useCallback } from 'react';
import { Calendar, Radio, GitCompare, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelSourceMode } from '../services/funnelAnalyticsService';

export interface FunnelSourceToggleProps {
  mode: FunnelSourceMode;
  onChange: (mode: FunnelSourceMode) => void;
  className?: string;
}

interface ToggleOption {
  key: FunnelSourceMode;
  label: string;
  sublabel: string;
  icon: LucideIcon;
}

const OPTIONS: readonly ToggleOption[] = [
  {
    key: 'plan',
    label: 'Plan 2025',
    sublabel: 'Faktenblatt FY 2025',
    icon: Calendar,
  },
  {
    key: 'live',
    label: 'Live-Pipeline',
    sublabel: 'CRM Echtzeit',
    icon: Radio,
  },
  {
    key: 'vergleich',
    label: 'Vergleich',
    sublabel: 'Plan vs. Live-Ist',
    icon: GitCompare,
  },
];

export const FunnelSourceToggle = memo(function FunnelSourceToggle({
  mode,
  onChange,
  className,
}: FunnelSourceToggleProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentKey: FunnelSourceMode) => {
      const currentIndex = OPTIONS.findIndex((opt) => opt.key === currentKey);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % OPTIONS.length;
        const nextOpt = OPTIONS[nextIndex];
        if (nextOpt) onChange(nextOpt.key);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
        const prevOpt = OPTIONS[prevIndex];
        if (prevOpt) onChange(prevOpt.key);
      }
    },
    [onChange],
  );

  return (
    <div
      role="tablist"
      aria-label="Datenquelle für Vertriebs-Funnel auswählen"
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-solid border-border-soft bg-background-deep p-1 shadow-inner',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const isSelected = mode === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            role="tab"
            type="button"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.key)}
            onKeyDown={(e) => handleKeyDown(e, opt.key)}
            data-testid={`funnel-toggle-${opt.key}`}
            className={cn(
              'group relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isSelected
                ? 'border border-solid border-border-subtle bg-surface text-text shadow-sm'
                : 'text-text-muted hover:bg-surface/50 hover:text-text',
            )}
          >
            <Icon
              size={14}
              aria-hidden="true"
              className={cn(
                'shrink-0 transition-colors',
                isSelected ? 'text-primary' : 'text-text-muted group-hover:text-text',
                opt.key === 'live' && isSelected && 'animate-pulse text-emerald-400',
              )}
            />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold">{opt.label}</span>
              <span className="text-[10px] text-text-muted">{opt.sublabel}</span>
            </div>
            {opt.key === 'vergleich' && (
              <span
                aria-hidden="true"
                className={cn(
                  'ml-1 rounded px-1 py-0.2 text-[9.5px] font-bold uppercase tracking-wider',
                  isSelected ? 'bg-primary/20 text-primary' : 'bg-surface-elevated text-text-muted',
                )}
              >
                Δ
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
