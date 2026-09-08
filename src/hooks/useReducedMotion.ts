import { useState, useEffect } from 'react';

/**
 * useReducedMotion Hook
 * Listens to the `(prefers-reduced-motion: reduce)` media query.
 * Returns true if the user prefers reduced motion, false otherwise.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', onChange);
    } else {
      mediaQueryList.addListener(onChange);
    }

    setPrefersReducedMotion(mediaQueryList.matches);

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', onChange);
      } else {
        mediaQueryList.removeListener(onChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}
