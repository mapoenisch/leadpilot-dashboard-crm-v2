// Executive Dashboard V2 (Auftrag 150 / P07):
// Client-Speicheradapter für DashboardConfigV2 in Supabase.
// Vollständig konform mit docs/dashboard/GRID_VERGLEICH_ZIELMODELL_146.md.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { type DashboardConfigV2, validateDashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  type DashboardV2RevisionRow,
  type DashboardV2StorageError,
  type SavedDashboardV2Result,
  type StorageResult,
  type StoredDashboardV2Row,
  classifyDashboardV2Error,
  getActiveDashboardV2Id,
  setActiveDashboardV2Id,
} from './dashboardStorageV2Types';

export type {
  DashboardV2RevisionRow,
  DashboardV2StorageError,
  SavedDashboardV2Result,
  StorageResult,
  StoredDashboardV2Row,
};
export { classifyDashboardV2Error, getActiveDashboardV2Id, setActiveDashboardV2Id };

function failTechnically<T>(cause: unknown): StorageResult<T> {
  logger.warn('[dashboardStorageV2] Operation fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

import {
  getInMemoryDashboard,
  inMemoryStore,
  resetInMemoryDashboardV2Storage,
} from './dashboardInMemoryStoreV2';
export { resetInMemoryDashboardV2Storage };

/** Lädt das persönliche Dashboard des Nutzers (optional gezielt nach dashboardId). */
export async function loadPersonalDashboardV2(
  dashboardId?: string,
): Promise<StorageResult<StoredDashboardV2Row | null>> {
  if (!isSupabaseConfigured || !supabase) {
    const first = getInMemoryDashboard(dashboardId);
    return { ok: true, value: first };
  }

  try {
    const { data, error, status } = await supabase.rpc('load_personal_dashboard_v2', {
      p_dashboard_id: dashboardId ?? null,
    });
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { ok: true, value: null };
    }

    const raw = row as {
      id: string;
      title: string;
      scope: string;
      revision: number;
      config: unknown;
      updated_at: string;
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
        scope: raw.scope as 'personal' | 'team',
        revision: raw.revision,
        config: valid.config,
        updatedAt: raw.updated_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Atomarer Get-or-Create-Pfad für das persönliche Dashboard (Codex P2).
 * Verhindert Duplikate und Rennzustände bei initialer Kopiermigration über mehrere Tabs
 * und bindet bei Vorhandensein gezielt an die bevorzugte Dashboard-ID (z. B. gespeicherte Konfliktkopie).
 */
export async function getOrCreatePersonalDashboardV2(params: {
  initialConfig: DashboardConfigV2;
  title?: string;
  preferredId?: string;
}): Promise<StorageResult<StoredDashboardV2Row>> {
  if (!isSupabaseConfigured || !supabase) {
    const existing = getInMemoryDashboard(params.preferredId);
    if (existing) {
      return { ok: true, value: existing };
    }
    const createRes = await createDashboardV2({
      title: params.title ?? params.initialConfig.title ?? 'Executive Dashboard',
      config: params.initialConfig,
      scope: 'personal',
    });
    if (!createRes.ok) return createRes;
    const loaded = await loadPersonalDashboardV2(createRes.value.dashboardId);
    if (!loaded.ok || !loaded.value) {
      return {
        ok: false,
        error: { kind: 'nicht_gefunden' },
      };
    }
    return { ok: true, value: loaded.value };
  }

  const valid = validateDashboardConfigV2(params.initialConfig);
  if (!valid.ok) {
    return { ok: false, error: { kind: 'ungueltig', detail: valid.error } };
  }

  try {
    const { data, error, status } = await supabase.rpc('get_or_create_personal_dashboard_v2', {
      p_initial_config: params.initialConfig,
      p_title: params.title ?? params.initialConfig.title ?? 'Executive Dashboard',
      p_preferred_id: params.preferredId ?? null,
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
      scope: string;
      revision: number;
      config: unknown;
      updated_at: string;
    };

    const rowValid = validateDashboardConfigV2(raw.config);
    if (!rowValid.ok) {
      return { ok: false, error: { kind: 'ungueltig', detail: rowValid.error } };
    }

    return {
      ok: true,
      value: {
        id: raw.id,
        title: raw.title,
        scope: raw.scope as 'personal' | 'team',
        revision: raw.revision,
        config: rowValid.config,
        updatedAt: raw.updated_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/** Erstellt ein neues Dashboard (Revision 1) atomar. */
export async function createDashboardV2(params: {
  title: string;
  config: DashboardConfigV2;
  scope?: 'personal' | 'team';
  teamId?: string;
  description?: string;
}): Promise<StorageResult<SavedDashboardV2Result>> {
  const valid = validateDashboardConfigV2(params.config);
  if (!valid.ok) {
    return { ok: false, error: { kind: 'ungueltig', detail: valid.error } };
  }

  if (!isSupabaseConfigured || !supabase) {
    const id = params.config.id || 'dash_mock_' + Date.now();
    const now = new Date().toISOString();
    const stored: StoredDashboardV2Row = {
      id,
      title: params.title,
      scope: params.scope ?? 'personal',
      revision: 1,
      config: { ...params.config, id },
      updatedAt: now,
    };
    inMemoryStore.set(id, {
      row: stored,
      revisions: [
        {
          revision: 1,
          title: params.title,
          createdByUserId: params.config.ownerUserId || 'mock_user',
          createdAt: now,
          changeSummary: 'Dashboard initial erstellt',
        },
      ],
    });
    return { ok: true, value: { dashboardId: id, revision: 1, updatedAt: now } };
  }

  try {
    const { data, error, status } = await supabase.rpc('create_dashboard_v2', {
      p_title: params.title,
      p_config: params.config,
      p_scope: params.scope ?? 'personal',
      p_team_id: params.teamId ?? null,
      p_description: params.description ?? null,
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
        revision: row.revision,
        updatedAt: row.created_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/** Speichert ein bestehendes Dashboard atomar mit Revisionsprüfung. */
export async function saveDashboardV2(params: {
  dashboardId: string;
  expectedRevision: number;
  title: string;
  config: DashboardConfigV2;
  changeSummary?: string;
}): Promise<StorageResult<SavedDashboardV2Result>> {
  const valid = validateDashboardConfigV2(params.config);
  if (!valid.ok) {
    return { ok: false, error: { kind: 'ungueltig', detail: valid.error } };
  }

  if (!isSupabaseConfigured || !supabase) {
    const existing = inMemoryStore.get(params.dashboardId);
    if (!existing) {
      if (params.expectedRevision === 0) {
        return createDashboardV2({
          title: params.title,
          config: params.config,
          scope: params.config.scope,
          teamId: params.config.teamId,
        });
      }
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }

    if (existing.row.revision !== params.expectedRevision) {
      return {
        ok: false,
        error: {
          kind: 'konflikt',
          detail: `Revision ${existing.row.revision} != ${params.expectedRevision}`,
        },
      };
    }

    const nextRev = existing.row.revision + 1;
    const now = new Date().toISOString();
    existing.row = {
      ...existing.row,
      title: params.title,
      revision: nextRev,
      config: { ...params.config, id: params.dashboardId },
      updatedAt: now,
    };
    existing.revisions.unshift({
      revision: nextRev,
      title: params.title,
      createdByUserId: params.config.ownerUserId || 'mock_user',
      createdAt: now,
      changeSummary: params.changeSummary ?? null,
    });

    return {
      ok: true,
      value: { dashboardId: params.dashboardId, revision: nextRev, updatedAt: now },
    };
  }

  try {
    const { data, error, status } = await supabase.rpc('save_dashboard_v2', {
      p_dashboard_id: params.dashboardId,
      p_expected_revision: params.expectedRevision,
      p_title: params.title,
      p_config: params.config,
      p_change_summary: params.changeSummary ?? null,
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
      updated_at: string;
    };

    return {
      ok: true,
      value: {
        dashboardId: row.dashboard_id,
        revision: row.revision,
        updatedAt: row.updated_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

export { getDashboardV2Revisions, restoreDashboardV2Revision } from './dashboardRevisionServiceV2';
