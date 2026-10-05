// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Zurück-Taste des Browsers bei offenen Änderungen.
// Der `BrowserRouter` kann eine Rückwärtsnavigation nicht blockieren. Deshalb legt der Editor bei
// offenen Änderungen einen Verlaufseintrag mit demselben Pfad (Markierung `editorGuard`) obenauf.
// „Zurück“ landet dann auf derselben Seite: Der Editor bleibt eingebunden, der Eintrag wird sofort
// wiederhergestellt, und es kommt die Rückfrage. Erst „Verwerfen“ oder „Speichern“ führt zwei
// Schritte zurück, also zur tatsächlich vorherigen Seite.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const EDITOR_GUARD_KEY = 'editorGuard';

const isGuardState = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && EDITOR_GUARD_KEY in state;

/** Liefert, ob der Schutzeintrag gerade aktiv (gerendert) ist. */
export function useBrowserBackGuard(
  dirty: boolean,
  requestLeave: (proceed: () => void) => void,
): boolean {
  const navigate = useNavigate();
  const location = useLocation();
  const onGuard = isGuardState(location.state);
  const armed = useRef(false);
  const leave = useRef(requestLeave);
  leave.current = requestLeave;

  // Offene Änderungen: Schutzeintrag anlegen (einmal je Bearbeitung, nicht bei jedem Rendern).
  useEffect(() => {
    if (!dirty || onGuard || armed.current) return;
    armed.current = true;
    const base =
      typeof location.state === 'object' && location.state !== null ? location.state : {};
    navigate(`${location.pathname}${location.search}`, {
      state: { ...base, [EDITOR_GUARD_KEY]: true },
    });
  }, [dirty, onGuard, location.pathname, location.search, location.state, navigate]);

  // Vom Schutzeintrag zurückgegangen: Eintrag wiederherstellen und nachfragen.
  const wasOnGuard = useRef(onGuard);
  useEffect(() => {
    const left = wasOnGuard.current && !onGuard;
    wasOnGuard.current = onGuard;
    if (!left) return;
    if (!dirty) {
      armed.current = false;
      return;
    }
    navigate(1);
    leave.current(() => navigate(-2));
  }, [onGuard, dirty, navigate]);

  return onGuard;
}

/** Ohne Router (Vorschau, Tests): kein Schutz der Zurück-Taste. */
export function noBrowserBackGuard(): boolean {
  return false;
}
