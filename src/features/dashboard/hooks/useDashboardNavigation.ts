// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Navigation zwischen Ansicht und Kachel-Details.
// Sitzungsfilter und Fokusziel reisen im Verlaufseintrag (`location.state`) mit, nie in einem
// globalen Speicher. Der Browser hebt `history.state` über einen Reload auf; ein Ladezeichen je
// Seitenaufruf sorgt dafür, dass nach dem Reload wieder der gespeicherte Kontext gilt (Plan §8,
// Teilauftrag 7). Ein anderer Benutzer oder eine andere Organisation übernimmt nichts.
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrganization } from '@/auth/organizationContext';
import type { DashboardFilters } from '../model/dashboardConfig';
import { DASHBOARD_PATH, tileDetailPath } from '../model/dashboardRollout';

/** Sitzungsfilter wie im Arbeitsbereich: `null` = keiner gesetzt, gespeicherte Startfilter gelten. */
export type SessionFilters = { value: DashboardFilters | undefined } | null;

/** Wechselt je Seitenaufruf; ein Zustand aus einem früheren Aufruf (Reload) gilt nicht mehr. */
const PAGE_LOAD = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

interface StoredNavState {
  dashboardNav: {
    load: string;
    identity: string;
    session: SessionFilters;
    /** Kachel, deren „Details“-Knopf bei der Rückkehr den Fokus erhält. */
    returnFocus?: string;
    /** Detaileintrag direkt über dem vorbereiteten Dashboard-Eintrag (aus der Ansicht geöffnet). */
    fromDashboard?: true;
  };
}

export interface DashboardNavContext {
  session: SessionFilters;
  returnFocus: string | null;
  fromDashboard: boolean;
}

/** Liest den mitgereisten Kontext; alles Unbekannte, Veraltete oder Fremde ergibt `null`. */
export function readDashboardNavState(
  state: unknown,
  identity: string | null,
  load: string = PAGE_LOAD,
): DashboardNavContext | null {
  if (!identity || typeof state !== 'object' || state === null) return null;
  const nav = (state as Partial<StoredNavState>).dashboardNav;
  if (!nav || nav.load !== load || nav.identity !== identity) return null;
  const session =
    nav.session && typeof nav.session === 'object' && 'value' in nav.session ? nav.session : null;
  return {
    session,
    returnFocus: typeof nav.returnFocus === 'string' ? nav.returnFocus : null,
    fromDashboard: nav.fromDashboard === true,
  };
}

export function buildDashboardNavState(
  identity: string,
  session: SessionFilters,
  returnFocus?: string,
  load: string = PAGE_LOAD,
  fromDashboard = false,
): StoredNavState {
  return {
    dashboardNav: {
      load,
      identity,
      session,
      ...(returnFocus ? { returnFocus } : {}),
      ...(fromDashboard ? { fromDashboard: true as const } : {}),
    },
  };
}

export function useDashboardNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useOrganization();
  const identity = session ? `${session.organizationId}|${session.userId}` : null;
  const incoming = useMemo(
    () => readDashboardNavState(location.state, identity),
    [location.state, identity],
  );

  /**
   * Von der Ansicht zu den Details. Der aktuelle Eintrag merkt sich vorher Filter und Kachel, damit
   * auch die Zurück-Taste des Browsers beides wiederherstellt.
   */
  const openDetails = useCallback(
    (tileId: string, filters: SessionFilters) => {
      if (!identity) return;
      navigate(location.pathname, {
        replace: true,
        state: buildDashboardNavState(identity, filters, tileId),
      });
      navigate(tileDetailPath(tileId), {
        state: buildDashboardNavState(identity, filters, undefined, PAGE_LOAD, true),
      });
    },
    [identity, location.pathname, navigate],
  );

  /**
   * Von den Details zurück zur Ansicht, mit Filtern und Fokusziel. Aus der Ansicht geöffnet: zurück
   * zum vorbereiteten Eintrag, damit kein zweites Dashboard im Verlauf landet (Codex PR #61). Nur ein
   * Direktaufruf oder Reload legt ein neues Dashboard-Ziel an.
   */
  const fromDashboard = incoming?.fromDashboard === true;
  const backToDashboard = useCallback(
    (tileId: string | null, filters: SessionFilters) => {
      if (fromDashboard) {
        navigate(-1);
        return;
      }
      navigate(DASHBOARD_PATH, {
        state: identity ? buildDashboardNavState(identity, filters, tileId ?? undefined) : null,
      });
    },
    [fromDashboard, identity, navigate],
  );

  const goTo = useCallback((to: string) => navigate(to), [navigate]);

  return { identity, incoming, openDetails, backToDashboard, goTo };
}
