// Executive Dashboard V2 (Auftrag 150 / P07):
// React-Hook für persistente V2-Dashboard-Speicherung, Revisionshistorie
// und deterministische V1->V2-Kopiermigration.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardPreferences } from './useDashboardPreferences';
import {
  createDashboardV2,
  getActiveDashboardV2Id,
  getOrCreatePersonalDashboardV2,
  saveDashboardV2,
  setActiveDashboardV2Id,
  type DashboardV2StorageError,
  type SavedDashboardV2Result,
  type StoredDashboardV2Row,
} from '../services/dashboardStorageV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';

export type SaveV2Result =
  { ok: true; value: SavedDashboardV2Result } | { ok: false; error: DashboardV2StorageError };

export interface UseDashboardV2StorageResult {
  status: 'laden' | 'bereit' | 'fehler';
  dashboard: StoredDashboardV2Row | null;
  error: DashboardV2StorageError | null;
  isSaving: boolean;
  save: (config: DashboardConfigV2, changeSummary?: string) => Promise<SaveV2Result>;
  reload: (explicitDashboardId?: string) => Promise<void>;
  saveAsNewPersonalCopy: (config: DashboardConfigV2, title?: string) => Promise<SaveV2Result>;
}

export function useDashboardV2Storage(): UseDashboardV2StorageResult {
  const { session } = useOrganization();
  const v1Preferences = useDashboardPreferences();
  const [status, setStatus] = useState<'laden' | 'bereit' | 'fehler'>('laden');
  const [dashboard, setDashboard] = useState<StoredDashboardV2Row | null>(null);
  const [error, setError] = useState<DashboardV2StorageError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const orgId = session?.organizationId ?? 'default-org';
  const userId = session?.userId ?? 'default-user';
  const isInitializingRef = useRef(false);
  const dashboardRef = useRef<StoredDashboardV2Row | null>(null);
  dashboardRef.current = dashboard;

  // Lädt oder migriert das V2-Dashboard über den atomaren Get-or-Create-Pfad
  const loadOrMigrate = useCallback(
    async (explicitDashboardId?: string) => {
      setStatus('laden');
      setError(null);

      const v1Config = v1Preferences.state?.config ?? DEFAULT_DASHBOARD_CONFIG;
      const initialV2 = migrateV1ToV2(v1Config, {
        id: 'personal_dashboard_v2',
        title: 'Executive Dashboard',
        ownerUserId: userId,
        organizationId: orgId,
      });

      // Beim expliziten Neuladen die im Tab gebundene Dashboard-ID nutzen.
      // Die LocalStorage-Präferenz gilt nur für die initiale Auswahl bei Mount.
      const targetDashboardId = explicitDashboardId ?? getActiveDashboardV2Id(orgId, userId);
      const res = await getOrCreatePersonalDashboardV2({
        initialConfig: initialV2,
        title: initialV2.title,
        preferredId: targetDashboardId ?? undefined,
      });

      if (!res.ok) {
        setError(res.error);
        setStatus('fehler');
        return;
      }

      setActiveDashboardV2Id(orgId, userId, res.value.id);
      setDashboard(res.value);
      setStatus('bereit');
    },
    [orgId, userId, v1Preferences.state?.config],
  );

  useEffect(() => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    loadOrMigrate();
  }, [loadOrMigrate]);

  // Explizites Neuladen: Nutzt standardmäßig die im Tab gebundene Dashboard-ID
  const reload = useCallback(
    async (explicitDashboardId?: string) => {
      const boundId = explicitDashboardId ?? dashboardRef.current?.id;
      await loadOrMigrate(boundId);
    },
    [loadOrMigrate],
  );

  // Speichern mit Revisionsprüfung
  const save = useCallback(
    async (config: DashboardConfigV2, changeSummary?: string): Promise<SaveV2Result> => {
      if (!dashboard) {
        return { ok: false, error: { kind: 'technisch' } };
      }
      setIsSaving(true);
      setError(null);

      // Bei manueller Nutzerbearbeitung user_edited markieren (P03 §5.3)
      const configToSave: DashboardConfigV2 = {
        ...config,
        metadata: {
          ...config.metadata,
          user_edited: true,
        },
      };

      const res = await saveDashboardV2({
        dashboardId: dashboard.id,
        expectedRevision: dashboard.revision,
        title: configToSave.title,
        config: configToSave,
        changeSummary,
      });

      setIsSaving(false);

      if (!res.ok) {
        setError(res.error);
        return { ok: false, error: res.error };
      }

      const updatedRow: StoredDashboardV2Row = {
        ...dashboard,
        title: configToSave.title,
        revision: res.value.revision,
        config: { ...configToSave, id: res.value.dashboardId },
        updatedAt: res.value.updatedAt,
      };
      setDashboard(updatedRow);
      return { ok: true, value: res.value };
    },
    [dashboard],
  );

  // Speichern als neue persönliche Kopie (z.B. Konflikt-Rettung)
  const saveAsNewPersonalCopy = useCallback(
    async (config: DashboardConfigV2, title?: string): Promise<SaveV2Result> => {
      setIsSaving(true);
      setError(null);

      const copyTitle = title ?? `${config.title} (Kopie)`;
      const copyId = 'dash_v2_' + Math.random().toString(36).slice(2, 10);
      const newConfig: DashboardConfigV2 = {
        ...config,
        id: copyId,
        title: copyTitle,
        metadata: {
          ...config.metadata,
          user_edited: true,
        },
      };

      const res = await createDashboardV2({
        title: copyTitle,
        config: newConfig,
        scope: 'personal',
      });

      setIsSaving(false);

      if (!res.ok) {
        setError(res.error);
        return { ok: false, error: res.error };
      }

      const newRow: StoredDashboardV2Row = {
        id: res.value.dashboardId,
        title: copyTitle,
        scope: 'personal',
        revision: res.value.revision,
        config: { ...newConfig, id: res.value.dashboardId },
        updatedAt: res.value.updatedAt,
      };
      setActiveDashboardV2Id(orgId, userId, res.value.dashboardId);
      setDashboard(newRow);
      return { ok: true, value: res.value };
    },
    [orgId, userId],
  );

  return {
    status,
    dashboard,
    error,
    isSaving,
    save,
    reload,
    saveAsNewPersonalCopy,
  };
}
