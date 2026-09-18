import { useState, useEffect } from 'react';

// 067J / G56: Single-DOM-Umschalter für responsive Listen. Derselbe
// Breakpoint wie das CSS (`max-width: 640px` in global.css) — pro Datensatz
// existiert genau ein DOM (Tabelle ODER Karten), nie beide gleichzeitig.
const MOBILE_QUERY = '(max-width: 640px)';

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQueryList = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', onChange);
    } else {
      mediaQueryList.addListener(onChange);
    }

    setIsMobile(mediaQueryList.matches);

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', onChange);
      } else {
        mediaQueryList.removeListener(onChange);
      }
    };
  }, []);

  return isMobile;
}
