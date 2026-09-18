import { useCallback, useEffect, useState } from 'react';
import { useInRouterContext } from 'react-router-dom';

function readParam(key: string, initialValue: string): string {
  if (typeof window === 'undefined') return initialValue;
  return new URLSearchParams(window.location.search).get(key) ?? initialValue;
}

// 067J / G56: Filter-, Tab- und Sortierzustand ist über die URL
// wiederherstellbar (PR-A11Y-12) — lesbar per Link/Reload, ohne
// Server-Roundtrip. Schreibt per history.replaceState (kein Verlaufseintrag,
// keine Remounts) und folgt dem Zurück-Button per popstate. Ohne
// Router-Kontext (z. B. isolierte Unit-Tests) reines useState-Verhalten.
// Die serverseitige Query-Synchronisation bleibt 067N-Sache.
export function useUrlSyncedState(key: string, initialValue: string): [string, (next: string) => void] {
  const inRouter = useInRouterContext();
  const [value, setValueState] = useState<string>(() =>
    inRouter ? readParam(key, initialValue) : initialValue,
  );

  useEffect(() => {
    if (!inRouter) return;
    const onPopState = () => {
      setValueState(readParam(key, initialValue));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [inRouter, key, initialValue]);

  const setValue = useCallback(
    (next: string) => {
      setValueState(next);
      if (inRouter && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (next === '' || next === initialValue) {
          url.searchParams.delete(key);
        } else {
          url.searchParams.set(key, next);
        }
        window.history.replaceState(null, '', url);
      }
    },
    [key, initialValue, inRouter],
  );

  return [value, setValue];
}
