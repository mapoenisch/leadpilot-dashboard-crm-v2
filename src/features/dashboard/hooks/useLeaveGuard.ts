// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Navigationsschutz des Editors. Fragt beim
// Verlassen mit offenen Änderungen zurück (speichern, verwerfen, bleiben) und warnt den Browser
// beim Schließen oder Neuladen. Die Router-Anbindung folgt mit Teilauftrag 7.
import { useCallback, useEffect, useState, type MutableRefObject } from 'react';

interface LeaveGuardOptions {
  dirty: boolean;
  lockedRef: MutableRefObject<boolean>;
  save: () => Promise<boolean>;
  /** Verwirft den Entwurf und beendet die Bearbeitung. */
  discard: () => void;
}

export function useLeaveGuard({ dirty, lockedRef, save, discard }: LeaveGuardOptions) {
  const [leaveRequest, setLeaveRequest] = useState<{ proceed: () => void } | null>(null);

  const requestLeave = useCallback(
    (proceed: () => void): void => {
      if (lockedRef.current) return;
      if (!dirty) proceed();
      else setLeaveRequest({ proceed });
    },
    [dirty, lockedRef],
  );

  const leaveStay = useCallback(() => {
    // Während des Speicherns läuft `leaveSave` weiter und würde trotzdem navigieren.
    if (lockedRef.current) return;
    setLeaveRequest(null);
  }, [lockedRef]);

  const leaveDiscard = useCallback(() => {
    if (lockedRef.current || !leaveRequest) return;
    const { proceed } = leaveRequest;
    setLeaveRequest(null);
    discard();
    proceed();
  }, [leaveRequest, lockedRef, discard]);

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

  return { leaveRequest, requestLeave, leaveStay, leaveDiscard, leaveSave };
}
