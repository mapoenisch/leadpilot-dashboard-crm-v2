// Executive Dashboard, Teilauftrag 3 (Auftrag 072): Laden und Speichern der persönlichen
// Konfiguration. Kein Autosave, keine Erstanlage beim bloßen Öffnen, Erfolg erst nach
// Serverbestätigung. Bei Konflikt bleibt der Entwurf des Aufrufers unangetastet.
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import type { DashboardConfig } from '../model/dashboardConfig';
import { validateDashboardConfig } from '../model/dashboardValidation';
import { interpretStoredConfig, type PreferencesState } from '../model/defaultDashboard';
import {
  loadPreferences,
  savePreferences,
  type PreferencesError,
} from '../data/dashboardPreferencesRepository';

export const DASHBOARD_PREFERENCES_KEY = ['dashboard', 'preferences'] as const;

/** Platzhalter ohne Sitzung, bewusst außerhalb des Präfixes: dort liegt nie eine Konfiguration. */
const NO_SESSION_KEY = ['dashboard', 'preferences-ohne-sitzung'] as const;

export function dashboardPreferencesKey(organizationId: string, userId: string) {
  return [...DASHBOARD_PREFERENCES_KEY, organizationId, userId] as const;
}

/** Ladefehler als Exception, damit React Query den Fehlerzustand führt. */
export class PreferencesLoadError extends Error {
  constructor(readonly reason: PreferencesError) {
    super(`Dashboard-Konfiguration nicht geladen: ${reason.kind}`);
    this.name = 'PreferencesLoadError';
  }
}

export type SaveResult =
  | { ok: true; revision: number }
  | { ok: false; error: PreferencesError | { kind: 'gesperrt' } | { kind: 'keine_sitzung' } };

export interface UseDashboardPreferencesResult {
  status: 'keine_sitzung' | 'laden' | 'bereit' | 'fehler';
  state: PreferencesState | null;
  error: PreferencesError | null;
  isSaving: boolean;
  /** Speichert den übergebenen Entwurf mit der zuletzt geladenen Revision. */
  save: (config: DashboardConfig) => Promise<SaveResult>;
  /** Lädt die aktuelle Serverfassung, z. B. nach einem Konflikt. Der Entwurf bleibt beim Aufrufer. */
  reloadServerVersion: () => Promise<void>;
}

export function useDashboardPreferences(): UseDashboardPreferencesResult {
  const { session } = useOrganization();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const organizationId = session?.organizationId ?? null;
  const userId = session?.userId ?? null;
  const queryKey =
    organizationId && userId ? dashboardPreferencesKey(organizationId, userId) : NO_SESSION_KEY;

  // Benutzer- oder Organisationswechsel und Abmeldung: fremde Konfigurationen aus dem Cache entfernen.
  useEffect(() => {
    queryClient.removeQueries({
      queryKey: DASHBOARD_PREFERENCES_KEY,
      predicate: (query) =>
        !organizationId ||
        !userId ||
        query.queryKey[2] !== organizationId ||
        query.queryKey[3] !== userId,
    });
  }, [queryClient, organizationId, userId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(organizationId && userId),
    retry: false,
    queryFn: async (): Promise<PreferencesState> => {
      const result = await loadPreferences();
      if (!result.ok) throw new PreferencesLoadError(result.error);
      return interpretStoredConfig(result.value);
    },
  });

  const state = query.data ?? null;

  const save = useCallback(
    async (config: DashboardConfig): Promise<SaveResult> => {
      if (!organizationId || !userId) return { ok: false, error: { kind: 'keine_sitzung' } };
      if (!state) return { ok: false, error: { kind: 'gesperrt' } };
      if (!state.canSave) return { ok: false, error: { kind: 'gesperrt' } };
      const check = validateDashboardConfig(config);
      if (!check.ok) {
        const detail = check.issues.map((issue) => `${issue.path}: ${issue.code}`).join(', ');
        return { ok: false, error: { kind: 'ungueltig', detail } };
      }
      setIsSaving(true);
      try {
        const result = await savePreferences(config, state.revision);
        if (!result.ok) return { ok: false, error: result.error };
        const saved = interpretStoredConfig({
          config,
          schemaVersion: config.version,
          revision: result.value.revision,
          updatedAt: result.value.updatedAt,
        });
        queryClient.setQueryData(dashboardPreferencesKey(organizationId, userId), saved);
        return { ok: true, revision: result.value.revision };
      } finally {
        setIsSaving(false);
      }
    },
    [organizationId, userId, state, queryClient],
  );

  const reloadServerVersion = useCallback(async () => {
    if (!organizationId || !userId) return;
    await queryClient.refetchQueries({ queryKey: dashboardPreferencesKey(organizationId, userId) });
  }, [organizationId, userId, queryClient]);

  let status: UseDashboardPreferencesResult['status'];
  if (!organizationId || !userId) status = 'keine_sitzung';
  else if (query.isError) status = 'fehler';
  else if (!state) status = 'laden';
  else status = 'bereit';

  const error =
    query.error instanceof PreferencesLoadError
      ? query.error.reason
      : query.error
        ? ({ kind: 'technisch' } as const)
        : null;

  return { status, state, error, isSaving, save, reloadServerVersion };
}
