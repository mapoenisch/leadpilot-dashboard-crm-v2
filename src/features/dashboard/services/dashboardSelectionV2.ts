// Auftrag 158 (P09b): Client-Speicheradapter für Dashboard-Auswahl, Löschen und Duplizieren.
// Ausgelagert aus dashboardStorageV2.ts zur Einhaltung von max-lines (<= 400).

import { isSupabaseConfigured, supabase } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { inMemoryStore } from './dashboardInMemoryStoreV2';
import {
  type DeleteDashboardV2Result,
  type DuplicateDashboardV2Result,
  type PersonalDashboardListItemV2,
  type StorageResult,
  type StoredDashboardV2Row,
  classifyDashboardV2Error,
} from './dashboardStorageV2Types';

function failTechnically<T>(cause: unknown): StorageResult<T> {
  logger.warn('[dashboardSelectionV2] Operation fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

/**
 * Listet alle persönlichen Dashboards des aktuellen Nutzers im aktuellen Mandanten auf.
 */
export async function listPersonalDashboardsV2(): Promise<
  StorageResult<PersonalDashboardListItemV2[]>
> {
  if (!isSupabaseConfigured || !supabase) {
    const list: PersonalDashboardListItemV2[] = Array.from(
      inMemoryStore.values(),
    )
      .filter((e) => e.row.scope === 'personal')
      .map((e) => ({
        id: e.row.id,
        title: e.row.title,
        scope: 'personal' as const,
        revision: e.row.revision,
        tileCount: e.row.config.tiles?.length ?? 0,
        sectionCount: e.row.config.sections?.length ?? 0,
        updatedAt: e.row.updatedAt,
      }))
      .sort(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
      );
    return { ok: true, value: list };
  }

  try {
    const { data, error, status } = await supabase.rpc(
      'list_personal_dashboards_v2',
    );
    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const rows = (Array.isArray(data) ? data : []) as Array<{
      id: string;
      title: string;
      scope: string;
      revision: number;
      tile_count: number;
      section_count: number;
      updated_at: string;
    }>;

    const list: PersonalDashboardListItemV2[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      scope: 'personal' as const,
      revision: r.revision,
      tileCount: r.tile_count ?? 0,
      sectionCount: r.section_count ?? 0,
      updatedAt: r.updated_at,
    }));

    return { ok: true, value: list };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Löscht ein persönliches Dashboard nach Revisionsprüfung.
 * Das letzte verbleibende persönliche Dashboard kann nicht gelöscht werden.
 */
export async function deletePersonalDashboardV2(params: {
  dashboardId: string;
  expectedRevision?: number;
}): Promise<StorageResult<DeleteDashboardV2Result>> {
  if (!isSupabaseConfigured || !supabase) {
    const entry = inMemoryStore.get(params.dashboardId);
    if (!entry || entry.row.scope !== 'personal') {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }

    if (
      params.expectedRevision !== undefined &&
      entry.row.revision !== params.expectedRevision
    ) {
      return {
        ok: false,
        error: {
          kind: 'konflikt',
          detail: `Revision ${params.expectedRevision} erwartet, ${entry.row.revision} gefunden`,
        },
      };
    }

    const personalEntries = Array.from(inMemoryStore.values()).filter(
      (e) => e.row.scope === 'personal',
    );
    if (personalEntries.length <= 1) {
      return { ok: false, error: { kind: 'letztes_dashboard' } };
    }

    inMemoryStore.delete(params.dashboardId);

    const remaining = Array.from(inMemoryStore.values())
      .filter((e) => e.row.scope === 'personal')
      .sort(
        (a, b) =>
          b.row.updatedAt.localeCompare(a.row.updatedAt) ||
          a.row.id.localeCompare(b.row.id),
      );

    return {
      ok: true,
      value: {
        deletedId: params.dashboardId,
        nextDashboardId: remaining[0]?.row.id ?? null,
      },
    };
  }

  try {
    const { data, error, status } = await supabase.rpc(
      'delete_personal_dashboard_v2',
      {
        p_dashboard_id: params.dashboardId,
        p_expected_revision: params.expectedRevision ?? null,
      },
    );

    if (error) {
      const classified = classifyDashboardV2Error(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      deleted_id: string;
      next_dashboard_id: string | null;
    };

    return {
      ok: true,
      value: {
        deletedId: row.deleted_id,
        nextDashboardId: row.next_dashboard_id,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/**
 * Dupliziert ein persönliches Dashboard atomar unter neuem Titel.
 * Obergrenze 20 wird geprüft.
 */
export async function duplicatePersonalDashboardV2(params: {
  dashboardId: string;
  title: string;
}): Promise<StorageResult<DuplicateDashboardV2Result>> {
  const trimmedTitle = params.title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > 80) {
    return {
      ok: false,
      error: {
        kind: 'ungueltig',
        detail: 'Titel muss zwischen 1 und 80 Zeichen lang sein',
      },
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const source = inMemoryStore.get(params.dashboardId);
    if (!source || source.row.scope !== 'personal') {
      return { ok: false, error: { kind: 'nicht_gefunden' } };
    }

    const personalEntries = Array.from(inMemoryStore.values()).filter(
      (e) => e.row.scope === 'personal',
    );
    if (personalEntries.length >= 20) {
      return { ok: false, error: { kind: 'obergrenze_erreicht' } };
    }

    const newId = 'dash_v2_' + Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();
    const newConfig = {
      ...source.row.config,
      id: newId,
      title: trimmedTitle,
    };

    const newRow: StoredDashboardV2Row = {
      id: newId,
      title: trimmedTitle,
      scope: 'personal',
      revision: 1,
      config: newConfig,
      updatedAt: now,
    };

    inMemoryStore.set(newId, {
      row: newRow,
      revisions: [
        {
          revision: 1,
          title: trimmedTitle,
          createdByUserId: source.row.config.ownerUserId || 'mock_user',
          createdAt: now,
          changeSummary: `Dupliziert aus „${source.row.title}“`,
        },
      ],
    });

    return {
      ok: true,
      value: {
        dashboardId: newId,
        revision: 1,
        createdAt: now,
      },
    };
  }

  try {
    const { data, error, status } = await supabase.rpc(
      'duplicate_personal_dashboard_v2',
      {
        p_dashboard_id: params.dashboardId,
        p_title: trimmedTitle,
      },
    );

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
        createdAt: row.created_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}
