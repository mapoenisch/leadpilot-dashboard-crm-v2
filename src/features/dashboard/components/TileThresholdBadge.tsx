import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThresholdEvaluationResult } from '../model/thresholdRuleV2';

export interface TileThresholdBadgeProps {
  evaluation: ThresholdEvaluationResult;
  className?: string;
}

export const TileThresholdBadge: React.FC<TileThresholdBadgeProps> = React.memo(
  ({ evaluation, className }) => {
    const { stufe, text } = evaluation;

    if (stufe === 'normal' || stufe === 'keine_daten' || stufe === 'nicht_bewertet') {
      return null;
    }

    const isKritisch = stufe === 'kritisch';
    const isWarnung = stufe === 'warnung';

    const badgeText = isKritisch ? 'Kritisch' : isWarnung ? 'Warnung' : 'Schwellenwert prüfen';

    const colorClasses = isKritisch
      ? 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700/80 dark:bg-rose-950/70 dark:text-rose-200'
      : isWarnung
        ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/70 dark:text-amber-200'
        : 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/70 dark:text-amber-200';

    return (
      <div
        data-testid="tile-threshold-badge"
        data-threshold-stufe={stufe}
        role="status"
        tabIndex={0}
        aria-label={`Schwellenwert: ${text}`}
        title={text}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none select-none cursor-help focus:outline-none focus:ring-1 focus:ring-primary',
          colorClasses,
          className,
        )}
      >
        {isKritisch ? (
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        )}
        <span>{badgeText}</span>
      </div>
    );
  },
);
