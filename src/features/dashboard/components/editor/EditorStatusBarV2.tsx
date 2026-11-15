// Executive Dashboard V2 (Auftrag 148 / P05, Auftrag 159 / P10a):
// Statusleiste des V2-Dashboard-Editors.
// Zeigt drei getrennte Live-Angaben (Verbindung, letzte neue Daten, Datenstand), Kachelbudget
// (max 24) und Verlauf-/Speichermonitoring (15 MiB Soft-Limit). Alle Angaben stammen aus echten
// Quellen; ohne Live-Feed steht hier nie „Live“.

import { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Clock, Database, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorLiveStatus } from '../../time/useEditorLiveStatus';

export interface EditorStatusBarV2Props {
  liveStatus: EditorLiveStatus;
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

const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export function formatStatusTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : timeFormat.format(date);
}

const CONNECTION_TEXT: Record<EditorLiveStatus['connection'], string> = {
  nicht_konfiguriert: 'Nicht konfiguriert',
  kein_live_inhalt: 'Kein Live-Inhalt',
  verbindet: 'Verbinde…',
  verbunden: 'Verbunden',
  wiederverbinden: 'Verbinde neu…',
  offline: 'Getrennt',
};

const CONNECTION_ANNOUNCEMENT: Partial<Record<EditorLiveStatus['connection'], string>> = {
  verbunden: 'Live-Verbindung hergestellt.',
  wiederverbinden: 'Live-Verbindung unterbrochen, verbinde neu.',
  offline: 'Live-Verbindung getrennt.',
  nicht_konfiguriert: 'Live-Feed ist nicht konfiguriert.',
};

const CONNECTION_COLOR: Record<EditorLiveStatus['connection'], string> = {
  nicht_konfiguriert: 'text-[var(--color-text-muted,#789a95)]',
  kein_live_inhalt: 'text-[var(--color-text-muted,#789a95)]',
  verbindet: 'text-amber-400',
  verbunden: 'text-emerald-400',
  wiederverbinden: 'text-amber-400',
  offline: 'text-rose-400',
};

export function EditorStatusBarV2({
  liveStatus,
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

  const pausedAt = formatStatusTime(liveStatus.pausedSince);
  const lastEvent = formatStatusTime(liveStatus.lastEventAt);
  const dataStand = formatStatusTime(liveStatus.dataAsOf);

  // Ansagen nur bei Wechsel der Verbindung und bei Pause/Fortsetzen, nicht bei jedem Ereignis.
  const [announcement, setAnnouncement] = useState('');
  const previousConnection = useRef<EditorLiveStatus['connection'] | null>(null);
  const previousPaused = useRef<boolean>(liveStatus.pausedSince !== null);

  useEffect(() => {
    if (previousConnection.current === null) {
      previousConnection.current = liveStatus.connection;
      return;
    }
    if (previousConnection.current !== liveStatus.connection) {
      previousConnection.current = liveStatus.connection;
      const text = CONNECTION_ANNOUNCEMENT[liveStatus.connection];
      if (text) setAnnouncement(text);
    }
  }, [liveStatus.connection]);

  useEffect(() => {
    const paused = liveStatus.pausedSince !== null;
    if (previousPaused.current === paused) return;
    previousPaused.current = paused;
    if (paused) {
      setAnnouncement(pausedAt ? `Anzeige angehalten um ${pausedAt}.` : 'Anzeige angehalten.');
    } else {
      setAnnouncement('Anzeige fortgesetzt.');
    }
  }, [liveStatus.pausedSince, pausedAt]);

  return (
    <footer
      data-testid="editor-status-bar"
      className={cn(
        'flex h-9 w-full flex-wrap items-center justify-between border-t border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#03100e)] px-4 text-xs text-[var(--color-text-muted,#789a95)] select-none',
        className,
      )}
    >
      <p role="status" className="sr-only" data-testid="live-status-announcement">
        {announcement}
      </p>

      {/* Links: drei getrennte Angaben aus echten Quellen */}
      <div className="flex min-w-0 items-center gap-4">
        <div
          data-testid="connection-status"
          data-connection={liveStatus.connection}
          className={cn('flex items-center gap-1.5', CONNECTION_COLOR[liveStatus.connection])}
          title="Zustand des Live-Feed-Kanals (nicht der Datenstand)"
        >
          {liveStatus.connection === 'verbunden' && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          {liveStatus.connection === 'wiederverbinden' && (
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          )}
          {liveStatus.connection === 'offline' && (
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          )}
          {liveStatus.connection === 'nicht_konfiguriert' && (
            <span className="h-2 w-2 rounded-full border border-current" aria-hidden="true" />
          )}
          <span className="font-medium">{CONNECTION_TEXT[liveStatus.connection]}</span>
        </div>

        <div className="flex min-w-0 items-center gap-1" data-testid="live-last-event">
          <Activity className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {lastEvent ? `Letzte neue Daten: ${lastEvent}` : 'Noch keine Daten empfangen'}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1" data-testid="data-timestamp">
          {liveStatus.pausedSince ? (
            <PauseCircle className="h-3 w-3 shrink-0 text-amber-400" aria-hidden="true" />
          ) : (
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">
            {liveStatus.pausedSince
              ? pausedAt
                ? `Angehalten seit ${pausedAt}`
                : 'Angehalten'
              : dataStand
                ? `Datenstand: ${dataStand}`
                : 'Kein aktueller Datenstand'}
          </span>
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
          <Database className="h-3 w-3" aria-hidden="true" />
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
          <Activity className="h-3 w-3" aria-hidden="true" />
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
