// Executive Dashboard V2 (Auftrag 162 / P11a):
// Dienstschicht für Team-Freigaben und Dashboard-Zugriff in Supabase.
// Vollständig typisiert, RLS- und RPC-konform.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { validateDashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  type AccessibleDashboardListItemV2,
  type LoadedDashboardV2Result,
  type StorageResult,
  classifyDashboardV2Error,
} from './dashboardStorageV2Types';

function unavailableResult<T>(): StorageResult<T> {
  return {
    ok: false,
    error: {
      kind: 'nicht_verfuegbar',
      message: 'Team-Freigaben brauchen eine Server-Verbindung',
    },
  };
}

function failTechnically<T>(cause: unknown): StorageResult<T> {
  logger.warn('[dashboardSharingV2] Operation fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

/**
 * Listet alle für den Nutzer zugänglichen Dashboards (eigene persönliche und freigegebene Team-Dashboards).
 */
export async function listAccessibleDashboardsV2(): Promise<
  StorageResult<AccessibleDashboardListItemV2[]>
> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('list_accessible_dashboards_v2');
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const rows = (Array.isArray(data) ? data : []) as Array<{
      id: string;
      title: string;
      scope: 'personal' | 'team';
      revision: number;
      tile_count: number;
      section_count: number;
      updated_at: string;
      team_id: string | null;
      team_name: string | null;
      can_write: boolean;
    }>;

    const items: AccessibleDashboardListItemV2[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      scope: r.scope,
      revision: Number(r.revision),
      tileCount: Number(r.tile_count ?? 0),
      sectionCount: Number(r.section_count ?? 0),
      updatedAt: r.updated_at,
      teamId: r.team_id ?? null,
      teamName: r.team_name ?? null,
      canWrite: Boolean(r.can_write),
    }));

    return { ok: true, value: items };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Lädt ein beliebiges für den Nutzer lesbares Dashboard (persönlich oder Team) inkl. canWrite-Flag.
 */
export async function loadDashboardV2(
  dashboardId: string,
): Promise<StorageResult<LoadedDashboardV2Result>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('load_dashboard_v2', {
      p_dashboard_id: dashboardId,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }

    const raw = row as {
      id: string;
      title: string;
      scope: 'personal' | 'team';
      team_id: string | null;
      revision: number;
      config: unknown;
      updated_at: string;
      can_write: boolean;
    };

    const valid = validateDashboardConfigV2(raw.config);
    if (!valid.ok) {
      return { ok: false, error: { kind: 'ungueltig', detail: valid.error } };
    }

    return {
      ok: true,
      value: {
        id: raw.id,
        title: raw.title,
        scope: raw.scope,
        teamId: raw.team_id ?? null,
        revision: Number(raw.revision),
        config: valid.config,
        updatedAt: raw.updated_at,
        canWrite: Boolean(raw.can_write),
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Löscht ein Team-Dashboard atomar mit Revisionsprüfung (nur Nutzer mit Schreibrecht).
 */
export async function deleteTeamDashboardV2(
  dashboardId: string,
  expectedRevision: number,
): Promise<StorageResult<{ deletedId: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('delete_team_dashboard_v2', {
      p_dashboard_id: dashboardId,
      p_expected_revision: expectedRevision,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      deleted_id: string;
    };

    return {
      ok: true,
      value: {
        deletedId: row.deleted_id,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Kopiert ein Dashboard (persönlich -> Team, Team -> persönlich, oder Team -> Team).
 */
export async function copyDashboardV2(params: {
  sourceId: string;
  targetScope: 'personal' | 'team';
  targetTeamId?: string | null;
  title: string;
}): Promise<StorageResult<{ dashboardId: string; revision: number; createdAt: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('copy_dashboard_v2', {
      p_source_id: params.sourceId,
      p_target_scope: params.targetScope,
      p_target_team_id: params.targetTeamId ?? null,
      p_title: params.title,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      dashboard_id: string;
      revision: number;
      created_at: string;
    };

    return {
      ok: true,
      value: {
        dashboardId: row.dashboard_id,
        revision: Number(row.revision),
        createdAt: row.created_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}
