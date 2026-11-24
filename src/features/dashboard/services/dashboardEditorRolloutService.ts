// Executive Dashboard V2 (Auftrag 174 / P16b §2): Server-Schalter je Organisation.
// Lesen der Editor-Wahl für den angemeldeten Nutzer und der Admin-Übersicht.
// Die Stufe selbst setzt ausschließlich Marc per SQL (docs/dashboard/UMSTELLUNG_P16.md).

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import type {
  DashboardEditorRolloutReason,
  DashboardEditorServerChoice,
} from '../model/dashboardRollout';
import { classifyRolloutError, type RolloutResult } from './dashboardRolloutService';

export interface DashboardEditorRolloutOverview {
  stufe: number;
  aktiviertAt: string | null;
  notiz: string | null;
  nutzerAktiv: number;
  nutzerV2: number;
  offeneEntscheidungen: number;
}

export interface DashboardEditorRolloutService {
  /** `vollziehen = false`: reine Abfrage, stellt niemanden um (Beobachtung bei offener Ansicht). */
  status(vollziehen: boolean): Promise<RolloutResult<DashboardEditorServerChoice>>;
  overview(): Promise<RolloutResult<DashboardEditorRolloutOverview>>;
}

const REASONS: readonly DashboardEditorRolloutReason[] = [
  'stufe_0',
  'rueckweg',
  'umgestellt',
  'umstellbar',
  'entscheidung_fehlt',
  'entscheidung_verfallen',
  'entscheidung_spaeter',
];

interface StatusDbRow {
  stufe: number | null;
  aktiviert_at: string | null;
  editor: string | null;
  grund: string | null;
  umgestellt_at: string | null;
  v1_updated_at: string | null;
}

/** Unbekannte oder unvollständige Antworten gelten als alter Editor (sicherer Standard). */
export function mapEditorStatusRow(row: StatusDbRow | undefined): DashboardEditorServerChoice {
  const grund = REASONS.includes(row?.grund as DashboardEditorRolloutReason)
    ? (row?.grund as DashboardEditorRolloutReason)
    : 'stufe_0';
  return {
    editor: row?.editor === 'v2' ? 'v2' : 'v1',
    grund,
    stufe: typeof row?.stufe === 'number' ? row.stufe : 0,
    aktiviertAt: row?.aktiviert_at ?? null,
    umgestelltAt: row?.umgestellt_at ?? null,
    v1UpdatedAt: row?.v1_updated_at ?? null,
  };
}

export const supabaseEditorRolloutService: DashboardEditorRolloutService = {
  async status(vollziehen) {
    if (!isSupabaseConfigured || !supabase) return { ok: false, error: 'nicht_verfuegbar' };
    try {
      const { data, error, status } = await supabase.rpc('dashboard_editor_rollout_status', {
        p_vollziehen: vollziehen,
      });
      if (error) {
        const kind = classifyRolloutError(error, status);
        if (kind === 'technisch')
          logger.warn('[dashboardEditorRollout] Status fehlgeschlagen.', error);
        return { ok: false, error: kind };
      }
      const rows = Array.isArray(data) ? (data as StatusDbRow[]) : [];
      return { ok: true, value: mapEditorStatusRow(rows[0]) };
    } catch (cause) {
      logger.warn('[dashboardEditorRollout] Status fehlgeschlagen.', cause);
      return { ok: false, error: 'technisch' };
    }
  },
  async overview() {
    if (!isSupabaseConfigured || !supabase) return { ok: false, error: 'nicht_verfuegbar' };
    try {
      const { data, error, status } = await supabase.rpc('dashboard_editor_rollout_overview');
      if (error) {
        const kind = classifyRolloutError(error, status);
        if (kind === 'technisch')
          logger.warn('[dashboardEditorRollout] Übersicht fehlgeschlagen.', error);
        return { ok: false, error: kind };
      }
      const row = (Array.isArray(data) ? data[0] : undefined) as
        | {
            stufe: number;
            aktiviert_at: string | null;
            notiz: string | null;
            nutzer_aktiv: number;
            nutzer_v2: number;
            offene_entscheidungen: number;
          }
        | undefined;
      if (!row) return { ok: false, error: 'technisch' };
      return {
        ok: true,
        value: {
          stufe: row.stufe,
          aktiviertAt: row.aktiviert_at,
          notiz: row.notiz,
          nutzerAktiv: row.nutzer_aktiv,
          nutzerV2: row.nutzer_v2,
          offeneEntscheidungen: row.offene_entscheidungen,
        },
      };
    } catch (cause) {
      logger.warn('[dashboardEditorRollout] Übersicht fehlgeschlagen.', cause);
      return { ok: false, error: 'technisch' };
    }
  },
};
