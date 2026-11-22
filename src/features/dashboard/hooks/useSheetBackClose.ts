// Executive Dashboard V2 (Auftrag 172 / P15b §2.1 Nr. 4):
// Browser-Zurück schließt ein Vollbild-Blatt (Inspector auf dem Telefon), statt die Seite zu verlassen.
// Beim Öffnen legt das Blatt einen Verlaufseintrag mit derselben Adresse an (Markierung `lpSheet`).
// „Zurück“ entfernt nur diesen Eintrag und schließt das Blatt. Der Entwurf bleibt unverändert, denn
// Inspector-Änderungen landen sofort im Entwurf; verworfen wird nur über die bestehende Rückfrage.
// Schließen über die Schaltfläche nimmt den eigenen Eintrag wieder aus dem Verlauf.

import { useCallback, useEffect, useRef } from 'react';

export const SHEET_HISTORY_KEY = 'lpSheet';

function hasSheetMarker(state: unknown, id: string): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>)[SHEET_HISTORY_KEY] === id
  );
}

/**
 * @param open   Blatt ist sichtbar
 * @param onClose schließt das Blatt (ohne Verlaufsschritt)
 * @returns `requestClose` für die Schließen-Schaltfläche (räumt den Verlaufseintrag mit auf)
 */
export function useSheetBackClose(open: boolean, onClose: () => void, id = 'inspector') {
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    if (!hasSheetMarker(window.history.state, id)) {
      const base =
        typeof window.history.state === 'object' && window.history.state !== null
          ? (window.history.state as Record<string, unknown>)
          : {};
      window.history.pushState({ ...base, [SHEET_HISTORY_KEY]: id }, '');
    }
    pushed.current = true;
    const onPop = (e: PopStateEvent) => {
      if (hasSheetMarker(e.state, id)) return;
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, id]);

  return useCallback(() => {
    if (pushed.current && hasSheetMarker(window.history.state, id)) {
      // Der popstate-Handler schließt das Blatt, sobald der Eintrag entfernt ist.
      window.history.back();
      return;
    }
    pushed.current = false;
    closeRef.current();
  }, [id]);
}
