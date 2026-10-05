// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Bearbeitungsmodus mit Arbeitskopie. Kennt
// Supabase nicht: Die Speicherfunktion kommt von außen (Form von `useDashboardPreferences`).
// Kein Autosave. „Gespeichert“ erst nach Bestätigung, bei jedem Fehler bleibt der Entwurf, ein
// Konflikt überschreibt nichts still, und während des Speicherns sind alle Aktionen gesperrt.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCatalogEntry } from '../model/dashboardCatalog';
import {
  MAX_TILES,
  type DashboardConfig,
  type DashboardFilters,
  type DashboardTileConfig,
} from '../model/dashboardConfig';
import { validateDashboardConfig } from '../model/dashboardValidation';
import type { PreferencesState } from '../model/defaultDashboard';
import {
  addTile as addTileTo,
  isSameConfig,
  moveTile as moveTileIn,
  moveTileTo as moveTileToIn,
  removeTile as removeTileFrom,
  resetToDefault as defaultConfig,
  saveErrorMessage,
  setStartFilters as setFiltersOn,
  updateTile as updateTileIn,
  type EditResult,
  type NewTileInput,
  type TilePatch,
} from './dashboardEditorReducer';
import type { SaveResult } from './useDashboardPreferences';

export interface EditorPreferences {
  state: PreferencesState | null;
  isSaving: boolean;
  save: (config: DashboardConfig) => Promise<SaveResult>;
  reloadServerVersion: () => Promise<void>;
}

type SaveError = Extract<SaveResult, { ok: false }>['error'];

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'gespeichert' }
  | { kind: 'fehler'; message: string; error: SaveError };

/** Ansagetext mit Zähler: derselbe Text wird erneut vorgelesen, wenn `seq` wechselt. */
export interface Announcement {
  text: string;
  seq: number;
}

const BUSY: EditResult = { ok: false, reason: 'Gerade nicht möglich.' };

export function tileTitle(tile: DashboardTileConfig): string {
  // Nie die technische ID: ein bekannter, aber nicht freigegebener Eintrag nennt seinen Namen.
  return tile.title ?? getCatalogEntry(tile.catalogId)?.name ?? 'Nicht verfügbare Kachel';
}

