// Auftrag 171 (P15a §2.1 Nr. 3): Rotation der Kiosk-Dashboards.
// Ein einziger Timer je Anzeige; Pause per Leertaste/Schaltfläche (bleibt, bis erneut umgeschaltet)
// oder automatisch bei Interaktion (endet nach einem Intervall ohne weitere Interaktion) und solange
// das aktuelle Dashboard lädt oder das Netz fehlt (offline bleibt der letzte Stand stehen). Keine Animation — der Wechsel ist ein reiner Inhaltswechsel.
import { useCallback, useEffect, useRef, useState } from 'react';

export type KioskPauseReason = 'manuell' | 'interaktion' | 'offline' | 'laden' | null;

export interface UseKioskRotationOptions {
  count: number;
  intervalMs: number;
  /** true, solange das aktuelle Dashboard lädt. */
  loading: boolean;
  /** true, solange das Netz fehlt: kein Wechsel auf nicht geladene Dashboards. */
  offline?: boolean;
}

export interface KioskRotation {
  index: number;
  isPaused: boolean;
  pauseReason: KioskPauseReason;
  togglePause: () => void;
  /** Meldet eine Nutzerinteraktion (Zeiger, Fokus, Tastatur). */
  noteInteraction: () => void;
  next: () => void;
  previous: () => void;
}

export function useKioskRotation({
  count,
  intervalMs,
  loading,
  offline = false,
}: UseKioskRotationOptions): KioskRotation {
  const [index, setIndex] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [interactionPause, setInteractionPause] = useState(false);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Liste schrumpft (z. B. übersprungenes Dashboard): Index im gültigen Bereich halten.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  const next = useCallback(() => {
    setIndex((i) => (count > 0 ? (i + 1) % count : 0));
  }, [count]);
  const previous = useCallback(() => {
    setIndex((i) => (count > 0 ? (i - 1 + count) % count : 0));
  }, [count]);

  const pauseReason: KioskPauseReason = manualPause
    ? 'manuell'
    : interactionPause
      ? 'interaktion'
      : offline
        ? 'offline'
        : loading
          ? 'laden'
          : null;
  const isPaused = pauseReason !== null;

  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = setTimeout(next, intervalMs);
    return () => clearTimeout(timer);
  }, [index, isPaused, count, intervalMs, next]);

  const noteInteraction = useCallback(() => {
    setInteractionPause(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => {
      interactionTimer.current = null;
      setInteractionPause(false);
    }, intervalMs);
  }, [intervalMs]);

  useEffect(
    () => () => {
      if (interactionTimer.current) clearTimeout(interactionTimer.current);
    },
    [],
  );

  const togglePause = useCallback(() => {
    setManualPause((p) => !p);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = null;
    setInteractionPause(false);
  }, []);

  return { index, isPaused, pauseReason, togglePause, noteInteraction, next, previous };
}
