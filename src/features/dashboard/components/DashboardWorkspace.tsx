// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Arbeitsbereich. Verbindet Speicherzustand,
// Bearbeitungsmodus, Filter, Raster und Konfigurationsfenster. Kennt weder Supabase noch den
// Router: Verlassen läuft über `requestLeave`, die Router-Anbindung folgt mit Teilauftrag 7.
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  DashboardFilters as FilterValues,
  DashboardTileConfig,
} from '../model/dashboardConfig';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { activeEntryOf } from '../hooks/dashboardEditorReducer';
import { useDashboardEditor, type EditorPreferences } from '../hooks/useDashboardEditor';
import type { ChartLoaders } from './charts/chartLoaders';
import { DashboardFilters } from './DashboardFilters';
import { DashboardGrid, EMPTY_FOCUS, type FocusRequest } from './DashboardGrid';
import { EditorToolbar } from './EditorToolbar';
import type { TileDataHook } from './LazyDashboardTile';
import type { TileConfiguratorProps } from './TileConfigurator';
import { UnsavedChangesDialog, useEscapeToClose } from './UnsavedChangesDialog';

export interface WorkspacePreferences extends EditorPreferences {
  status: 'keine_sitzung' | 'laden' | 'bereit' | 'fehler';
}

type ConfiguratorModule = { default: ComponentType<TileConfiguratorProps> };

export interface DashboardWorkspaceProps {
  preferences: WorkspacePreferences;
  useData: TileDataHook;
  chartLoaders?: ChartLoaders;
  /** Fehlt sie, erscheint ein Hinweis, dass die Detailansicht mit Teilauftrag 7 folgt. */
  onShowDetails?: (tileId: string) => void;
  /** Seite neu laden; Standard `window.location.reload()`. */
  onReload?: () => void;
  onTileActivated?: (tileId: string) => void;
  /** Meldet die aktuell dargestellten Kachel-IDs (Ansicht oder Entwurf), z. B. für Diagnoseanzeigen. */
  onShownTilesChange?: (tileIds: readonly string[]) => void;
  /** Nur für Tests: Nachladefunktion des Konfigurationsfensters. */
  configuratorLoader?: () => Promise<ConfiguratorModule>;
}

const loadConfigurator = () => import('./TileConfigurator');

/** Modale Hülle für Lade- und Fehlerzustand: Der übrige Arbeitsbereich ist währenddessen gesperrt. */
function ConfiguratorShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEscapeToClose(true, onClose);
  return (
    <Modal open onClose={onClose} title="Kachel konfigurieren" maxWidth="600px">
      {children}
    </Modal>
  );
}

class ConfiguratorBoundary extends Component<
  { onRetry: () => void; onClose: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ConfiguratorShell onClose={this.props.onClose}>
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <span>Das Konfigurationsfenster konnte nicht geladen werden.</span>
          {/* Der Browser hält den fehlgeschlagenen Abruf fest: neu laden (mit Rückfrage bei Entwurf). */}
          <Button size="sm" onClick={this.props.onRetry}>
            Seite neu laden
          </Button>
          <Button size="sm" variant="secondary" onClick={this.props.onClose}>
            Schließen
          </Button>
        </div>
      </ConfiguratorShell>
    );
  }
}

type Target = { tile?: DashboardTileConfig } | null;

