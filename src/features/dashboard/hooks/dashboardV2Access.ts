// Auftrag 163 (P11b): Ausgelagerte Lade-, Listen- und Zugriffslogik für Dashboards (Persönlich & Teams).
// Stellt sicher, dass useDashboardV2Storage unter der 400-Zeilen-Grenze bleibt und bei fehlender
// Serverfunktion sauber auf den persönlichen Pfad zurückfällt.

import { isSupabaseConfigured, supabase } from '@/services/db/supabaseClient';
import type {
  AccessibleDashboardListItemV2,
  DashboardV2StorageError,
  PersonalDashboardListItemV2,
  StorageResult,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import {
  loadPersonalDashboardV2,
  getOrCreatePersonalDashboardV2,
  setActiveDashboardV2Id,
  getActiveDashboardV2Id,
} from '../services/dashboardStorageV2';
import { listPersonalDashboardsV2 } from '../services/dashboardSelectionV2';
import { listAccessibleDashboardsV2, loadDashboardV2 } from '../services/dashboardSharingV2';
import { listDashboardTeamsV2 } from '../services/dashboardTeamsV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

/**
 * Wandelt persönliche Listeneinträge in das AccessibleDashboardListItemV2-Format um.
 */
export function mapPersonalToAccessible(
  items: PersonalDashboardListItemV2[],
): AccessibleDashboardListItemV2[] {
  return items.map((item) => ({
    ...item,
    teamId: null,
    teamName: null,
    canWrite: true,
  }));
}

/**
 * Listet alle zugänglichen Dashboards.
 * Fällt bei fehlender Serverfunktion (PGRST202/42883) transparent auf persönliche Dashboards zurück.
 */
export async function fetchAccessibleDashboards(): Promise<
  StorageResult<AccessibleDashboardListItemV2[]>
> {
  if (!isSupabaseConfigured || !supabase) {
    const personal = await listPersonalDashboardsV2();
    if (!personal.ok) return personal;
    return { ok: true, value: mapPersonalToAccessible(personal.value) };
  }

  const accessible = await listAccessibleDashboardsV2();
  if (accessible.ok) {
    return accessible;
  }

  // Rückfall bei fehlender Team-Sharing-Migration auf Hosted (Auftrag 163 §2.8)
  if (accessible.error.kind === 'server_funktion_fehlt') {
    const personal = await listPersonalDashboardsV2();
    if (!personal.ok) return personal;
    return { ok: true, value: mapPersonalToAccessible(personal.value) };
  }

  return accessible;
}

/**
 * Lädt ein bestimmtes Dashboard (persönlich oder Team).
 */
export async function fetchDashboardById(
  dashboardId: string,
): Promise<StorageResult<StoredDashboardV2Row>> {
  if (!isSupabaseConfigured || !supabase) {
    const res = await loadPersonalDashboardV2(dashboardId);
    if (!res.ok) return res;
    if (!res.value) return { ok: false, error: { kind: 'nicht_gefunden' } };
    return {
      ok: true,
      value: {
        ...res.value,
        teamId: null,
        teamName: null,
        canWrite: true,
      },
    };
  }

  const res = await loadDashboardV2(dashboardId);
  if (res.ok) {
    const loaded = res.value;
    let teamName: string | null = null;
    if (loaded.teamId) {
      const teamsRes = await listDashboardTeamsV2();
      if (teamsRes.ok) {
        const found = teamsRes.value.find((t) => t.id === loaded.teamId);
        if (found) teamName = found.name;
      }
    }
    return {
      ok: true,
      value: {
        id: loaded.id,
        title: loaded.title,
        scope: loaded.scope,
        revision: loaded.revision,
        config: loaded.config,
        updatedAt: loaded.updatedAt,
        teamId: loaded.teamId,
        teamName,
        canWrite: loaded.canWrite,
      },
    };
  }

  if (res.error.kind === 'server_funktion_fehlt') {
    const personalRes = await loadPersonalDashboardV2(dashboardId);
    if (!personalRes.ok) return personalRes;
    if (!personalRes.value) return { ok: false, error: { kind: 'nicht_gefunden' } };
    return {
      ok: true,
      value: {
        ...personalRes.value,
        teamId: null,
        teamName: null,
        canWrite: true,
      },
    };
  }

  return res;
}

/**
 * Lädt und aktiviert ein beliebiges Dashboard über die ID.
 */
export async function loadAndActivateAnyDashboardV2(
  dashboardId: string,
  orgId: string,
  userId: string,
  setDashboard: (d: StoredDashboardV2Row) => void,
): Promise<{ ok: true } | { ok: false; error: DashboardV2StorageError }> {
  const loaded = await fetchDashboardById(dashboardId);
  if (loaded.ok) {
    setActiveDashboardV2Id(orgId, userId, loaded.value.id);
    setDashboard(loaded.value);
    return { ok: true };
  }
  return { ok: false, error: loaded.error };
}

export interface ResolveDashboardOptions {
  explicitDashboardId?: string;
  preferredDashboardId?: string;
  orgId: string;
  userId: string;
  initialV2Config: DashboardConfigV2;
}

export interface ResolveDashboardResult {
  dashboard: StoredDashboardV2Row;
  fallbackNotice?: string | null;
}

/**
 * Löst das initial zu öffnende Dashboard auf (gemerkt, bevorzugt oder Standard-Migriert).
 * Bei Verlust des Zugriffs auf ein gemerktes Dashboard wird ohne Fehler das erste persönliche
 * Dashboard geöffnet (Auftrag 163 §2.2 Nr. 15).
 */
export async function resolveInitialOrActiveDashboard({
  explicitDashboardId,
  preferredDashboardId,
  orgId,
  userId,
  initialV2Config,
}: ResolveDashboardOptions): Promise<StorageResult<ResolveDashboardResult>> {
  const targetId =
    explicitDashboardId ?? preferredDashboardId ?? getActiveDashboardV2Id(orgId, userId);

  if (targetId) {
    const loaded = await fetchDashboardById(targetId);
    if (loaded.ok) {
      setActiveDashboardV2Id(orgId, userId, loaded.value.id);
      return { ok: true, value: { dashboard: loaded.value } };
    }

    if (
      loaded.error.kind === 'nicht_gefunden' ||
      loaded.error.kind === 'nicht_berechtigt' ||
      loaded.error.kind === 'team_zugriff_entzogen'
    ) {
      const personalRes = await getOrCreatePersonalDashboardV2({
        initialConfig: initialV2Config,
        title: initialV2Config.title,
      });

      if (personalRes.ok) {
        setActiveDashboardV2Id(orgId, userId, personalRes.value.id);
        return {
          ok: true,
          value: {
            dashboard: {
              ...personalRes.value,
              teamId: null,
              teamName: null,
              canWrite: true,
            },
            fallbackNotice: 'Das zuletzt geöffnete Team-Dashboard ist nicht mehr verfügbar.',
          },
        };
      }
      return personalRes;
    }

    // Ladefehler außerhalb des Rechteentzugs (z.B. technisch, Netzwerk) unverändert zurückgeben
    return { ok: false, error: loaded.error };
  }

  const createRes = await getOrCreatePersonalDashboardV2({
    initialConfig: initialV2Config,
    title: initialV2Config.title,
    preferredId: targetId ?? undefined,
  });

  if (!createRes.ok) {
    return createRes;
  }

  setActiveDashboardV2Id(orgId, userId, createRes.value.id);
  return {
    ok: true,
    value: {
      dashboard: {
        ...createRes.value,
        teamId: null,
        teamName: null,
        canWrite: true,
      },
    },
  };
}
