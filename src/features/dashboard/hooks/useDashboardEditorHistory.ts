// Executive Dashboard: Undo/Redo-Verlauf für den Dashboard-Editor (Arbeitskopie).
import { useCallback, useRef, useState } from 'react';
import type { DashboardConfig } from '../model/dashboardConfig';

const MAX_HISTORY = 50;

export function useDashboardEditorHistory() {
  const [history, setHistory] = useState<DashboardConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef<DashboardConfig[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const initHistory = useCallback((initial: DashboardConfig) => {
    historyRef.current = [initial];
    historyIndexRef.current = 0;
    setHistory([initial]);
    setHistoryIndex(0);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const pushHistory = useCallback((next: DashboardConfig) => {
    const curHistory = historyRef.current;
    const curIndex = historyIndexRef.current;
    const truncated = curIndex >= 0 ? curHistory.slice(0, curIndex + 1) : [];
    const updated = [...truncated, next].slice(-MAX_HISTORY);
    const nextIndex = updated.length - 1;
    historyRef.current = updated;
    historyIndexRef.current = nextIndex;
    setHistory(updated);
    setHistoryIndex(nextIndex);
  }, []);

  const undo = useCallback((): DashboardConfig | null => {
    if (historyIndexRef.current <= 0) return null;
    const nextIndex = historyIndexRef.current - 1;
    const target = historyRef.current[nextIndex] ?? null;
    if (target) {
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
    }
    return target;
  }, []);

  const redo = useCallback((): DashboardConfig | null => {
    if (historyIndexRef.current < 0 || historyIndexRef.current >= historyRef.current.length - 1) {
      return null;
    }
    const nextIndex = historyIndexRef.current + 1;
    const target = historyRef.current[nextIndex] ?? null;
    if (target) {
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
    }
    return target;
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  return {
    canUndo,
    canRedo,
    initHistory,
    clearHistory,
    pushHistory,
    undo,
    redo,
  };
}