export function DashboardWorkspace(props: DashboardWorkspaceProps) {
  const { preferences, useData } = props;
  const editor = useDashboardEditor(preferences);
  const state = preferences.state;
  const reload = props.onReload ?? (() => window.location.reload());
  const [session, setSession] = useState<{ value: FilterValues | undefined } | null>(null);
  const [target, setTarget] = useState<Target>(null);
  // Zähler statt Flag: jeder Klick wechselt die Ansage, auch ohne sichtbare Änderung.
  const [detailsClicks, setDetailsClicks] = useState(0);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusSeq = useRef(0);
  // Auslöser des Konfigurationsfensters: Bei langsamem Nachladen wechselt die Hülle ihr Fenster, der
  // Fokus muss danach trotzdem zum Auslöser zurück (außer eine Aktion setzt ein eigenes Fokusziel).
  const opener = useRef<{ element: Element | null; seq: number } | null>(null);
  const isOpen = target !== null;
  useEffect(() => {
    if (isOpen) {
      opener.current = { element: document.activeElement, seq: focusSeq.current };
      return;
    }
    const last = opener.current;
    opener.current = null;
    if (last && last.seq === focusSeq.current && last.element instanceof HTMLElement) {
      if (last.element.isConnected) last.element.focus();
    }
  }, [isOpen]);
  const loader = props.configuratorLoader ?? loadConfigurator;
  const Configurator = useMemo(() => lazy(loader), [loader]);

  const editing = editor.mode === 'bearbeiten';
  const shown = editing ? editor.draft : (state?.config ?? null);
  const ready = preferences.status === 'bereit' && shown !== null;
  const tiles = shown?.tiles ?? DEFAULT_DASHBOARD_CONFIG.tiles;
  // Der Start-Sitzungsfilter kommt aus der gespeicherten Fassung, nie aus dem Entwurf: Änderungen
  // am Entwurf (Startfilter entfernen, Standard) wirken erst nach „Speichern“.
  const filters = session ? session.value : state?.config.filters;
  const pipelineSupported = tiles.some((tile) => activeEntryOf(tile)?.filters.includes('pipeline'));
  const unavailable = state?.kind === 'gespeichert' ? state.unavailable.length : 0;
  const skeletonRef = useRef<HTMLDivElement | null>(null);
  const { onShownTilesChange } = props;
  useEffect(() => {
    onShownTilesChange?.(tiles.map((tile) => tile.tileId));
  }, [tiles, onShownTilesChange]);

  useEffect(() => {
    if (!ready) skeletonRef.current?.setAttribute('inert', '');
    else skeletonRef.current?.removeAttribute('inert');
  });

  const focus = (tileId: string, action: FocusRequest['action']) => {
    focusSeq.current += 1;
    setFocusRequest({ id: focusSeq.current, tileId, action });
  };

  const move = (tileId: string, direction: 'hoch' | 'runter') => {
    editor.moveTile(tileId, direction);
    focus(tileId, direction);
  };
  const remove = (tileId: string) => {
    const list = editor.draft?.tiles ?? [];
    const index = list.findIndex((tile) => tile.tileId === tileId);
    const next = list[index + 1] ?? list[index - 1];
    editor.removeTile(tileId);
    focus(next ? next.tileId : EMPTY_FOCUS, 'kachel');
  };
  const submit: TileConfiguratorProps['onSubmit'] = (values) => {
    const tile = target?.tile;
    if (tile) {
      // Geleerte Felder ausdrücklich als `undefined`, sonst bliebe der alte Titel oder die Pipeline.
      return editor.updateTile(tile.tileId, {
        view: values.view,
        size: values.size,
        filterMode: values.filterMode,
        title: values.title,
        pipeline: values.pipeline,
      });
    }
    const result = editor.addTile(values);
    if (result.ok && result.tileId) focus(result.tileId, 'kachel');
    return result;
  };

  const blocked =
    state?.kind === 'zukuenftige_version'
      ? 'Deine Ansicht stammt aus einer neueren Version des Dashboards. Bearbeiten ist gesperrt, damit nichts überschrieben wird.'
      : undefined;
  const leaveError = editor.saveStatus.kind === 'fehler' ? editor.saveStatus.message : undefined;

  if (preferences.status === 'keine_sitzung') {
    return (
      <p data-testid="dashboard-no-session" className="text-sm">
        Bitte melde dich an, um dein Dashboard zu sehen.
      </p>
    );
  }
  if (preferences.status === 'fehler') {
    return (
      <div
        role="alert"
        data-testid="dashboard-error"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <span>Dein Dashboard konnte nicht geladen werden.</span>
        <Button size="sm" onClick={reload}>
          Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-workspace" aria-busy={!ready} className="flex flex-col gap-4">
      <EditorToolbar
        editing={editing}
        canStart={editor.canStart}
        startBlockedReason={blocked}
        dirty={editor.dirty}
        locked={editor.locked}
        atMax={editor.atMax}
        saveStatus={editor.saveStatus}
        conflict={editor.conflict}
        serverLoaded={editor.serverLoaded}
        announcement={editor.announcement}
        onStart={editor.startEditing}
        onCancel={editor.cancel}
        onSave={() => void editor.save()}
        onAdd={() => setTarget({})}
        onReset={editor.resetToDefault}
        onLoadServer={() => void editor.loadServerVersion()}
        onTakeServer={() => void editor.takeServerVersion()}
      />
      <div className="min-h-[20px] text-[13px] text-[var(--color-text-muted)]">
        {!ready ? (
          <p role="status" className="m-0">
            Dein Dashboard wird geladen …
          </p>
        ) : null}
        {state?.kind === 'ungueltig' ? (
          <p className="m-0">
            Deine gespeicherte Ansicht war ungültig. Es wird die Standardansicht gezeigt; beim
            Speichern wird sie ersetzt.
          </p>
        ) : null}
        {unavailable > 0 ? (
          <p className="m-0">
            {unavailable === 1 ? '1 Kachel ist' : `${unavailable} Kacheln sind`} in dieser Version
            nicht verfügbar und bleiben gespeichert.
          </p>
        ) : null}
        {detailsClicks > 0 ? (
          <p role="status" className="m-0">
            Die Detailansicht folgt mit Teilauftrag 7.
            {detailsClicks % 2 ? '' : '\u200B'}
          </p>
        ) : null}
      </div>
      {ready ? (
        <DashboardFilters
          value={filters}
          startFilters={shown?.filters}
          editing={editing}
          locked={editor.locked}
          pipelineSupported={pipelineSupported}
          onApply={(value) => setSession({ value })}
          onStartFilters={(value) => void editor.setStartFilters(value)}
        />
      ) : null}
      <div ref={skeletonRef} aria-hidden={!ready || undefined}>
        <DashboardGrid
          tiles={tiles}
          filters={filters}
          editing={editing && ready}
          locked={editor.locked}
          useData={useData}
          chartLoaders={props.chartLoaders}
          suspended={!ready}
          focusRequest={focusRequest}
          onShowDetails={props.onShowDetails ?? (() => setDetailsClicks((n) => n + 1))}
          onRetryChartLoad={() => editor.requestLeave(reload)}
          onTileActivated={props.onTileActivated}
          onMove={move}
          onMoveTo={editor.moveTileTo}
          onEdit={(tileId) => setTarget({ tile: tiles.find((tile) => tile.tileId === tileId) })}
          onRemove={remove}
          onAdd={() => setTarget({})}
          onReset={editor.resetToDefault}
        />
      </div>
      {target ? (
        <ConfiguratorBoundary
          onRetry={() => editor.requestLeave(reload)}
          onClose={() => setTarget(null)}
        >
          <Suspense
            fallback={
              <ConfiguratorShell onClose={() => setTarget(null)}>
                <p role="status" className="m-0 text-sm">
                  Konfigurationsfenster wird geladen …
                </p>
              </ConfiguratorShell>
            }
          >
            <Configurator
              open
              tile={target.tile}
              useData={useData}
              filters={filters}
              onSubmit={submit}
              onClose={() => setTarget(null)}
            />
          </Suspense>
        </ConfiguratorBoundary>
      ) : null}
      <UnsavedChangesDialog
        open={editor.leaveRequest !== null}
        locked={editor.locked}
        errorMessage={leaveError}
        onSave={() => void editor.leaveSave()}
        onDiscard={editor.leaveDiscard}
        onStay={editor.leaveStay}
      />
    </div>
  );
}
