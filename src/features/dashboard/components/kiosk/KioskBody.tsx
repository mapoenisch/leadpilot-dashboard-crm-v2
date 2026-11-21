// Auftrag 171 (P15a): Darstellung innerhalb der Kiosk-Hülle (Statusleiste, Hinweise, Raster).
// Liegt innerhalb des TimeControlProviders, damit der ehrliche Live-Status (Auftrag 159)
// Verbindung und Datenstand aus denselben Quellen liest wie der Editor.
import { useEffect, useMemo, useState } from 'react';
import type { BreakpointKey, DashboardTileConfigV2 } from '../../model/dashboardConfigV2';
import type { StoredDashboardV2Row } from '../../services/dashboardStorageV2Types';
import type { KioskRotation } from '../../hooks/useKioskRotation';
import { useEditorLiveStatus } from '../../time/useEditorLiveStatus';
import { SectionedCanvasV2 } from '../editor/sections/SectionedCanvasV2';
import type { KioskShellProps } from './KioskShell';
import { KioskStatusBar } from './KioskStatusBar';
import { KioskOfflineBanner, KioskSkippedNotice } from './KioskNotices';
import { offlineMessage } from './kioskData';

export interface KioskBodyProps extends KioskShellProps {
  listStatus: 'laden' | 'fehler' | 'bereit';
  onRetryList: () => void;
  /** Konfiguration des aktuellen Dashboards konnte technisch nicht geladen werden. */
  loadFailed: boolean;
  onRetryLoad: () => void;
  dashboard: StoredDashboardV2Row | null;
  isLoadingCurrent: boolean;
  position: number;
  total: number;
  skippedCount: number;
  rotation: KioskRotation;
}

const NOOP = () => {};
const NEVER_COLLAPSED = () => false;

