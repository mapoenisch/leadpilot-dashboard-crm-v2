// Auftrag 171 (P15a §2.1 Nr. 2/3/5/7): schmale Statusleiste des Kiosks.
// Dashboard-Name, Position in der Rotation, Datenstand, Verbindung, Pause/Weiter, Theme, Vollbild.
// Statuswechsel laufen über eine `aria-live`-Region (§2.3 Nr. 15).
import type { ReactNode } from 'react';
import { ChevronRight, Moon, Pause, Play, Square, Sun, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorLiveConnection } from '../../time/useEditorLiveStatus';
import type { KioskPauseReason } from '../../hooks/useKioskRotation';
import { formatKioskTime, type KioskTheme } from '../../model/kioskParams';

export interface KioskStatusBarProps {
  title: string;
  position: number;
  total: number;
  dataAsOf: string | null;
  connection: EditorLiveConnection;
  offlineSince: string | null;
  isPaused: boolean;
  pauseReason: KioskPauseReason;
  intervalSec: number;
  onTogglePause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  theme: KioskTheme;
  onToggleTheme: () => void;
  onFullscreen?: () => void;
  isFullscreen: boolean;
  exitHref: string;
  onExit: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  alarmSlot?: ReactNode;
}

const CONNECTION_TEXT: Record<EditorLiveConnection, string> = {
  nicht_konfiguriert: 'Live-Daten nicht konfiguriert',
  kein_live_inhalt: 'Keine Live-Kacheln',
  verbindet: 'Verbindet …',
  verbunden: 'Live verbunden',
  wiederverbinden: 'Verbindung wird wiederhergestellt',
  offline: 'Live getrennt',
};

function pauseText(reason: KioskPauseReason, intervalSec: number, total: number): string {
  if (total <= 1) return 'Keine Rotation';
  switch (reason) {
    case 'manuell':
      return 'Rotation pausiert';
    case 'interaktion':
      return 'Rotation pausiert (Bedienung)';
    case 'offline':
      return 'Rotation pausiert (offline)';
    case 'laden':
      return 'Rotation wartet (lädt)';
    default:
      return `Wechsel alle ${intervalSec} s`;
  }
}

const BUTTON =
  'inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent px-2.5 text-[var(--kiosk-text-small)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';

export function KioskStatusBar(props: KioskStatusBarProps) {
  const {
    title,
    position,
    total,
    dataAsOf,
    connection,
    offlineSince,
    isPaused,
    pauseReason,
    intervalSec,
    theme,
  } = props;
  const stand = formatKioskTime(dataAsOf);
  const offline = offlineSince !== null;
  const statusText = offline
    ? `Offline seit ${formatKioskTime(offlineSince)} – Daten werden nicht aktualisiert`
    : CONNECTION_TEXT[connection];

  return (
    <header
      data-testid="kiosk-status-bar"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[var(--kiosk-text-small)] text-[var(--color-text-muted)]"
    >
      <h1
        data-testid="kiosk-title"
        className="m-0 min-w-0 truncate text-[var(--kiosk-text-title)] font-semibold text-[var(--color-text)]"
      >
        {title}
      </h1>
      {total > 1 && (
        <span data-testid="kiosk-position">
          {position} / {total}
        </span>
      )}
      <span data-testid="kiosk-data-as-of">Datenstand {stand ? `${stand} Uhr` : 'unbekannt'}</span>
      <span
        data-testid="kiosk-connection"
        data-offline={String(offline)}
        className={cn(
          offline &&
            'rounded-md border border-[var(--color-warning)] px-2 py-0.5 font-semibold text-[var(--color-text)]',
        )}
      >
        {offline ? 'Offline' : statusText}
      </span>
      <p role="status" aria-live="polite" data-testid="kiosk-live-region" className="sr-only">
        {`${title}. ${statusText}. ${pauseText(pauseReason, intervalSec, total)}.`}
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {props.alarmSlot}
        <span data-testid="kiosk-rotation-state">{pauseText(pauseReason, intervalSec, total)}</span>
        {total > 1 && (
          <>
            <button
              type="button"
              className={BUTTON}
              onClick={props.onPrevious}
              aria-label="Vorheriges Dashboard"
            >
              <ChevronRight size={18} aria-hidden="true" className="rotate-180" />
            </button>
            <button
              type="button"
              data-testid="kiosk-pause-button"
              className={BUTTON}
              onClick={props.onTogglePause}
              aria-pressed={pauseReason === 'manuell'}
              aria-keyshortcuts="Space"
            >
              {isPaused && pauseReason === 'manuell' ? (
                <Play size={18} aria-hidden="true" />
              ) : (
                <Pause size={18} aria-hidden="true" />
              )}
              <span>{pauseReason === 'manuell' ? 'Weiter' : 'Pause'}</span>
            </button>
            <button
              type="button"
              className={BUTTON}
              onClick={props.onNext}
              aria-label="Nächstes Dashboard"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </>
        )}
        <button
          type="button"
          data-testid="kiosk-theme-button"
          className={BUTTON}
          onClick={props.onToggleTheme}
          aria-label={
            theme === 'dark' ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'
          }
        >
          {theme === 'dark' ? (
            <Sun size={18} aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </button>
        {props.onFullscreen && !props.isFullscreen && (
          <button
            type="button"
            data-testid="kiosk-fullscreen-button"
            className={BUTTON}
            onClick={props.onFullscreen}
          >
            <Square size={18} aria-hidden="true" />
            <span>Vollbild</span>
          </button>
        )}
        <a href={props.exitHref} data-testid="kiosk-exit" className={BUTTON} onClick={props.onExit}>
          <X size={18} aria-hidden="true" />
          <span>Kiosk beenden</span>
        </a>
      </div>
    </header>
  );
}
