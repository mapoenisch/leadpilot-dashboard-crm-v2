// Executive Dashboard V2 (Auftrag 147 / P04):
// React Hook für den entkoppelten V2-Dashboard-Editor.
// Bindet DashboardEditorCore an, integriert Transaktions- und Eingabebündelung
// und sichert ungespeicherte Entwürfe per In-App- und Browser-Navigationsschutz ab.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardEditorCore, type HistoryStats } from '../core/dashboardEditorCore';
import type { EditorCommand } from '../core/editorCommands';
import type {
  BreakpointKey,
  DashboardConfigV2,
  DashboardDraftState,
} from '../model/dashboardConfigV2';
import { useInAppLinkGuard } from './useInAppLinkGuard';
import { useLeaveGuard } from './useLeaveGuard';

export interface UseDashboardEditorV2Options {
  initialConfig: DashboardConfigV2;
  onSave?: (config: DashboardConfigV2) => Promise<boolean>;
  onNavigate?: (to: string) => void;
}

export function useDashboardEditorV2(options: UseDashboardEditorV2Options) {
  const { initialConfig, onSave, onNavigate } = options;

  // Editor-Kern als stabile Instanz halten
  const coreRef = useRef<DashboardEditorCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new DashboardEditorCore(initialConfig);
  }
  const core = coreRef.current;

  const [state, setState] = useState<DashboardDraftState>(() => core.getState());
  const [stats, setStats] = useState<HistoryStats>(() => core.getStats());
  const lockedRef = useRef(false);

  // Reaktivität auf Kern-Zustandsänderungen
  useEffect(() => {
    const unsubscribe = core.subscribe((nextState) => {
      setState(nextState);
      setStats(core.getStats());
    });
    return unsubscribe;
  }, [core]);

  // Wenn sich die initiale Konfiguration fundamental ändert (z. B. geladene Server-ID)
  useEffect(() => {
    if (initialConfig.id !== core.getState().config.id) {
      core.setSavedConfig(initialConfig);
    }
  }, [initialConfig, core]);

  const dispatch = useCallback(
    (command: EditorCommand) => {
      if (lockedRef.current) return;
      core.execute(command);
    },
    [core],
  );

  const undo = useCallback(() => {
    if (lockedRef.current) return;
    core.undo();
  }, [core]);

  const redo = useCallback(() => {
    if (lockedRef.current) return;
    core.redo();
  }, [core]);

  const beginTransaction = useCallback(
    (kind: 'drag' | 'resize') => {
      if (lockedRef.current) return;
      core.beginTransaction(kind);
    },
    [core],
  );

  const updateDraftInterim = useCallback(
    (updater: (draft: DashboardDraftState) => DashboardDraftState) => {
      if (lockedRef.current) return;
      core.updateDraftInterim(updater);
    },
    [core],
  );

  const commitTransaction = useCallback(
    (command: EditorCommand) => {
      if (lockedRef.current) return;
      core.commitTransaction(command);
    },
    [core],
  );

  const cancelTransaction = useCallback(() => {
    core.cancelTransaction();
  }, [core]);

  const recordTextInput = useCallback(
    (tileId: string, field: string, initialValue: string, latestValue: string) => {
      if (lockedRef.current) return;
      core.recordTextInput(tileId, field, initialValue, latestValue);
    },
    [core],
  );

  const flushTextInput = useCallback(() => {
    core.flushTextInput();
  }, [core]);

  const setSelectedTileId = useCallback(
    (tileId: string | null) => {
      core.setSelectedTileId(tileId);
    },
    [core],
  );

  const setActiveBreakpoint = useCallback(
    (breakpoint: BreakpointKey) => {
      core.setActiveBreakpoint(breakpoint);
    },
    [core],
  );

  const discard = useCallback(() => {
    if (lockedRef.current) return;
    core.discard();
  }, [core]);

  const save = useCallback(async (): Promise<boolean> => {
    if (lockedRef.current || !onSave) return false;
    core.flushTextInput();
    lockedRef.current = true;
    try {
      const ok = await onSave(core.getState().config);
      if (ok) {
        core.setSavedConfig(core.getState().config);
        return true;
      }
      return false;
    } finally {
      lockedRef.current = false;
    }
  }, [core, onSave]);

  // Navigationsschutz: Browser & In-App-Links
  const leaveGuard = useLeaveGuard({
    dirty: state.isDirty,
    lockedRef,
    save,
    discard,
  });

  const handleLeaveLink = useCallback(
    (to: string) => {
      leaveGuard.requestLeave(() => {
        if (onNavigate) {
          onNavigate(to);
        } else if (typeof window !== 'undefined') {
          window.location.assign(to);
        }
      });
    },
    [leaveGuard, onNavigate],
  );

  const handleLeaveAction = useCallback(
    (proceed: () => void) => {
      leaveGuard.requestLeave(proceed);
    },
    [leaveGuard],
  );

  // In-App-Links abfangen, wenn Entwurf ungespeichert ist
  useInAppLinkGuard(state.isDirty, handleLeaveLink, handleLeaveAction);

  return useMemo(
    () => ({
      state,
      core,
      historyStats: stats,
      canUndo: core.canUndo(),
      canRedo: core.canRedo(),
      dispatch,
      undo,
      redo,
      beginTransaction,
      updateDraftInterim,
      commitTransaction,
      cancelTransaction,
      recordTextInput,
      flushTextInput,
      setSelectedTileId,
      setActiveBreakpoint,
      save,
      discard,
      leaveGuard,
    }),
    [
      state,
      core,
      stats,
      dispatch,
      undo,
      redo,
      beginTransaction,
      updateDraftInterim,
      commitTransaction,
      cancelTransaction,
      recordTextInput,
      flushTextInput,
      setSelectedTileId,
      setActiveBreakpoint,
      save,
      discard,
      leaveGuard,
    ],
  );
}
