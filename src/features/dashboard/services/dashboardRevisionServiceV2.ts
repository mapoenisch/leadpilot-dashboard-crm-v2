// Executive Dashboard V2 (Auftrag 150 / P07, Auftrag 165 / P12):
// Revisionsdienst für Abfrage, Detail, Paging und Wiederherstellung von Dashboard-Revisionen.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { inMemoryStore } from './dashboardInMemoryStoreV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  type DashboardV2RevisionDetail,
  type DashboardV2RevisionPageItem,
  type DashboardV2RevisionRow,
  type SavedDashboardV2Result,
  type StorageResult,
  classifyDashboardV2Error,
} from './dashboardStorageV2Types';
import { saveDashboardV2 } from './dashboardStorageV2';

function failTechnically<T>(cause: unknown): StorageResult<T> {
  logger.warn('[dashboardRevisionServiceV2] Operation fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

/** Liest die Revisionshistorie eines Dashboards (alle Revisionen, ohne config). */
export async function getDashboardV2Revisions(
  dashboardId: string,
): Promise<StorageResult<DashboardV2RevisionRow[]>> {
  if (!isSupabaseConfigured || !supabase || inMemoryStore.has(dashboardId)) {
    const entry = inMemoryStore.get(dashboardId);
    return {
      ok: true,
      value: (entry?.revisions ?? []).map((r) => ({
        revision: r.revision,
        title: r.title,
        createdByUserId: r.createdByUserId,
        createdAt: r.createdAt,
        changeSummary: r.changeSummary,
      })),
    };
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

/** Liest eine Seite der Revisionshistorie mit Autorendetails. */
export async function listDashboardV2RevisionsPage(params: {
  dashboardId: string;
  beforeRevision?: number | null;
  limit?: number;
}): Promise<StorageResult<DashboardV2RevisionPageItem[]>> {
  if (!isSupabaseConfigured || !supabase || inMemoryStore.has(params.dashboardId)) {
    const entry = inMemoryStore.get(params.dashboardId);
    if (!entry) {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }
    const limit = params.limit ?? 50;
    if (limit < 1 || limit > 100) {
      return {
        ok: false,
        error: { kind: 'ungueltig', detail: 'Limit muss zwischen 1 und 100 liegen' },
      };
    }
    const filtered =
      params.beforeRevision != null
        ? entry.revisions.filter((r) => r.revision < params.beforeRevision!)
        : entry.revisions;

    const sorted = [...filtered].sort((a, b) => b.revision - a.revision).slice(0, limit);

    return {
      ok: true,
      value: sorted.map((r) => ({
        revision: r.revision,
        title: r.title,
        createdByUserId: r.createdByUserId,
        createdByIsSelf: true,
        createdByName: 'Du (Demo)',
        createdByActive: true,
        createdAt: r.createdAt,
        changeSummary: r.changeSummary,
      })),
    };
  }

  try {
    const { data, error, status } = await supabase.rpc('list_dashboard_v2_revisions_page', {
      p_dashboard_id: params.dashboardId,
      p_before_revision: params.beforeRevision ?? null,
      p_limit: params.limit ?? 50,
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
      created_by_is_self: boolean;
      created_by_name: string | null;
      created_by_active: boolean;
      created_at: string;
      change_summary: string | null;
    }>;

    return {
      ok: true,
      value: rows.map((r) => ({
        revision: r.revision,
        title: r.title,
        createdByUserId: r.created_by_user_id,
        createdByIsSelf: r.created_by_is_self,
        createdByName: r.created_by_name,
        createdByActive: r.created_by_active,
        createdAt: r.created_at,
        changeSummary: r.change_summary,
      })),
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/** Liest das vollständige Konfigurationsdetail einer bestimmten Revision. */
export async function getDashboardV2RevisionDetail(params: {
  dashboardId: string;
  revision: number;
}): Promise<StorageResult<DashboardV2RevisionDetail>> {
  if (!isSupabaseConfigured || !supabase || inMemoryStore.has(params.dashboardId)) {
    const entry = inMemoryStore.get(params.dashboardId);
    if (!entry) {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }
    const rev = entry.revisions.find((r) => r.revision === params.revision);
    if (!rev) {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }
    const resolvedConfig = rev.config
      ? JSON.parse(JSON.stringify(rev.config))
      : JSON.parse(JSON.stringify(entry.row.config));

    return {
      ok: true,
      value: {
        revision: rev.revision,
        title: rev.title,
        config: resolvedConfig,
        createdByUserId: rev.createdByUserId,
        createdAt: rev.createdAt,
        changeSummary: rev.changeSummary,
      },
    };
  }

  try {
    const { data, error, status } = await supabase.rpc('get_dashboard_v2_revision_detail', {
      p_dashboard_id: params.dashboardId,
      p_revision: params.revision,
    });

    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      revision: number;
      title: string;
      config: DashboardConfigV2;
      created_by_user_id: string;
      created_at: string;
      change_summary: string | null;
    } | null;

    if (!row) {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }

    return {
      ok: true,
      value: {
        revision: row.revision,
        title: row.title,
        config: row.config,
        createdByUserId: row.created_by_user_id,
        createdAt: row.created_at,
        changeSummary: row.change_summary,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/** Stellt eine frühere Revision als neue Revision an der Spitze der Historie wieder her. */
export async function restoreDashboardV2Revision(params: {
  dashboardId: string;
  targetRevision: number;
  expectedRevision?: number;
}): Promise<StorageResult<SavedDashboardV2Result>> {
  if (!isSupabaseConfigured || !supabase || inMemoryStore.has(params.dashboardId)) {
    const entry = inMemoryStore.get(params.dashboardId);
    if (!entry) return { ok: false, error: { kind: 'nicht_gefunden' } };
    const rev = entry.revisions.find((r) => r.revision === params.targetRevision);
    if (!rev) return { ok: false, error: { kind: 'nicht_gefunden' } };

    const restoreConfig = rev.config
      ? JSON.parse(JSON.stringify(rev.config))
      : JSON.parse(JSON.stringify(entry.row.config));

    return saveDashboardV2({
      dashboardId: params.dashboardId,
      expectedRevision: params.expectedRevision ?? entry.row.revision,
      title: rev.title,
      config: restoreConfig,
      changeSummary: `Wiederherstellung von Revision ${params.targetRevision}`,
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
