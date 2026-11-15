// Auftrag 159 (P10a): gemeinsame, flüchtige Zeitsteuerung des V2-Editors.
// Der Zustand gehört bewusst nicht in DashboardConfigV2, nicht in den Entwurf und nicht in den
// Undo-Verlauf: Pausieren ist eine reine Anzeigehandlung und wird nie gespeichert.

export type TimeControlMode = 'live' | 'pausiert';

export interface TimeControlState {
  mode: TimeControlMode;
  /** ISO-Zeitpunkt des Pausenbeginns; null im Live-Modus. */
  analysisAt: string | null;
  /** Steigt bei jeder Wiederaufnahme; dient dem Datenpfad als Signal für einen Neuladevorgang. */
  resumeToken: number;
}

export type TimeControlAction =
  { type: 'pause'; now: string } | { type: 'resume' } | { type: 'reset' };

export const INITIAL_TIME_CONTROL_STATE: TimeControlState = Object.freeze({
  mode: 'live',
  analysisAt: null,
  resumeToken: 0,
}) as TimeControlState;

/** Doppeltes Pausieren ändert den Analysezeitpunkt nicht. */
export function pauseTimeControl(
  state: TimeControlState,
  now: Date | string = new Date(),
): TimeControlState {
  if (state.mode === 'pausiert') return state;
  return {
    mode: 'pausiert',
    analysisAt: typeof now === 'string' ? now : now.toISOString(),
    resumeToken: state.resumeToken,
  };
}

/** Fortsetzen im Live-Modus bleibt folgenlos; sonst steigt der Fortsetzungszähler. */
export function resumeTimeControl(state: TimeControlState): TimeControlState {
  if (state.mode === 'live') return state;
  return {
    mode: 'live',
    analysisAt: null,
    resumeToken: state.resumeToken + 1,
  };
}

export function timeControlReducer(
  state: TimeControlState,
  action: TimeControlAction,
): TimeControlState {
  switch (action.type) {
    case 'pause':
      return pauseTimeControl(state, action.now);
    case 'resume':
      return resumeTimeControl(state);
    case 'reset':
      return INITIAL_TIME_CONTROL_STATE;
  }
}
