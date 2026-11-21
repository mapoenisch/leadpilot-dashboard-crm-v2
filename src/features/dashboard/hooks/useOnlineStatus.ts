// Auftrag 171 (P15a §2.1 Nr. 5): Netzverlust erkennen.
// Quelle ist ausschließlich der Browser (`navigator.onLine` und die Ereignisse `online`/`offline`);
// es gibt keine eigene Ping-Messung. `offlineSince` hält den Beginn des Ausfalls für den Hinweis.
import { useEffect, useState } from 'react';

export interface OnlineStatus {
  online: boolean;
  /** Beginn des aktuellen Ausfalls (ISO) oder null, solange online. */
  offlineSince: string | null;
}

function initial(now: () => number): OnlineStatus {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  return { online, offlineSince: online ? null : new Date(now()).toISOString() };
}

export function useOnlineStatus(now: () => number = Date.now): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>(() => initial(now));

  useEffect(() => {
    const goOffline = () =>
      setStatus((prev) =>
        prev.online ? { online: false, offlineSince: new Date(now()).toISOString() } : prev,
      );
    const goOnline = () =>
      setStatus((prev) => (prev.online ? prev : { online: true, offlineSince: null }));
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [now]);

  return status;
}
