// Executive Dashboard V2 (Auftrag 174 / P16b §2 Nr. 2–3): Welcher Editor gilt für diese Ansicht?
//
// - Reihenfolge: Override (Tests/Pilot) > Server-Schalter der aktiven Organisation > Build-Variable.
// - Der Serverstand wird beim Öffnen geladen (und dabei ggf. die Umstellung vollzogen) und dann
//   für die laufende Ansicht festgehalten. Ändert sich der Schalter, während die Ansicht offen
//   ist, verwirft das nichts: Es erscheint nur ein Hinweis, der Wechsel wirkt beim nächsten Öffnen.
// - Die Beobachtung während der offenen Ansicht fragt nur ab (vollziehen = false).

import { useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { isSupabaseConfigured } from '@/services/db/supabaseClient';
import {
  getLatchedDashboardEditorServerChoice,
  latchDashboardEditorServerChoice,
  readDashboardEditorBuildFlag,
  readDashboardEditorOverride,
  resolveDashboardEditorV2,
  type DashboardEditorServerChoice,
  type DashboardEditorServerState,
} from '../model/dashboardRollout';
import {
  supabaseEditorRolloutService,
  type DashboardEditorRolloutService,
} from '../services/dashboardEditorRolloutService';

export const EDITOR_ROLLOUT_POLL_MS = 60_000;

export const EDITOR_SWITCH_NOTICE: Record<'v1' | 'v2', string> = {
  v2: 'Der neue Editor ist ab dem nächsten Öffnen aktiv. Deine offene Bearbeitung bleibt unverändert.',
  v1: 'Ab dem nächsten Öffnen gilt wieder der alte Editor. Deine offene Bearbeitung bleibt unverändert.',
};

export interface DashboardEditorChoice {
  /** 'laden', solange der Serverstand fehlt; danach die feste Wahl für diese Ansicht. */
  v2: boolean | 'laden';
  /** Geladener Serverstand (null bei Override oder ohne Server). */
  server: DashboardEditorServerChoice | null;
  /** Abweichender Serverstand seit dem Öffnen (wirkt erst beim nächsten Öffnen). */
  pendingEditor: 'v1' | 'v2' | null;
}

export interface UseDashboardEditorChoiceOptions {
  service?: DashboardEditorRolloutService;
  /** Detailseite: festgehaltenen Stand der Dashboard-Ansicht übernehmen statt neu umzustellen. */
  reuseLatched?: boolean;
  /** Für Tests: Supabase als verfügbar behandeln. */
  configured?: boolean;
  pollMs?: number;
}

export function useDashboardEditorChoice(
  options: UseDashboardEditorChoiceOptions = {},
): DashboardEditorChoice {
  const {
    service = supabaseEditorRolloutService,
    reuseLatched = false,
    configured = isSupabaseConfigured,
    pollMs = EDITOR_ROLLOUT_POLL_MS,
  } = options;
  const { session, isLoading } = useOrganization();
  const override = readDashboardEditorOverride();
  const key = session ? `${session.organizationId}:${session.userId}` : null;
  const serverNeeded = override === null && configured && key !== null;
  // Solange der Organisationskontext lädt, ist noch keine Wahl möglich (kein Aufblitzen).
  const waitingForSession = override === null && configured && key === null && isLoading;

  const [server, setServer] = useState<DashboardEditorServerState>(() => {
    if (waitingForSession) return 'laden';
    if (!serverNeeded) return 'nicht_verfuegbar';
    const latched = reuseLatched && key ? getLatchedDashboardEditorServerChoice(key) : null;
    return latched ?? 'laden';
  });
  const [pendingEditor, setPendingEditor] = useState<'v1' | 'v2' | null>(null);
  const openedWith = useRef<'v1' | 'v2' | null>(typeof server === 'object' ? server.editor : null);

  // Laden beim Öffnen (einmal je Organisation/Nutzer und Ansicht).
  useEffect(() => {
    if (!serverNeeded || !key) {
      setServer(waitingForSession ? 'laden' : 'nicht_verfuegbar');
      return;
    }
    if (openedWith.current !== null) return;
    let cancelled = false;
    void service.status(true).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        openedWith.current = res.value.editor;
        latchDashboardEditorServerChoice(key, res.value);
        setServer(res.value);
      } else {
        // Ohne Serverantwort entscheidet die Build-Variable (Standard: alter Editor).
        latchDashboardEditorServerChoice(key, null);
        setServer('nicht_verfuegbar');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, serverNeeded, service, waitingForSession]);

  // Beobachtung während die Ansicht offen ist: nur Hinweis, kein Wechsel.
  useEffect(() => {
    if (!serverNeeded || typeof window === 'undefined') return;
    let cancelled = false;
    const check = () => {
      if (openedWith.current === null) return;
      void service.status(false).then((res) => {
        if (cancelled || !res.ok || openedWith.current === null) return;
        setPendingEditor(res.value.editor === openedWith.current ? null : res.value.editor);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const timer = window.setInterval(check, pollMs);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollMs, serverNeeded, service]);

  return {
    v2: resolveDashboardEditorV2({
      override,
      server,
      buildFlag: readDashboardEditorBuildFlag(),
    }),
    server: typeof server === 'object' ? server : null,
    pendingEditor,
  };
}
