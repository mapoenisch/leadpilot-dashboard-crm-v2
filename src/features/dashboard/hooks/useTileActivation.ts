// Executive Dashboard, Teilauftrag 5 (Auftrag 074): sichtbarkeitsgesteuerte Aktivierung einer
// Kachel. `near` gilt nur, solange die Kachel im Bereich plus Vorlauf liegt; `active` wird beim
// ersten Eintritt gesetzt und bleibt danach bestehen (kein erneutes Laden beim Zurückscrollen).
// Ohne IntersectionObserver sind alle Kacheln sofort aktiv.
import { useCallback, useEffect, useRef, useState } from 'react';

export const ACTIVATION_ROOT_MARGIN = '300px';

export function useTileActivation() {
  const supported = typeof IntersectionObserver !== 'undefined';
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(!supported);
  const [active, setActive] = useState(!supported);

  useEffect(() => {
    const element = ref.current;
    if (!supported || !element) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setActive(true);
      },
      { rootMargin: ACTIVATION_ROOT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [supported]);

  const activate = useCallback(() => {
    setNear(true);
    setActive(true);
  }, []);

  return { ref, near, active, activate };
}
