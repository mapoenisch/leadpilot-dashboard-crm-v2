// Auftrag 171 (P15a §2.2 Nr. 9): Sitzungswächter für den Kiosk.
// Beobachtet Auth-Zustand und Token-Ablauf und liefert `aktiv | erneuert | abgelaufen`.
// Supabase erneuert das Token selbst (autoRefreshToken); der Wächter erkennt, ob die Erneuerung
// rechtzeitig kam. Bleibt sie über den Ablauf hinaus aus (z. B. Refresh-Token ungültig) oder meldet
// Supabase eine Abmeldung, gilt die Sitzung sofort als abgelaufen. Keine Änderung an `src/auth/**`:
// die nötigen Ereignisse liefert `onAuthStateChange` bereits (TOKEN_REFRESHED, SIGNED_OUT).
// Die Supabase-Quelle liegt in `supabaseSessionSource.ts`, damit die Vorschau ohne Supabase-Client
// auskommt.
import { useCallback, useEffect, useRef, useState } from 'react';

export type SessionGuardStatus = 'aktiv' | 'erneuert' | 'abgelaufen';

/** Normierte Auth-Ereignisse; `expiresAt` in ms seit Epoche oder null ohne Sitzung. */
export type SessionSourceEvent = 'erneuert' | 'abgemeldet' | 'angemeldet';

export interface SessionSource {
  read(): Promise<number | null>;
  subscribe(listener: (event: SessionSourceEvent, expiresAt: number | null) => void): () => void;
}

export interface SessionGuardState {
  status: SessionGuardStatus;
  /** Zeitpunkt der letzten erfolgreichen Erneuerung (ISO) oder null. */
  renewedAt: string | null;
  /** Zeitpunkt, zu dem der Ablauf erkannt wurde (ISO) oder null. */
  expiredAt: string | null;
}

export interface UseSessionGuardOptions {
  /** Quelle der Token-Ereignisse; null = nur Auth-Kontext (lokaler Modus, Vorschau). */
  source: SessionSource | null;
  /** Anmeldezustand aus dem Auth-Kontext; false gilt sofort als abgelaufen. */
  isAuthenticated: boolean;
  /** Karenz nach `expiresAt`, bevor eine ausgebliebene Erneuerung als Ablauf gilt. */
  graceMs?: number;
  now?: () => number;
  /** Wird genau einmal je Ablauf aufgerufen (Cache leeren, Abos beenden). */
  onExpired?: () => void;
}

export const SESSION_GRACE_MS = 30_000;
/** setTimeout verträgt höchstens 2^31-1 ms; längere Fristen werden in Etappen geprüft. */
const MAX_TIMER_MS = 2 ** 31 - 1;

export function useSessionGuard({
  source,
  isAuthenticated,
  graceMs = SESSION_GRACE_MS,
  now = Date.now,
  onExpired,
}: UseSessionGuardOptions): SessionGuardState {
  const [state, setState] = useState<SessionGuardState>(() => ({
    status: isAuthenticated ? 'aktiv' : 'abgelaufen',
    renewedAt: null,
    expiredAt: isAuthenticated ? null : new Date(now()).toISOString(),
  }));
  const expiresAtRef = useRef<number | null>(null);
  const nowRef = useRef(now);
  nowRef.current = now;
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const statusRef = useRef(state.status);
  const [timerKey, setTimerKey] = useState(0);

  const expire = useCallback(() => {
    if (statusRef.current === 'abgelaufen') return;
    statusRef.current = 'abgelaufen';
    setState((prev) => ({
      ...prev,
      status: 'abgelaufen',
      expiredAt: new Date(nowRef.current()).toISOString(),
    }));
    onExpiredRef.current?.();
  }, []);

  const revive = useCallback((status: 'aktiv' | 'erneuert', expiresAt: number | null) => {
    expiresAtRef.current = expiresAt;
    statusRef.current = status;
    setState((prev) => ({
      status,
      renewedAt: status === 'erneuert' ? new Date(nowRef.current()).toISOString() : prev.renewedAt,
      expiredAt: null,
    }));
  }, []);

  // Auth-Kontext: Abmeldung (auch durch fehlgeschlagene Erneuerung) wirkt sofort.
  useEffect(() => {
    if (!isAuthenticated) expire();
    // Ohne Token-Quelle (lokaler Modus) gilt eine erneute Anmeldung als neue aktive Sitzung.
    else if (!source && statusRef.current === 'abgelaufen') revive('aktiv', null);
  }, [isAuthenticated, source, expire, revive]);

  // Token-Ereignisse der Quelle.
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    void source
      .read()
      .then((expiresAt) => {
        if (cancelled) return;
        if (expiresAt === null) {
          expire();
          return;
        }
        expiresAtRef.current = expiresAt;
        setTimerKey((k) => k + 1); // Frist sofort auf die gelesene Ablaufzeit stellen
      })
      .catch(() => {
        // Lesefehler (z. B. offline) sind kein Ablauf; die Ablauffrist entscheidet.
      });
    const unsubscribe = source.subscribe((event, expiresAt) => {
      if (event === 'abgemeldet' || expiresAt === null) {
        expire();
        return;
      }
      revive(event === 'erneuert' ? 'erneuert' : 'aktiv', expiresAt);
      setTimerKey((k) => k + 1);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [source, expire, revive]);

  // Ablauffrist: kommt bis expiresAt + Karenz keine Erneuerung, ist die Sitzung abgelaufen.
  const check = useCallback(() => {
    const expiresAt = expiresAtRef.current;
    if (expiresAt === null || !Number.isFinite(expiresAt)) return;
    if (nowRef.current() >= expiresAt + graceMs) expire();
  }, [expire, graceMs]);

  useEffect(() => {
    if (!source || state.status === 'abgelaufen') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const expiresAt = expiresAtRef.current;
      const delay =
        expiresAt === null || !Number.isFinite(expiresAt)
          ? 60_000
          : Math.max(0, expiresAt + graceMs - nowRef.current());
      timer = setTimeout(
        () => {
          check();
          if (statusRef.current !== 'abgelaufen') schedule();
        },
        Math.min(delay, MAX_TIMER_MS),
      );
    };
    schedule();
    // Hintergrund-Tabs drosseln Timer: beim Zurückkehren und bei Wiederverbindung sofort prüfen.
    const onWake = () => check();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [source, state.status, timerKey, check, graceMs]);

  return state;
}
