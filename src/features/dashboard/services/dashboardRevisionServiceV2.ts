// Executive Dashboard V2 (Auftrag 150 / P07):
// Revisionsdienst für Abfrage und Wiederherstellung von Dashboard-Revisionen.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { inMemoryStore } from './dashboardInMemoryStoreV2';
import {
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
