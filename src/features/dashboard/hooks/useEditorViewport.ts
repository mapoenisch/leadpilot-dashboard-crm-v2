// Executive Dashboard V2 (Auftrag 172 / P15b §2.1):
// Geräteklasse des Bildschirms für die Bedienweise des Editors.
// `mobile` (< 640 px) schaltet den Editor in „Bearbeiten per Liste“, `tablet` (640–1023 px)
// verlangt für das Ziehen per Touch ein langes Drücken. Unabhängig davon bleibt die gewählte
// Layoutansicht (Desktop/Tablet/Smartphone) ein reiner Bearbeitungszustand ohne Datenrechte.

import { useEffect, useState } from 'react';

export type EditorViewport = 'mobile' | 'tablet' | 'desktop';

export const MOBILE_VIEWPORT_QUERY = '(max-width: 639px)';
export const TABLET_VIEWPORT_QUERY = '(max-width: 1023px)';

function readViewport(): EditorViewport {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia(MOBILE_VIEWPORT_QUERY).matches) return 'mobile';
  if (window.matchMedia(TABLET_VIEWPORT_QUERY).matches) return 'tablet';
  return 'desktop';
}

export function useEditorViewport(): EditorViewport {
  const [viewport, setViewport] = useState<EditorViewport>(readViewport);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const lists = [MOBILE_VIEWPORT_QUERY, TABLET_VIEWPORT_QUERY].map((q) => window.matchMedia(q));
    const update = () => setViewport(readViewport());
    lists.forEach((l) => l.addEventListener?.('change', update));
    update();
    return () => lists.forEach((l) => l.removeEventListener?.('change', update));
  }, []);

  return viewport;
}
