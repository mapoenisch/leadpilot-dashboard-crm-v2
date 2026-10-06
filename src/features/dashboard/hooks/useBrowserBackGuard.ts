// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Zurück-Taste des Browsers bei offenen Änderungen.
// Der `BrowserRouter` kann eine Rückwärtsnavigation nicht blockieren. Deshalb legt der Editor bei
// offenen Änderungen einen Verlaufseintrag mit demselben Pfad (Markierung `editorGuard`) obenauf.
// „Zurück“ landet dann auf derselben Seite: Der Editor bleibt eingebunden, der Eintrag wird sofort
// wiederhergestellt, und es kommt die Rückfrage. Erst „Verwerfen“ oder „Speichern“ führt zwei
// Schritte zurück, also zur tatsächlich vorherigen Seite. Wird der Entwurf ohne Verlassen wieder
// sauber (gespeichert, verworfen, rückgängig), geht der Schutzeintrag selbst einen Schritt zurück,
// damit die nächste Zurück-Taste wieder zur vorherigen Seite führt (Codex PR #61).
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const EDITOR_GUARD_KEY = 'editorGuard';

const isGuardState = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && EDITOR_GUARD_KEY in state;

/**
 * Liefert, ob der Schutzeintrag gerade aktiv (gerendert) ist. `leavePending`: die Rückfrage ist
 * offen oder das Verlassen bestätigt; ein dabei sauber werdender Entwurf gehört zum Verlassen, nicht
 * zum Aufräumen (die Router-Navigation kann erst nach dem Verwerfen gerendert werden).
 */
export function useBrowserBackGuard(
  dirty: boolean,
  requestLeave: (proceed: () => void) => void,
  leavePending = false,
): boolean {
  const navigate = useNavigate();
  const location = useLocation();
  const onGuard = isGuardState(location.state);
  const armed = useRef(false);
  const leave = useRef(requestLeave);
  leave.current = requestLeave;
  // Unser eigenes Verlassen (zwei Schritte zurück) läuft asynchron; bis dahin nicht aufräumen.
  const leaving = useRef(false);

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
    leaving.current = false;
    if (!dirty) {
      armed.current = false;
      return;
    }
    navigate(1);
    leave.current(() => {
      leaving.current = true;
      navigate(-2);
    });
  }, [onGuard, dirty, navigate]);

  // Wieder sauber, ohne die Seite zu verlassen: Schutzeintrag aus dem Verlauf nehmen.
  useEffect(() => {
    if (dirty || !onGuard || leavePending || leaving.current) return;
    leaving.current = true;
    navigate(-1);
  }, [dirty, onGuard, leavePending, navigate]);

  return onGuard;
}

/** Ohne Router (Vorschau, Tests): kein Schutz der Zurück-Taste. */
export function noBrowserBackGuard(): boolean {
  return false;
}