export function useDashboardEditor(preferences: EditorPreferences) {
  const { state } = preferences;
  const [mode, setMode] = useState<'ansicht' | 'bearbeiten'>('ansicht');
  const [draft, setDraft] = useState<DashboardConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [conflict, setConflict] = useState(false);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [takeServer, setTakeServer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>({ text: '', seq: 0 });
  const [leaveRequest, setLeaveRequest] = useState<{ proceed: () => void } | null>(null);

  const draftRef = useRef<DashboardConfig | null>(null);
  const savingRef = useRef(false);
  const lockedRef = useRef(false);
  const mountedRef = useRef(true);
  lockedRef.current = preferences.isSaving || savingRef.current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const announce = useCallback((text: string) => {
    setAnnouncement((previous) => ({ text, seq: previous.seq + 1 }));
  }, []);

  const commit = useCallback((next: DashboardConfig | null) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const base = state?.config ?? null;
  const editing = mode === 'bearbeiten';
  const dirty = editing && draft !== null && base !== null && !isSameConfig(draft, base);
  const locked = preferences.isSaving || saving;
  const canStart = state !== null && state.canSave;

  const startEditing = useCallback(() => {
    if (!state || !state.canSave || lockedRef.current) return;
    commit(state.config);
    setMode('bearbeiten');
    setSaveStatus({ kind: 'idle' });
    setConflict(false);
    setServerLoaded(false);
    announce(
      'Bearbeitungsmodus. Du bearbeitest eine Arbeitskopie; gespeichert wird erst mit „Speichern“.',
    );
  }, [state, commit, announce]);

  const leaveEditing = useCallback(() => {
    commit(null);
    setMode('ansicht');
    setConflict(false);
    setServerLoaded(false);
  }, [commit]);

  const cancel = useCallback(() => {
    if (lockedRef.current || !draftRef.current) return;
    leaveEditing();
    setSaveStatus({ kind: 'idle' });
    announce('Änderungen verworfen. Die gespeicherte Ansicht ist wieder aktiv.');
  }, [leaveEditing, announce]);

  /** Wendet eine Änderung auf die Arbeitskopie an, sofern bearbeitet wird und nichts speichert. */
  const edit = useCallback(
    (
      change: (current: DashboardConfig) => EditResult,
      message: (config: DashboardConfig) => string,
    ) => {
      const current = draftRef.current;
      if (!current || lockedRef.current) return BUSY;
      const result = change(current);
      if (result.ok) {
        commit(result.config);
        announce(message(result.config));
      }
      return result;
    },
    [commit, announce],
  );

  const addTile = useCallback(
    (input: NewTileInput): EditResult =>
      edit(
        (config) => addTileTo(config, input),
        (config) => {
          const added = config.tiles[config.tiles.length - 1];
          return `${added ? tileTitle(added) : 'Kachel'} hinzugefügt. Sie steht an Position ${config.tiles.length} von ${config.tiles.length}.`;
        },
      ),
    [edit],
  );

  const updateTile = useCallback(
    (tileId: string, patch: TilePatch): EditResult =>
      edit(
        (config) => updateTileIn(config, tileId, patch),
        (config) => {
          const changed = config.tiles.find((tile) => tile.tileId === tileId);
          return `${changed ? tileTitle(changed) : 'Kachel'} geändert.`;
        },
      ),
    [edit],
  );

  const removeTile = useCallback(
    (tileId: string): void => {
      const current = draftRef.current;
      const removed = current?.tiles.find((tile) => tile.tileId === tileId);
      if (!removed) return;
      edit(
        (config) => ({ ok: true, config: removeTileFrom(config, tileId) }),
        () => `${tileTitle(removed)} entfernt.`,
      );
    },
    [edit],
  );

  const moveWith = useCallback(
    (tileId: string, move: (config: DashboardConfig) => DashboardConfig): void => {
      const current = draftRef.current;
      if (!current || lockedRef.current) return;
      const next = move(current);
      if (next === current) return;
      commit(next);
      const index = next.tiles.findIndex((tile) => tile.tileId === tileId);
      const moved = next.tiles[index];
      if (moved)
        announce(
          `${tileTitle(moved)} steht jetzt an Position ${index + 1} von ${next.tiles.length}.`,
        );
    },
    [commit, announce],
  );

  const moveTile = useCallback(
    (tileId: string, direction: 'hoch' | 'runter'): void =>
      moveWith(tileId, (config) => moveTileIn(config, tileId, direction)),
    [moveWith],
  );

  const moveTileTo = useCallback(
    (tileId: string, toIndex: number): void =>
      moveWith(tileId, (config) => moveTileToIn(config, tileId, toIndex)),
    [moveWith],
  );

  const resetToDefault = useCallback((): void => {
    if (!draftRef.current || lockedRef.current) return;
    commit(defaultConfig());
    announce('Auf Standard zurückgesetzt. Die Änderung gilt erst nach „Speichern“.');
  }, [commit, announce]);

  const setStartFilters = useCallback(
    (filters?: DashboardFilters): EditResult =>
      edit(
        (config) => setFiltersOn(config, filters),
        () => (filters ? 'Startfilter übernommen.' : 'Startfilter entfernt.'),
      ),
    [edit],
  );

  const save = useCallback(async (): Promise<boolean> => {
    const current = draftRef.current;
    if (!current || lockedRef.current) return false;
    const check = validateDashboardConfig(current);
    if (!check.ok) {
      const error: SaveError = { kind: 'ungueltig', detail: '' };
      const message = saveErrorMessage(error);
      setSaveStatus({ kind: 'fehler', message, error });
      announce(message);
      return false;
    }
    savingRef.current = true;
    lockedRef.current = true;
    setSaving(true);
    setSaveStatus({ kind: 'idle' });
    try {
      const result = await preferences.save(current);
      if (!mountedRef.current) return false;
      if (result.ok) {
        leaveEditing();
        setSaveStatus({ kind: 'gespeichert' });
        announce('Gespeichert.');
        return true;
      }
      const message = saveErrorMessage(result.error);
      setSaveStatus({ kind: 'fehler', message, error: result.error });
      setConflict(result.error.kind === 'konflikt');
      // Ein weiterer Konflikt meint eine noch neuere Fassung: erneutes Laden muss möglich sein.
      if (result.error.kind === 'konflikt') setServerLoaded(false);
      announce(message);
      return false;
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }, [preferences, leaveEditing, announce]);

  const loadServerVersion = useCallback(async (): Promise<void> => {
    if (lockedRef.current) return;
    await preferences.reloadServerVersion();
    if (!mountedRef.current) return;
    setServerLoaded(true);
    announce('Aktuelle Serveransicht geladen. Dein Entwurf bleibt erhalten.');
  }, [preferences, announce]);

  const takeServerVersion = useCallback(async (): Promise<void> => {
    if (lockedRef.current) return;
    await preferences.reloadServerVersion();
    // Einen Takt warten: Die Abfrage meldet die neue Serverfassung erst danach an die Ansicht.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (mountedRef.current) setTakeServer(true);
  }, [preferences]);

  // Nach dem Laden der Serverfassung ersetzt sie die Arbeitskopie (Entwurf wird bewusst verworfen).
  useEffect(() => {
    if (!takeServer || !state) return;
    commit(state.config);
    setTakeServer(false);
    setConflict(false);
    setServerLoaded(false);
    setSaveStatus({ kind: 'idle' });
    announce('Serverfassung übernommen. Dein Entwurf wurde verworfen.');
  }, [takeServer, state, commit, announce]);

  const requestLeave = useCallback(
    (proceed: () => void): void => {
      if (lockedRef.current) return;
      if (!dirty) proceed();
      else setLeaveRequest({ proceed });
    },
    [dirty],
  );

  const leaveStay = useCallback(() => {
    // Während des Speicherns läuft `leaveSave` weiter und würde trotzdem navigieren.
    if (lockedRef.current) return;
    setLeaveRequest(null);
  }, []);

  const leaveDiscard = useCallback(() => {
    if (lockedRef.current || !leaveRequest) return;
    const { proceed } = leaveRequest;
    setLeaveRequest(null);
    leaveEditing();
    setSaveStatus({ kind: 'idle' });
    proceed();
  }, [leaveRequest, leaveEditing]);

  const leaveSave = useCallback(async (): Promise<void> => {
    if (!leaveRequest) return;
    const { proceed } = leaveRequest;
    if (await save()) {
      setLeaveRequest(null);
      proceed();
    }
  }, [leaveRequest, save]);

  // Browser-Warnung beim Schließen oder Neuladen, nur solange Änderungen offen sind.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return {
    mode,
    draft,
    dirty,
    locked,
    canStart,
    atMax: draft !== null && draft.tiles.length >= MAX_TILES,
    saveStatus,
    conflict,
    serverLoaded,
    announcement,
    leaveRequest,
    startEditing,
    cancel,
    addTile,
    updateTile,
    removeTile,
    moveTile,
    moveTileTo,
    resetToDefault,
    setStartFilters,
    save,
    loadServerVersion,
    takeServerVersion,
    requestLeave,
    leaveSave,
    leaveDiscard,
    leaveStay,
  };
}
