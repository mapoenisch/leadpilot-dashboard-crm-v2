// Executive Dashboard V2 (Auftrag 148 / P05):
// Statusleiste des V2-Dashboard-Editors.
// Zeigt Verbindungs- & Live-Status, Datenstand, Kachelbudget (max 24)
// und Verlauf-/Speichermonitoring (15 MiB Soft-Limit).

import { Activity, AlertTriangle, Clock, Database, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditorStatusBarV2Props {
  connectionStatus: 'connected' | 'paused' | 'offline';
  dataTimestamp?: string;
  tileCount: number;
  activeTileCount?: number;
  maxTiles?: number;
  undoCount: number;
  redoCount: number;
  memoryBytes: number;
  memoryBudgetBytes?: number;
  memoryWarning?: boolean;
  className?: string;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function EditorStatusBarV2({
  connectionStatus,
  dataTimestamp = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  tileCount,
  activeTileCount,
  maxTiles = 24,
  undoCount,
  redoCount,
  memoryBytes,
  memoryBudgetBytes = 15 * 1024 * 1024,
  memoryWarning = false,
  className,
}: EditorStatusBarV2Props) {
  const isBudgetWarning = tileCount >= maxTiles - 4 && tileCount < maxTiles;
  const isBudgetFull = tileCount >= maxTiles;

  return (
    <footer
      data-testid="editor-status-bar"
      className={cn(
        'flex h-9 w-full flex-wrap items-center justify-between border-t border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#03100e)] px-4 text-xs text-[var(--color-text-muted,#789a95)] select-none',
        className,
      )}
    >
      {/* Links: Verbindungs- & Streaming-Status + Datenstand */}
      <div className="flex items-center gap-4">
        <div
          data-testid="connection-status"
          className="flex items-center gap-1.5"
          title={
            connectionStatus === 'connected'
              ? 'Supabase Realtime Stream aktiv'
              : connectionStatus === 'paused'
                ? 'Daten-Updates pausiert'
                : 'Offline'
          }
        >
          {connectionStatus === 'connected' && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium text-emerald-400">Live</span>
            </>
          )}
          {connectionStatus === 'paused' && (
            <>
              <PauseCircle className="h-3 w-3 text-amber-400" />
              <span className="font-medium text-amber-400">Pausiert</span>
            </>
          )}
          {connectionStatus === 'offline' && (
            <>
              <AlertTriangle className="h-3 w-3 text-rose-400" />
              <span className="font-medium text-rose-400">Getrennt</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1" data-testid="data-timestamp">
          <Clock className="h-3 w-3 text-[var(--color-text-muted)]" />
          <span>Datenstand: {dataTimestamp}</span>
        </div>
      </div>

      {/* Rechts: Kachelbudget + Undo/Redo & Speicher */}
      <div className="flex items-center gap-4">
        {/* Kachel-Budget */}
        <div
          data-testid="tile-budget-counter"
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-0.5 font-medium',
            isBudgetFull
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : isBudgetWarning
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-[var(--color-text-soft,#e6f3f1)]',
          )}
          title={`Maximal ${maxTiles} Kacheln pro Dashboard zulässig`}
        >
          <Database className="h-3 w-3" />
          <span>
            {activeTileCount !== undefined && activeTileCount !== tileCount
              ? `${activeTileCount} von ${tileCount} aktiv (max. ${maxTiles})`
              : `${tileCount} / ${maxTiles} Kacheln`}
          </span>
        </div>

        {/* Historie & Speicher-Budget */}
        <div
          data-testid="history-stats"
          className={cn('flex items-center gap-2', memoryWarning && 'text-amber-400 font-semibold')}
          title={`Speicherverbrauch des Verlaufs: ${formatByteSize(memoryBytes)} von max. ${formatByteSize(memoryBudgetBytes)}`}
        >
          <Activity className="h-3 w-3" />
          <span>
            {undoCount} {undoCount === 1 ? 'Schritt' : 'Schritte'}
            {redoCount > 0 ? ` (+${redoCount})` : ''} • {formatByteSize(memoryBytes)}
          </span>
          {memoryWarning && (
            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] text-amber-300">
              Budget &gt; 15 MB
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
