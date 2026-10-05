// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Router-Anbindung des Navigationsschutzes.
// Solange der Entwurf ungespeicherte Änderungen hat, fängt der Arbeitsbereich Klicks auf interne
// Links (Seitenleiste, Fachseiten, Kopfzeile) ab, bevor React Router sie ausführt, und fragt über
// `requestLeave` nach (speichern, verwerfen, bleiben). Der Router selbst bleibt unverändert.
import { useEffect, useRef } from 'react';

/** Internes Ziel eines Linkklicks oder `null` (neues Fenster, Download, extern, gleiche Seite). */
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
  let url: URL;
  try {
    url = new URL(anchor.href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const to = `${url.pathname}${url.search}${url.hash}`;
  return url.pathname === current && !url.search && !url.hash ? null : to;
}

export function useInAppLinkGuard(active: boolean, onLeave: (to: string) => void) {
  const leave = useRef(onLeave);
  leave.current = onLeave;
  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent) => {
      const to = internalLinkTarget(event, window.location.origin, window.location.pathname);
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
