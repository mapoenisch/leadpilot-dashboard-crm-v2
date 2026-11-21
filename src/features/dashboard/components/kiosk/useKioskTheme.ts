// Auftrag 171 (P15a §2.1 Nr. 2): helles/dunkles Theme im Kiosk.
// Gleicher Mechanismus und Speicherschlüssel wie das App-Layout (`data-theme` am Wurzelelement,
// `leadpilot-theme`), damit der Kiosk dieselbe Wahl übernimmt; die Adresse (`theme=hell|dunkel`)
// hat Vorrang. Der Schlüssel ist hier dupliziert, damit der Kiosk-Chunk das Layout nicht zieht.
import { useCallback, useEffect, useState } from 'react';
import type { KioskTheme } from '../../model/kioskParams';

const THEME_STORAGE_KEY = 'leadpilot-theme';

function storedTheme(): KioskTheme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useKioskTheme(fromUrl: KioskTheme | null) {
  const [theme, setTheme] = useState<KioskTheme>(() => fromUrl ?? storedTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Private-Modus: Theme gilt nur für diese Sitzung.
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}
