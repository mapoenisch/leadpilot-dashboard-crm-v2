// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Router-Anbindung des Navigationsschutzes.
// Solange der Entwurf ungespeicherte Änderungen hat, fängt der Arbeitsbereich Klicks auf interne
// Links (Seitenleiste, Fachseiten, Kopfzeile) ab, bevor React Router sie ausführt, und fragt über
// `requestLeave` nach (speichern, verwerfen, bleiben). Der Router selbst bleibt unverändert.
// Schaltflächen, die die Seite ohne Link verlassen (Abmelden), tragen `data-leave-guard` und
// laufen ebenso über die Rückfrage (Codex PR #61).
import { useEffect, useRef } from 'react';

export const LEAVE_GUARD_ATTRIBUTE = 'data-leave-guard';

/** Schaltfläche mit `data-leave-guard`, deren Klick die Seite verlässt, oder `null`. */
export function leavingControl(event: MouseEvent): HTMLElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  const control =
    event.target instanceof Element ? event.target.closest(`[${LEAVE_GUARD_ATTRIBUTE}]`) : null;
  return control instanceof HTMLElement ? control : null;
}

/**
 * Internes Ziel eines Linkklicks oder `null` (neues Fenster, Download, extern, gleiche Seite).
 * `current` ist Pfad samt Suche; ein reiner Anker auf derselben Seite (z. B. „Zum Hauptinhalt
 * springen“) verlässt den Editor nicht und bleibt ungefragt.
 */
export function internalLinkTarget(
  event: MouseEvent,
  origin: string,
  current: string,
): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  // Reiner Anker (`#…`): bleibt immer auf derselben Seite.
  if ((anchor.getAttribute('href') ?? '').startsWith('#')) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const to = `${url.pathname}${url.search}${url.hash}`;
  return `${url.pathname}${url.search}` === current ? null : to;
}

export function useInAppLinkGuard(
  active: boolean,
  onLeave: (to: string) => void,
  onLeaveAction?: (proceed: () => void) => void,
) {
  const leave = useRef(onLeave);
  leave.current = onLeave;
  const leaveAction = useRef(onLeaveAction);
  leaveAction.current = onLeaveAction;
  useEffect(() => {
    if (!active) return;
    // Nach „Verwerfen“ oder „Speichern“ löst derselbe Klick die Aktion ohne erneute Rückfrage aus.
    let passThrough = false;
    const onClick = (event: MouseEvent) => {
      if (passThrough) return;
      const control = leaveAction.current ? leavingControl(event) : null;
      if (control) {
        event.preventDefault();
        event.stopPropagation();
        leaveAction.current?.(() => {
          passThrough = true;
          try {
            control.click();
          } finally {
            passThrough = false;
          }
        });
        return;
      }
      const here = `${window.location.pathname}${window.location.search}`;
      const to = internalLinkTarget(event, window.location.origin, here);
      if (!to) return;
      // Vor React Router (Erfassungsphase am Dokument): weder Router noch Browser navigieren.
      event.preventDefault();
      event.stopPropagation();
      leave.current(to);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active]);
}
