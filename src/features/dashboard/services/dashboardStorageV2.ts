// Executive Dashboard V2 (Auftrag 150 / P07):
// Client-Speicheradapter für DashboardConfigV2 in Supabase.
// Vollständig konform mit docs/dashboard/GRID_VERGLEICH_ZIELMODELL_146.md.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { type DashboardConfigV2, validateDashboardConfigV2 } from '../model/dashboardConfigV2';

export type DashboardV2StorageError =
  | { kind: 'konflikt'; detail?: string }
  | { kind: 'ungueltig'; detail: string }
  | { kind: 'nicht_berechtigt' }
  | { kind: 'nicht_gefunden' }
  | { kind: 'keine_mitgliedschaft' }
  | { kind: 'sitzung_abgelaufen' }
  | { kind: 'nicht_konfiguriert' }
  | { kind: 'technisch' };

export type StorageResult<T> =
  { ok: true; value: T } | { ok: false; error: DashboardV2StorageError };

export interface StoredDashboardV2Row {
  id: string;
  title: string;
  scope: 'personal' | 'team';
  revision: number;
  config: DashboardConfigV2;
  updatedAt: string;
}

export interface DashboardV2RevisionRow {
  revision: number;
  title: string;
  createdByUserId: string;
  createdAt: string;
  changeSummary: string | null;
}

export interface SavedDashboardV2Result {
  dashboardId: string;
  revision: number;
  updatedAt: string;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

const SESSION_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

export function classifyDashboardV2Error(
  error: SupabaseErrorLike | null | undefined,
  status?: number,
): DashboardV2StorageError {
  const message = error?.message ?? '';
  if (message.includes('LP_DASHBOARD_CONFLICT')) {
    return { kind: 'konflikt', detail: error?.details ?? undefined };
  }
  if (message.includes('LP_DASHBOARD_INVALID')) {
    return { kind: 'ungueltig', detail: error?.details ?? message };
  }
  if (message.includes('LP_DASHBOARD_NOT_FOUND') || message.includes('LP_REVISION_NOT_FOUND')) {
    return { kind: 'nicht_gefunden' };
  }
  if (
    message.includes('LP_FORBIDDEN') ||
    message.includes('LP_TEAM_DASHBOARDS_LOCKED') ||
    message.includes('LP_INVALID_SCOPE')
  ) {
    return { kind: 'nicht_berechtigt' };
  }
  if (message.includes('LP_AUTH_REQUIRED') || message.includes('LP_DASHBOARD_NO_MEMBERSHIP')) {
    return { kind: 'keine_mitgliedschaft' };
  }
  if (status === 401 || SESSION_CODES.has(error?.code ?? '') || /jwt expired/i.test(message)) {
    return { kind: 'sitzung_abgelaufen' };
  }
  return { kind: 'technisch' };
}

function failTechnically<T>(cause: unknown): StorageResult<T> {
  logger.warn('[dashboardStorageV2] Operation fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

// In-Memory-Mock-Speicher für Offline, Tests und lokale Entwicklung
interface InMemoryEntry {
  row: StoredDashboardV2Row;
  revisions: DashboardV2RevisionRow[];
}
const inMemoryStore = new Map<string, InMemoryEntry>();

export function resetInMemoryDashboardV2Storage(): void {
  inMemoryStore.clear();
}

/** Lädt das persönliche Dashboard des Nutzers. Liefert null wenn keines existiert. */
export async function loadPersonalDashboardV2(): Promise<
  StorageResult<StoredDashboardV2Row | null>
> {
  if (!isSupabaseConfigured || !supabase) {
    const first = Array.from(inMemoryStore.values())[0]?.row ?? null;
    return { ok: true, value: first };
  }

  try {
    const { data, error, status } = await supabase.rpc('load_personal_dashboard_v2');
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

/** Liest die Revisionshistorie eines Dashboards. */
export async function getDashboardV2Revisions(
  dashboardId: string,
): Promise<StorageResult<DashboardV2RevisionRow[]>> {
  if (!isSupabaseConfigured || !supabase) {
    const entry = inMemoryStore.get(dashboardId);
    return { ok: true, value: entry?.revisions ?? [] };
  }

  try {
    const { data, error, status } = await supabase.rpc('get_dashboard_v2_revisions', {
      p_dashboard_id: dashboardId,
    });

    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const rows = (Array.isArray(data) ? data : []) as Array<{
      revision: number;
      title: string;
      created_by_user_id: string;
      created_at: string;
      change_summary: string | null;
    }>;

    return {
      ok: true,
      value: rows.map((r) => ({
        revision: r.revision,
        title: r.title,
        createdByUserId: r.created_by_user_id,
        createdAt: r.created_at,
        changeSummary: r.change_summary,
      })),
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/** Stellt eine frühere Revision als neue Revision an der Spitze der Historie wieder her. */
export async function restoreDashboardV2Revision(params: {
  dashboardId: string;
  targetRevision: number;
  expectedRevision: number;
}): Promise<StorageResult<SavedDashboardV2Result>> {
  if (!isSupabaseConfigured || !supabase) {
    const entry = inMemoryStore.get(params.dashboardId);
    if (!entry) return { ok: false, error: { kind: 'nicht_gefunden' } };
    const rev = entry.revisions.find((r) => r.revision === params.targetRevision);
    if (!rev) return { ok: false, error: { kind: 'nicht_gefunden' } };

    return saveDashboardV2({
      dashboardId: params.dashboardId,
      expectedRevision: params.expectedRevision,
      title: rev.title,
      config: entry.row.config,
      changeSummary: `Wiederhergestellt von Revision ${params.targetRevision}`,
    });
  }

  try {
    const { data, error, status } = await supabase.rpc('restore_dashboard_revision_v2', {
      p_dashboard_id: params.dashboardId,
      p_target_revision: params.targetRevision,
      p_expected_revision: params.expectedRevision,
    });

    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      dashboard_id: string;
      new_revision: number;
      updated_at: string;
    };

    return {
      ok: true,
      value: {
        dashboardId: row.dashboard_id,
        revision: row.new_revision,
        updatedAt: row.updated_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}
