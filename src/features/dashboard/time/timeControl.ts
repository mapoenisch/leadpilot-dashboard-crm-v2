// Auftrag 159 (P10a) & Auftrag 161 (P10b-2): gemeinsame, flüchtige Zeitsteuerung des V2-Editors.
// Der Zustand gehört bewusst nicht in DashboardConfigV2, nicht in den Entwurf und nicht in den
// Undo-Verlauf: Pausieren und Analysezeitpunkt sind reine Anzeigehandlungen und werden nie gespeichert.

import { formatBerlinIso, getBerlinParts, truncateBerlin } from '../data/resolveTimeSeries';

export type TimeControlMode = 'live' | 'pausiert' | 'zeitpunkt';

export interface TimeControlState {
  mode: TimeControlMode;
  /** ISO-Zeitpunkt des Pausenbeginns oder Analysezeitpunkts; null im Live-Modus. */
  analysisAt: string | null;
  /** Steigt bei jeder Wiederaufnahme; dient dem Datenpfad als Signal für einen Neuladevorgang. */
  resumeToken: number;
}

export type TimeControlAction =
  | { type: 'pause'; now: string }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'zeitpunkt'; at: string; now: string };

export const INITIAL_TIME_CONTROL_STATE: TimeControlState = Object.freeze({
  mode: 'live',
  analysisAt: null,
  resumeToken: 0,
}) as TimeControlState;

/** Im Modus pausiert oder zeitpunkt bleibt Pause folgenlos. */
export function pauseTimeControl(
  state: TimeControlState,
  now: Date | string = new Date(),
): TimeControlState {
  if (state.mode === 'pausiert' || state.mode === 'zeitpunkt') return state;
  return {
    mode: 'pausiert',
    analysisAt: typeof now === 'string' ? now : now.toISOString(),
    resumeToken: state.resumeToken,
  };
}

/** Setzt den Analysezeitpunkt. at muss gültiges ISO und <= now sein. */
export function setTimePoint(
  state: TimeControlState,
  at: string,
  now: string = new Date().toISOString(),
): TimeControlState {
  const atTime = Date.parse(at);
  const nowTime = Date.parse(now);
  if (Number.isNaN(atTime) || Number.isNaN(nowTime) || atTime > nowTime) {
    return state;
  }
  return {
    mode: 'zeitpunkt',
    analysisAt: at,
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
    case 'zeitpunkt':
      return setTimePoint(state, action.at, action.now);
  }
}

/** Berechnet die Standard-Vorgaben für den Zeitpunkt-Dialog in Europe/Berlin (Auftrag 161 §2.2 Nr. 9). */
export function getBerlinPresets(
  now: Date = new Date(),
): readonly { id: string; label: string; at: string }[] {
  return [
    {
      id: 'gestern',
      label: 'Ende gestern',
      at: formatBerlinIso(truncateBerlin(now, 'tag')),
    },
    {
      id: 'letzte_woche',
      label: 'Ende letzte Woche',
      at: formatBerlinIso(truncateBerlin(now, 'woche')),
    },
    {
      id: 'letzter_monat',
      label: 'Ende letzter Monat',
      at: formatBerlinIso(truncateBerlin(now, 'monat')),
    },
  ];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Formatiert ein Datum für das HTML-Feld input type="datetime-local" in Europe/Berlin. */
export function formatBerlinLocalDateTime(date: Date | string | number): string {
  const p = getBerlinParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** Interpretiert eine datetime-local Eingabe (YYYY-MM-DDTHH:mm) strikt als Berliner Zeit. */
export function parseBerlinDateTime(localValue: string): string | null {
  if (!localValue) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localValue);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const day = parseInt(match[3]!, 10);
  const hour = parseInt(match[4]!, 10);
  const minute = parseInt(match[5]!, 10);
  const second = match[6] ? parseInt(match[6], 10) : 0;

  let t = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const p = getBerlinParts(new Date(t));
    const targetMin = hour * 60 + minute;
    const actualMin = p.hour * 60 + p.minute;
    let diffMin = targetMin - actualMin;
    if (p.day !== day) {
      diffMin += (day - p.day) * 1440;
    }
    if (diffMin === 0) break;
    t += diffMin * 60_000;
  }
  return formatBerlinIso(new Date(t));
}
