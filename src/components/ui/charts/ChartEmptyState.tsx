import { Icon } from '../Icon';
import { cn } from '@/lib/utils';

export interface ChartEmptyStateProps {
  title?: string;
  message: string;
  requirement?: string;
  currentCount?: number;
  minRequired?: number;
  iconName?: string;
  className?: string;
}

export function ChartEmptyState({
  title = 'Noch keine ausreichende Datenbasis',
  message,
  requirement,
  currentCount,
  minRequired,
  iconName = 'trendingUp',
  className,
}: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        'box-border flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background-deep px-4 py-6 text-center text-[var(--color-text-muted)]',
        className,
      )}
    >
      <div className="mb-[2px] flex h-[36px] w-[36px] items-center justify-center rounded-[50%] bg-surface text-[var(--color-primary)]">
        <Icon name={iconName} size={18} />
      </div>

      <div className="text-[13px] font-semibold text-text">{title}</div>

      <div className="max-w-[380px] text-[12px] leading-[1.4]">{message}</div>

      {(currentCount !== undefined || requirement) && (
        <div className="mt-[6px] rounded-full border border-solid border-border-soft bg-surface px-[10px] py-[3px] text-[11px] font-medium text-[var(--color-primary)]">
          {requirement ||
            (minRequired
              ? `Status: ${currentCount} von ${minRequired} Läufen ausgeführt`
              : `Aktuell: ${currentCount} Läufe`)}
        </div>
      )}
    </div>
  );
}
