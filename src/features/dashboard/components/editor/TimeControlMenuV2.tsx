// Executive Dashboard V2 (Auftrag 161 / P10b-2):
// Zeitsteuerungs-Menü der Top-Bar (Live / Pause / Zeitpunkt).
// Auslagerung aus EditorTopBarV2 zur Einhaltung der max-lines-Grenze (400 Zeilen).

import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimeControlMenuV2Props {
  isLivePaused: boolean;
  onToggleLivePause: () => void;
  className?: string;
}

export function TimeControlMenuV2({
  isLivePaused,
  onToggleLivePause,
  className,
}: TimeControlMenuV2Props) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        data-testid="live-pause-button"
        aria-pressed={isLivePaused}
        onClick={onToggleLivePause}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors',
          isLivePaused
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            : 'border-[var(--color-border,#1b3d39)] bg-black/20 text-[var(--color-text-muted)] hover:text-white',
        )}
        title={isLivePaused ? 'Live-Aktualisierung fortsetzen' : 'Live-Aktualisierung anhalten'}
      >
        {isLivePaused ? (
          <>
            <Play className="h-3 w-3" aria-hidden="true" />
            <span>Fortsetzen</span>
          </>
        ) : (
          <>
            <Pause className="h-3 w-3" aria-hidden="true" />
            <span>Pausieren</span>
          </>
        )}
      </button>
    </div>
  );
}
