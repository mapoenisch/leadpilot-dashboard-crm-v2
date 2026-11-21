// Executive Dashboard V2 (Auftrag 162 / P11a):
// Dienstschicht für Teamverwaltung in Supabase.
// Vollständig typisiert, RLS- und RPC-konform.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import {
  type DashboardTeamMemberV2,
  type DashboardTeamV2,
  type StorageResult,
  type SupabaseErrorLike,
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
  const classified = classifyDashboardV2Error(cause as SupabaseErrorLike);
  if (classified.kind === 'server_funktion_fehlt') {
    return { ok: false, error: classified };
  }
  logger.warn('[dashboardTeamsV2] Operation fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

/**
 * Listet alle Teams der Organisation des Nutzers auf.
 * Liefert für Admins alle Teams, für Mitglieder/Zuschauer nur zugeordnete Teams.
 * `signal` bricht den Abruf ab (z. B. wenn der Kiosk beim Sitzungsablauf ausgehängt wird).
 */
export async function listDashboardTeamsV2(
  signal?: AbortSignal,
): Promise<StorageResult<DashboardTeamV2[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }
  if (signal?.aborted) {
    return { ok: false, error: { kind: 'technisch' } };
  }

  try {
    const request = supabase.rpc('list_dashboard_teams_v2');
    const { data, error, status } = signal ? await request.abortSignal(signal) : await request;
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const rows = (Array.isArray(data) ? data : []) as Array<{
      id: string;
      name: string;
      description: string | null;
      member_count: number | string;
      dashboard_count: number | string;
      can_write: boolean;
      is_member: boolean;
    }>;

    const teams: DashboardTeamV2[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      memberCount: Number(r.member_count ?? 0),
      dashboardCount: Number(r.dashboard_count ?? 0),
      canWrite: Boolean(r.can_write),
      isMember: Boolean(r.is_member),
    }));

    return { ok: true, value: teams };
  } catch (cause) {
    if (signal?.aborted) return { ok: false, error: { kind: 'technisch' } };
    return failTechnically(cause);
  }
}

/**
 * Erstellt ein neues Team in der Organisation (nur Admins).
 */
export async function createDashboardTeamV2(
  name: string,
  description?: string | null,
): Promise<StorageResult<{ teamId: string; createdAt: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('create_dashboard_team_v2', {
      p_name: name,
      p_description: description ?? null,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      id?: string;
      team_id?: string;
      created_at: string;
    };

    return {
      ok: true,
      value: {
        teamId: row.id ?? row.team_id ?? '',
        createdAt: row.created_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Aktualisiert Name und Beschreibung eines Teams (nur Admins).
 */
export async function updateDashboardTeamV2(
  teamId: string,
  name: string,
  description?: string | null,
): Promise<StorageResult<{ teamId: string; updatedAt: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('update_dashboard_team_v2', {
      p_team_id: teamId,
      p_name: name,
      p_description: description ?? null,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      id?: string;
      team_id?: string;
      updated_at: string;
    };

    return {
      ok: true,
      value: {
        teamId: row.id ?? row.team_id ?? teamId,
        updatedAt: row.updated_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Löscht ein Team (nur Admins, scheitert wenn Dashboards vorhanden sind).
 */
export async function deleteDashboardTeamV2(
  teamId: string,
): Promise<StorageResult<{ deletedTeamId: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('delete_dashboard_team_v2', {
      p_team_id: teamId,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      { deleted_team_id?: string } | boolean | undefined;
    const deletedId =
      typeof row === 'object' && row !== null && 'deleted_team_id' in row
        ? (row.deleted_team_id ?? teamId)
        : teamId;

    return {
      ok: true,
      value: {
        deletedTeamId: deletedId,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Listet alle Mitglieder eines Teams auf (nur Admins).
 */
export async function listDashboardTeamMembersV2(
  teamId: string,
): Promise<StorageResult<DashboardTeamMemberV2[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('list_dashboard_team_members_v2', {
      p_team_id: teamId,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const rows = (Array.isArray(data) ? data : []) as Array<{
      user_id: string;
      email: string;
      org_role: string;
      org_status: string;
      team_role: string;
      created_at: string;
    }>;

    const members: DashboardTeamMemberV2[] = rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      orgRole: r.org_role,
      orgStatus: r.org_status,
      teamRole: r.team_role,
      createdAt: r.created_at,
    }));

    return { ok: true, value: members };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Fügt ein Mitglied zu einem Team hinzu (nur Admins).
 */
export async function addDashboardTeamMemberV2(
  teamId: string,
  userId: string,
): Promise<StorageResult<{ teamId: string; userId: string; createdAt?: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('add_dashboard_team_member_v2', {
      p_team_id: teamId,
      p_user_id: userId,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      { team_id?: string; user_id?: string; created_at?: string } | boolean | undefined;
    const createdAt =
      typeof row === 'object' && row !== null && 'created_at' in row ? row.created_at : undefined;

    return {
      ok: true,
      value: {
        teamId,
        userId,
        createdAt,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Entfernt ein Mitglied aus einem Team (nur Admins).
 */
export async function removeDashboardTeamMemberV2(
  teamId: string,
  userId: string,
): Promise<StorageResult<{ removed: boolean }>> {
  if (!isSupabaseConfigured || !supabase) {
    return unavailableResult();
  }

  try {
    const { data, error, status } = await supabase.rpc('remove_dashboard_team_member_v2', {
      p_team_id: teamId,
      p_user_id: userId,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const removed =
      typeof row === 'boolean'
        ? row
        : typeof row === 'object' && row !== null && 'removed' in row
          ? Boolean((row as { removed: boolean }).removed)
          : true;

    return {
      ok: true,
      value: {
        removed,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}