function breakpointFor(width: number): BreakpointKey {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

function useBreakpoint(): BreakpointKey {
  const [bp, setBp] = useState<BreakpointKey>(() =>
    breakpointFor(typeof window === 'undefined' ? 1440 : window.innerWidth),
  );
  useEffect(() => {
    const onResize = () => setBp(breakpointFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, select, textarea, [role="button"]'));
}

/** Leertaste pausiert/setzt fort, Pfeiltasten blättern; jede andere Taste zählt als Bedienung. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.getAttribute('role') === 'slider'
  );
}

function useKioskKeyboard(rotation: KioskRotation) {
  const { togglePause, next, previous, noteInteraction } = rotation;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Auftrag 172 (P15b §2.3 Nr. 10): Druck aus dem Kiosk ist deaktiviert.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        return;
      }
      if (event.key === ' ' || event.code === 'Space') {
        if (isInteractiveTarget(event.target)) return; // Schaltfläche löst selbst aus
        event.preventDefault();
        togglePause();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        // Diagramm-/Eingabesteuerung behandelt Pfeiltasten selbst (preventDefault): nicht blättern.
        if (event.defaultPrevented || isEditableTarget(event.target)) {
          noteInteraction();
          return;
        }
        if (event.key === 'ArrowRight') next();
        else previous();
      } else if (event.key !== 'Tab') {
        // Tab zählt erst, wenn wirklich ein Bedienelement den Fokus bekommt (onFocus am Container).
        noteInteraction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePause, next, previous, noteInteraction]);
}

function useFullscreen() {
  const supported =
    typeof document !== 'undefined' &&
    Boolean(document.fullscreenEnabled) &&
    'requestFullscreen' in document.documentElement;
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  // Rückfall ohne Fullscreen-API: die Ansicht ist bereits ohne Menüs.
  const request = supported
    ? () => {
        void document.documentElement.requestFullscreen().catch(() => {});
      }
    : undefined;
  return { isFullscreen, request };
}

const NO_TILES: DashboardTileConfigV2[] = [];

export function KioskBody(props: KioskBodyProps) {
  const { dashboard, rotation, online, onDataAsOf } = props;
  const breakpoint = useBreakpoint();
  const fullscreen = useFullscreen();
  useKioskKeyboard(rotation);

  // Kiosk klappt alle Sektionen auf: Status über alle Kacheln, die tatsächlich sichtbar sind.
  const tiles = dashboard?.config.tiles ?? NO_TILES;
  const liveStatus = useEditorLiveStatus({
    tiles,
    defaultPipeline: dashboard?.config.globalPipeline,
    store: props.liveStore,
    configured: props.liveConfigured,
  });

  useEffect(() => {
    if (liveStatus.dataAsOf) onDataAsOf?.(liveStatus.dataAsOf);
  }, [liveStatus.dataAsOf, onDataAsOf]);

  // Kiosk: Sektionen nie eingeklappt, damit alle Inhalte sichtbar sind.
  const config = useMemo(
    () =>
      dashboard
        ? {
            ...dashboard.config,
            sections: dashboard.config.sections?.map((s) => ({ ...s, collapsed: false })),
          }
        : null,
    [dashboard],
  );

  return (
    <div
      data-testid="kiosk-root"
      data-dashboard-id={dashboard?.id ?? ''}
      data-paused={String(rotation.isPaused)}
      className="kiosk-root flex h-screen w-full flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]"
      onPointerDown={rotation.noteInteraction}
      onWheel={rotation.noteInteraction}
      // Tastaturfokus (Tab) ist Bedienung: die Rotation pausiert für ein ruhiges Intervall.
      onFocusCapture={rotation.noteInteraction}
    >
      <KioskStatusBar
        title={dashboard?.title ?? 'Kiosk'}
        position={props.position}
        total={props.total}
        dataAsOf={liveStatus.dataAsOf}
        connection={liveStatus.connection}
        offlineSince={online.offlineSince}
        isPaused={rotation.isPaused}
        pauseReason={rotation.pauseReason}
        intervalSec={props.intervalSec}
        onTogglePause={rotation.togglePause}
        onNext={rotation.next}
        onPrevious={rotation.previous}
        theme={props.theme}
        onToggleTheme={props.onToggleTheme}
        onFullscreen={fullscreen.request}
        isFullscreen={fullscreen.isFullscreen}
        exitHref={props.exitHref}
        onExit={props.onExit}
        alarmSlot={props.alarmSlot}
      />
      {online.offlineSince && <KioskOfflineBanner message={offlineMessage(online.offlineSince)} />}
      <KioskSkippedNotice count={props.skippedCount} />

      {config ? (
        <div className="kiosk-canvas flex min-h-0 flex-1 flex-col">
          <SectionedCanvasV2
            key={config.id}
            config={config}
            activeBreakpoint={breakpoint}
            selectedTileId={null}
            onSelectTile={NOOP}
            onDeselect={NOOP}
            onRemoveTile={NOOP}
            onDuplicateTile={NOOP}
            isPreviewMode
            isSectionCollapsed={NEVER_COLLAPSED}
            useData={props.useData}
          />
        </div>
      ) : (
        <KioskPlaceholder {...props} />
      )}
    </div>
  );
}

function KioskPlaceholder(props: KioskBodyProps) {
  const text =
    props.listStatus === 'fehler'
      ? 'Die Dashboards konnten nicht geladen werden.'
      : props.loadFailed
        ? 'Das Dashboard konnte nicht geladen werden.'
        : props.listStatus === 'laden' || props.isLoadingCurrent
          ? 'Dashboard wird geladen …'
          : props.total === 0
            ? 'Kein lesbares Dashboard für den Kiosk ausgewählt.'
            : props.online.online
              ? 'Dashboard wird geladen …'
              : 'Dashboard ist offline nicht verfügbar.';
  return (
    <div
      data-testid="kiosk-placeholder"
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-[var(--kiosk-text-small)] text-[var(--color-text-muted)]"
    >
      <p className="m-0">{text}</p>
      {(props.listStatus === 'fehler' || props.loadFailed) && (
        <button
          type="button"
          data-testid="kiosk-retry"
          onClick={props.listStatus === 'fehler' ? props.onRetryList : props.onRetryLoad}
          className="min-h-[44px] rounded-md border border-[var(--color-border)] bg-transparent px-4 text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
