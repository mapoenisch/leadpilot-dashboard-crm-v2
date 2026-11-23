// Executive Dashboard V2 (Auftrag 173 / P16a §2.1):
// Dienstschicht „Umstellung vorbereiten“ (nur Admin). Supabase-Variante und eine
// In-Memory-Variante für Vorschau und Tests mit identischer Fachlogik.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  classifyRollout,
  type RolloutClass,
  type RolloutDecision,
  type RolloutReconciliationRow,
} from '../model/dashboardRolloutReconciliation';

export type RolloutError =
  | 'veraltet'
  | 'nicht_berechtigt'
  | 'keine_kopie'
  | 'nicht_gefunden'
  | 'ungueltig'
  | 'sitzung_abgelaufen'
  | 'nicht_verfuegbar'
  | 'server_funktion_fehlt'
  | 'technisch';

export type RolloutResult<T> = { ok: true; value: T } | { ok: false; error: RolloutError };

export const ROLLOUT_ERROR_MESSAGE: Record<RolloutError, string> = {
  veraltet:
    'Der Stand hat sich seit dem Laden geändert. Die Liste wurde neu geladen, bitte erneut prüfen.',
  nicht_berechtigt: 'Nur Admins der Organisation dürfen die Umstellung vorbereiten.',
  keine_kopie: 'Für diesen Nutzer gibt es noch keine Pilotkopie.',
  nicht_gefunden: 'Der Nutzer hat in dieser Organisation keinen Dashboard-Stand.',
  ungueltig: 'Der alte Stand lässt sich nicht gültig übertragen.',
  sitzung_abgelaufen: 'Die Sitzung ist abgelaufen. Bitte neu anmelden.',
  nicht_verfuegbar: 'Die Umstellung braucht eine Server-Verbindung.',
  server_funktion_fehlt:
    'Die Server-Funktion fehlt. Die Migration für Auftrag 173 ist noch nicht eingespielt.',
  technisch: 'Technischer Fehler. Bitte später erneut versuchen.',
};

export interface RolloutPrepService {
  list(): Promise<RolloutResult<RolloutReconciliationRow[]>>;
  decide(
    row: RolloutReconciliationRow,
    decision: Exclude<RolloutDecision, 'v1_uebernehmen'>,
  ): Promise<RolloutResult<void>>;
  adoptV1(
    row: RolloutReconciliationRow,
    config: DashboardConfigV2,
  ): Promise<RolloutResult<{ revision: number }>>;
}

interface ErrorLike {
  code?: string;
  message?: string;
}

export function classifyRolloutError(
  error: ErrorLike | null | undefined,
  status?: number,
): RolloutError {
  const message = error?.message ?? '';
  if (message.includes('LP_ROLLOUT_STALE')) return 'veraltet';
  if (message.includes('LP_ROLLOUT_NO_COPY')) return 'keine_kopie';
  if (message.includes('LP_ROLLOUT_NOT_FOUND')) return 'nicht_gefunden';
  if (message.includes('LP_DASHBOARD_INVALID') || message.includes('LP_ROLLOUT_INVALID'))
    return 'ungueltig';
  if (message.includes('LP_FORBIDDEN') || message.includes('LP_AUTH_REQUIRED'))
    return 'nicht_berechtigt';
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'server_funktion_fehlt';
  if (status === 401 || /jwt expired/i.test(message)) return 'sitzung_abgelaufen';
  return 'technisch';
}

interface ReconciliationDbRow {
  user_id: string;
  email: string | null;
  org_role: string | null;
  org_status: string | null;
  v1_revision: number | null;
  v1_updated_at: string | null;
  v1_config: unknown;
  v2_dashboard_id: string | null;
  v2_revision: number | null;
  v2_updated_at: string | null;
  v2_config: unknown;
  last_migrated_revision: number | null;
  v2_base_revision: number | null;
  ergebnis_klasse: RolloutClass;
  entscheidung: RolloutDecision | null;
  entscheidung_v1_revision: number | null;
  entscheidung_v2_revision: number | null;
  entschieden_at: string | null;
  entschieden_von_email: string | null;
  entscheidung_gueltig: boolean | null;
}

export function mapReconciliationRow(r: ReconciliationDbRow): RolloutReconciliationRow {
  return {
    userId: r.user_id,
    email: r.email,
    orgRole: r.org_role,
    orgStatus: r.org_status,
    v1Revision: r.v1_revision,
    v1UpdatedAt: r.v1_updated_at,
    v1Config: r.v1_config,
    v2DashboardId: r.v2_dashboard_id,
    v2Revision: r.v2_revision,
    v2UpdatedAt: r.v2_updated_at,
    v2Config: r.v2_config,
    lastMigratedRevision: r.last_migrated_revision,
    v2BaseRevision: r.v2_base_revision ?? 1,
    klasse: r.ergebnis_klasse,
    entscheidung: r.entscheidung,
    entscheidungV1Revision: r.entscheidung_v1_revision,
    entscheidungV2Revision: r.entscheidung_v2_revision,
    entschiedenAt: r.entschieden_at,
    entschiedenVonEmail: r.entschieden_von_email,
    entscheidungGueltig: r.entscheidung_gueltig,
  };
}

