// Auftrag 159 (P10a): React-Kontext der gemeinsamen Zeitsteuerung.
// Liegt bewusst unter src/features/dashboard/time/ — src/context/ ist Schutzbereich.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import {
  INITIAL_TIME_CONTROL_STATE,
  timeControlReducer,
  type TimeControlState,
} from './timeControl';
import { createCrosshairStore, type CrosshairStore } from './crosshairStore';

export interface TimeControlValue {
  state: TimeControlState;
  /** Friert alle sichtbaren Kacheln auf einen gemeinsamen Analysezeitpunkt ein. */
  pause: (now?: Date | string) => void;
  /** Gibt die Anzeige frei; der Datenpfad lädt einmalig einen konsistenten aktuellen Stand. */
  resume: () => void;
  /** Setzt den Analysezeitpunkt (Modus zeitpunkt). */
  setTimePoint: (at: string, now?: string) => void;
  /** Geteilter Fadenkreuz-Store für synchrone Zeitreihen-Ablesung. */
  crosshairStore: CrosshairStore;
}

const TimeControlContext = createContext<TimeControlValue | null>(null);

export function TimeControlProvider({
  children,
  initialState = INITIAL_TIME_CONTROL_STATE,
}: {
  children: ReactNode;
  /** Nur für Tests und Vorschau-Szenarien; im Editor startet der Zustand immer live. */
  initialState?: TimeControlState;
}) {
  const [state, dispatch] = useReducer(timeControlReducer, initialState);
  const crosshairStore = useMemo(() => createCrosshairStore(), []);

  // Beim Wechsel des Zeitmodus Fadenkreuz leeren (Auftrag 161 §2.4 Nr. 17)
  useEffect(() => {
    crosshairStore.clearCrosshair();
  }, [state.mode, crosshairStore]);

  const pause = useCallback((now?: Date | string) => {
    dispatch({
      type: 'pause',
      now: now instanceof Date ? now.toISOString() : (now ?? new Date().toISOString()),
    });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: 'resume' });
  }, []);

  const setTimePoint = useCallback((at: string, now?: string) => {
    dispatch({
      type: 'zeitpunkt',
      at,
      now: now ?? new Date().toISOString(),
    });
  }, []);

  const value = useMemo<TimeControlValue>(
    () => ({ state, pause, resume, setTimePoint, crosshairStore }),
    [state, pause, resume, setTimePoint, crosshairStore],
  );

  return <TimeControlContext.Provider value={value}>{children}</TimeControlContext.Provider>;
}

export function useTimeControl(): TimeControlValue {
  const value = useContext(TimeControlContext);
  if (!value) {
    throw new Error('useTimeControl muss innerhalb von TimeControlProvider verwendet werden.');
  }
  return value;
}

/** Optionaler Zugriff für generische Kacheln (V1 hat keinen Provider und bleibt unverändert). */
export function useOptionalTimeControl(): TimeControlValue | null {
  return useContext(TimeControlContext);
}
