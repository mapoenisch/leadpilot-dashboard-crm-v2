// Executive Dashboard, Teilauftrag 3 (Auftrag 072): persönliche Konfiguration in Supabase.
// Lesen der eigenen Zeile (RLS), Speichern nur über save_dashboard_preferences mit erwarteter
// Revision. Fehler kommen strukturiert zurück; technische Rohmeldungen verlassen das Modul nicht.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import type { DashboardConfig } from '../model/dashboardConfig';
import type { StoredPreferencesRow } from '../model/defaultDashboard';

export type PreferencesError =
  | { kind: 'konflikt' }
  | { kind: 'ungueltig'; detail: string }
  | { kind: 'keine_mitgliedschaft' }
  | { kind: 'sitzung_abgelaufen' }
  | { kind: 'nicht_konfiguriert' }
  | { kind: 'technisch' };

export type RepositoryResult<T> = { ok: true; value: T } | { ok: false; error: PreferencesError };

export interface SavedRevision {
  revision: number;
  updatedAt: string;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

const TABLE = 'executive_dashboard_preferences';
const SESSION_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

/** Ordnet Datenbank- und PostgREST-Fehler einer festen Fehlerart zu. */
export function classifyPreferencesError(
  error: SupabaseErrorLike | null | undefined,
  status?: number,
): PreferencesError {
  const message = error?.message ?? '';
  if (message.includes('LP_DASHBOARD_CONFLICT')) return { kind: 'konflikt' };
  if (message.includes('LP_DASHBOARD_INVALID'))
    return { kind: 'ungueltig', detail: error?.details ?? '' };
  if (message.includes('LP_DASHBOARD_NO_MEMBERSHIP')) return { kind: 'keine_mitgliedschaft' };
  if (status === 401 || SESSION_CODES.has(error?.code ?? '') || /jwt expired/i.test(message))
    return { kind: 'sitzung_abgelaufen' };
  return { kind: 'technisch' };
}

function failTechnically<T>(cause: unknown): RepositoryResult<T> {
  // Rohfehler nur intern protokollieren, nie als Meldung nach außen geben (Auftrag 072).
  logger.warn('[dashboardPreferences] Speichern oder Laden fehlgeschlagen.', cause);
  return { ok: false, error: { kind: 'technisch' } };
}

interface PreferencesRow {
  config: unknown;
  schema_version: number;
  revision: number;
  updated_at: string;
}

/** Liest die eigene Konfiguration. Keine Zeile ist kein Fehler (`value: null`). */
export async function loadPreferences(): Promise<RepositoryResult<StoredPreferencesRow | null>> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: { kind: 'nicht_konfiguriert' } };
  }
  try {
    const { data, error, status } = await supabase
      .from(TABLE)
      .select('config, schema_version, revision, updated_at')
      .maybeSingle<PreferencesRow>();
    if (error) {
      const classified = classifyPreferencesError(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }
    if (!data) return { ok: true, value: null };
    return {
      ok: true,
      value: {
        config: data.config,
        schemaVersion: data.schema_version,
        revision: data.revision,
        updatedAt: data.updated_at,
      },
    };
  } catch (cause) {
    return failTechnically(cause);
  }
}

/** Speichert atomar mit erwarteter Revision (0 = Erstanlage). */
export async function savePreferences(
  config: DashboardConfig,
  expectedRevision: number,
): Promise<RepositoryResult<SavedRevision>> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: { kind: 'nicht_konfiguriert' } };
  }
  try {
    const { data, error, status } = await supabase.rpc('save_dashboard_preferences', {
      p_config: config,
      p_expected_revision: expectedRevision,
    });
    if (error) {
      const classified = classifyPreferencesError(error, status);
      return classified.kind === 'technisch'
        ? failTechnically(error)
        : { ok: false, error: classified };
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      { revision?: unknown; updated_at?: unknown } | null | undefined;
    if (!row || typeof row.revision !== 'number' || typeof row.updated_at !== 'string') {
      return failTechnically(new Error('Unerwartete Antwort von save_dashboard_preferences'));
    }
    return { ok: true, value: { revision: row.revision, updatedAt: row.updated_at } };
  } catch (cause) {
    return failTechnically(cause);
  }
}