async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<RolloutResult<T>> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: 'nicht_verfuegbar' };
  try {
    const { data, error, status } = await supabase.rpc(name, args);
    if (error) {
      const kind = classifyRolloutError(error, status);
      if (kind === 'technisch') logger.warn(`[dashboardRollout] ${name} fehlgeschlagen.`, error);
      return { ok: false, error: kind };
    }
    return { ok: true, value: data as T };
  } catch (cause) {
    logger.warn(`[dashboardRollout] ${name} fehlgeschlagen.`, cause);
    return { ok: false, error: 'technisch' };
  }
}

export const supabaseRolloutService: RolloutPrepService = {
  async list() {
    const res = await callRpc<ReconciliationDbRow[]>('dashboard_v1_v2_reconciliation');
    if (!res.ok) return res;
    return {
      ok: true,
      value: (Array.isArray(res.value) ? res.value : []).map(mapReconciliationRow),
    };
  },
  async decide(row, decision) {
    const res = await callRpc<unknown>('dashboard_rollout_decide', {
      p_user_id: row.userId,
      p_entscheidung: decision,
      p_expected_v1_revision: row.v1Revision,
      p_expected_v2_revision: row.v2Revision,
    });
    return res.ok ? { ok: true, value: undefined } : res;
  },
  async adoptV1(row, config) {
    const res = await callRpc<Array<{ revision: number }>>('dashboard_rollout_adopt_v1', {
      p_user_id: row.userId,
      p_expected_v1_revision: row.v1Revision,
      p_expected_v2_revision: row.v2Revision,
      p_config: config,
    });
    if (!res.ok) return res;
    const revision = Array.isArray(res.value) ? res.value[0]?.revision : undefined;
    if (typeof revision !== 'number') return { ok: false, error: 'technisch' };
    return { ok: true, value: { revision } };
  },
};

/**
 * In-Memory-Variante: dieselben Regeln wie der Server (Revisionsbindung, neue Revision,
 * Klassen neu berechnet). Für Vorschau (`?bereich=umstellung`) und UI-Tests.
 */
export function createInMemoryRolloutService(
  initial: RolloutReconciliationRow[],
): RolloutPrepService & {
  rows: () => RolloutReconciliationRow[];
  /** Simuliert eine weitere Bearbeitung im alten Editor (für Verfalls-Tests). */
  bumpV1: (userId: string) => void;
} {
  let rows = initial.map((r) => ({ ...r }));
  const recompute = (r: RolloutReconciliationRow): RolloutReconciliationRow => {
    const klasse =
      classifyRollout({
        v1Revision: r.v1Revision,
        v2Revision: r.v2Revision,
        lastMigratedRevision: r.lastMigratedRevision,
        v2BaseRevision: r.v2BaseRevision,
      }) ?? r.klasse;
    const gueltig =
      r.entscheidung === null
        ? null
        : r.entscheidungV1Revision === r.v1Revision && r.entscheidungV2Revision === r.v2Revision;
    return { ...r, klasse, entscheidungGueltig: gueltig };
  };
  const find = (row: RolloutReconciliationRow) => rows.find((r) => r.userId === row.userId);
  const stale = (current: RolloutReconciliationRow, row: RolloutReconciliationRow) =>
    current.v1Revision !== row.v1Revision || current.v2Revision !== row.v2Revision;
  const now = () => new Date().toISOString();

  return {
    rows: () => rows,
    bumpV1(userId) {
      rows = rows.map((r) =>
        r.userId === userId && r.v1Revision !== null
          ? recompute({ ...r, v1Revision: r.v1Revision + 1 })
          : r,
      );
    },
    async list() {
      return { ok: true, value: rows.map((r) => ({ ...r })) };
    },
    async decide(row, decision) {
      const current = find(row);
      if (!current) return { ok: false, error: 'nicht_gefunden' };
      if (stale(current, row)) return { ok: false, error: 'veraltet' };
      rows = rows.map((r) =>
        r.userId === row.userId
          ? recompute({
              ...r,
              entscheidung: decision,
              entscheidungV1Revision: r.v1Revision,
              entscheidungV2Revision: r.v2Revision,
              entschiedenAt: now(),
              entschiedenVonEmail: 'admin@vorschau.local',
            })
          : r,
      );
      return { ok: true, value: undefined };
    },
    async adoptV1(row, config) {
      const current = find(row);
      if (!current) return { ok: false, error: 'nicht_gefunden' };
      if (current.v1Revision === null) return { ok: false, error: 'nicht_gefunden' };
      if (current.v2Revision === null) return { ok: false, error: 'keine_kopie' };
      if (stale(current, row)) return { ok: false, error: 'veraltet' };
      const revision = current.v2Revision + 1;
      rows = rows.map((r) =>
        r.userId === row.userId
          ? recompute({
              ...r,
              v2Revision: revision,
              v2Config: {
                ...config,
                metadata: {
                  ...config.metadata,
                  last_migrated_revision: r.v1Revision,
                  migrated_v2_revision: revision,
                  user_edited: false,
                },
              },
              lastMigratedRevision: r.v1Revision,
              v2BaseRevision: revision,
              entscheidung: 'v1_uebernehmen',
              entscheidungV1Revision: r.v1Revision,
              entscheidungV2Revision: revision,
              entschiedenAt: now(),
              entschiedenVonEmail: 'admin@vorschau.local',
            })
          : r,
      );
      return { ok: true, value: { revision } };
    },
  };
}
