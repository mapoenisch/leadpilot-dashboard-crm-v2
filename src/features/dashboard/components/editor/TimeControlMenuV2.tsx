// Executive Dashboard V2 (Auftrag 161 / P10b-2):
// Zeitsteuerungs-Menü der Top-Bar (Live / Pause / Zeitpunkt).
// Auslagerung aus EditorTopBarV2 zur Einhaltung der max-lines-Grenze (400 Zeilen).

import { lazy, Suspense, useRef, useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptionalTimeControl } from '../../time/TimeControlProvider';

const LazyTimePointDialog = lazy(() =>
  import('./TimePointDialogV2').then((m) => ({ default: m.TimePointDialogV2 })),
);

export interface TimeControlMenuV2Props {
  isLivePaused: boolean;
  onToggleLivePause: () => void;
  onResume?: () => void;
  className?: string;
}

const berlinFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatBerlinDateTime(iso: string | null): string {
  if (!iso) return 'Zeitpunkt';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${berlinFormatter.format(d)} Uhr`;
}

export function TimeControlMenuV2({
  isLivePaused,
  onToggleLivePause,
  onResume,
  className,
}: TimeControlMenuV2Props) {
  const timeControl = useOptionalTimeControl();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isTimePoint = timeControl?.state.mode === 'zeitpunkt';
  const analysisAt = timeControl?.state.analysisAt ?? null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {isTimePoint ? (
        <div
          data-testid="time-point-banner"
          className="flex h-8 items-center gap-2 rounded border border-cyan-500/40 bg-cyan-950/40 px-2.5 text-xs text-cyan-200"
        >
          <Clock className="h-3 w-3 text-cyan-400" aria-hidden="true" />
          <span>Ansicht zum {formatBerlinDateTime(analysisAt)}</span>
          <button
            type="button"
            data-testid="back-to-live-button"
            onClick={() => {
              timeControl?.resume();
              if (onResume) {
                onResume();
              } else {
                onToggleLivePause();
              }
            }}
            className="ml-1 rounded border border-cyan-500/50 bg-cyan-900/60 px-2 py-0.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-800/80"
          >
            Zurück zu Live
          </button>
        </div>
      ) : (
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
      )}

      <button
        ref={triggerRef}
        type="button"
        data-testid="time-point-trigger"
        onClick={() => setIsDialogOpen(true)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors',
          isTimePoint
            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
            : 'border-[var(--color-border,#1b3d39)] bg-black/20 text-[var(--color-text-muted)] hover:text-white',
        )}
        title="Historischen Analysezeitpunkt wählen"
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        <span>Zeitpunkt wählen…</span>
      </button>

      {isDialogOpen && (
        <Suspense fallback={null}>
          <LazyTimePointDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSelect={(iso) => {
              timeControl?.setTimePoint(iso);
              setIsDialogOpen(false);
            }}
            currentAnalysisAt={analysisAt}
            triggerRef={triggerRef}
          />
        </Suspense>
      )}
    </div>
  );
}
