// Executive Dashboard V2 (Auftrag 150, 158 & 163 / P07, P09b & P11b):
// React-Hook für persistente V2-Dashboard-Speicherung, Revisionshistorie,
// Mehrfach-Dashboards, Vorlagenauswahl, Team-Freigaben und sichere Konfliktrettung.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardPreferences } from './useDashboardPreferences';
import {
  saveDashboardV2,
  type DashboardV2StorageError,
  type StoredDashboardV2Row,
} from '../services/dashboardStorageV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { normalizeDashboardLayouts } from '../services/dashboardLayoutIntegrity';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import type {
  AccessibleDashboardListItemV2,
  SaveV2Result,
  DeleteV2Result,
  UseDashboardV2StorageResult,
} from '../services/dashboardStorageV2Types';
import {
  executeCreateFromTemplate,
  executeDeleteDashboard,
  executeDuplicateCurrent,
  executeSaveAsNewPersonalCopy,
  executeShareWithTeam,
} from './dashboardV2Mutations';
import {
  fetchAccessibleDashboards,
  loadAndActivateAnyDashboardV2,
  resolveInitialOrActiveDashboard,
} from './dashboardV2Access';

export type { SaveV2Result, DeleteV2Result, UseDashboardV2StorageResult };

export function useDashboardV2Storage(options?: {
  preferredDashboardId?: string;
}): UseDashboardV2StorageResult {
  const { session } = useOrganization();
  const v1Preferences = useDashboardPreferences();
  const [status, setStatus] = useState<'laden' | 'bereit' | 'fehler'>('laden');
  const [dashboard, setDashboard] = useState<StoredDashboardV2Row | null>(null);
  const [dashboards, setDashboards] = useState<AccessibleDashboardListItemV2[]>([]);
  const [error, setError] = useState<DashboardV2StorageError | null>(null);
  const [listError, setListError] = useState<DashboardV2StorageError | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const orgId = session?.organizationId ?? 'default-org';
  const userId = session?.userId ?? 'default-user';
  const isInitializingRef = useRef(false);
  const isSavingRef = useRef(false);
  const dashboardRef = useRef<StoredDashboardV2Row | null>(null);
  dashboardRef.current = dashboard;

  const refreshList = useCallback(async () => {
    const res = await fetchAccessibleDashboards();
    if (res.ok) {
      setDashboards(res.value);
      setListError(null);
    } else {
      setListError(res.error);
    }
  }, []);

  // Lädt oder migriert das V2-Dashboard über den ausgelagerten Zugriffsbaustein
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

      const res = await resolveInitialOrActiveDashboard({
        explicitDashboardId,
        preferredDashboardId: options?.preferredDashboardId,
        orgId,
        userId,
        initialV2Config: initialV2,
      });

      if (!res.ok) {
        setError(res.error);
        setStatus('fehler');
        return;
      }

      setDashboard(res.value.dashboard);
      setFallbackNotice(res.value.fallbackNotice ?? null);
      setStatus('bereit');

      await refreshList();
    },
    [options?.preferredDashboardId, orgId, refreshList, userId, v1Preferences.state?.config],
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

  // Gezieltes Öffnen eines Dashboards (Persönlich oder Team)
  const openDashboard = useCallback(
    async (id: string): Promise<boolean> => {
      setStatus('laden');
      setError(null);
      setFallbackNotice(null);
      const res = await loadAndActivateAnyDashboardV2(id, orgId, userId, (loaded) => {
        const fromList = dashboards.find((item) => item.id === loaded.id);
        setDashboard({
          ...loaded,
          teamName: loaded.teamName ?? fromList?.teamName ?? null,
        });
      });
      if (!res.ok) {
        setError(res.error);
        setStatus('fehler');
        return false;
      }
      setStatus('bereit');
      await refreshList();
      return true;
    },
    [dashboards, orgId, userId, refreshList],
  );

  // Speichern mit Revisionsprüfung
  const save = useCallback(
    async (config: DashboardConfigV2, changeSummary?: string): Promise<SaveV2Result> => {
      if (!dashboard) {
        return { ok: false, error: { kind: 'technisch' } };
      }
      setIsSaving(true);
      setError(null);

      const configToSave: DashboardConfigV2 = normalizeDashboardLayouts({
        ...config,
        metadata: {
          ...config.metadata,
          user_edited: true,
        },
      });

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
      if (dashboardRef.current?.id === res.value.dashboardId) {
        setDashboard(updatedRow);
      }
      await refreshList();
      return { ok: true, value: res.value };
    },
    [dashboard, refreshList],
  );

  // Aus Vorlage erstellen
  const createFromTemplate = useCallback(
    async (
      templateId: string,
      title?: string,
      target?: { scope: 'personal' | 'team'; teamId?: string },
    ): Promise<SaveV2Result> => {
      setIsSaving(true);
      setError(null);
      const res = await executeCreateFromTemplate(
        templateId,
        title,
        target,
        orgId,
        userId,
        setDashboard,
        refreshList,
      );
      setIsSaving(false);
      if (!res.ok) {
        setError(res.error);
      }
      return res;
    },
    [orgId, userId, refreshList],
  );

  // Aktuelles Dashboard duplizieren
  const duplicateCurrent = useCallback(
    async (
      title?: string,
      target?: { scope: 'personal' | 'team'; teamId?: string },
    ): Promise<SaveV2Result> => {
      if (isSavingRef.current) {
        return {
          ok: false,
          error: { kind: 'technisch' },
        };
      }
      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);
      try {
        const res = await executeDuplicateCurrent(
          dashboard,
          title,
          target,
          orgId,
          userId,
          setDashboard,
          refreshList,
        );
        if (!res.ok) {
          setError(res.error);
        }
        return res;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [dashboard, orgId, userId, refreshList],
  );

  // Dashboard mit Team teilen (unabhängige Kopie)
  const shareWithTeam = useCallback(
    async (teamId: string, title: string): Promise<SaveV2Result> => {
      setIsSaving(true);
      setError(null);
      const res = await executeShareWithTeam(dashboard, teamId, title, refreshList);
      setIsSaving(false);
      if (!res.ok) {
        setError(res.error);
      }
      return res;
    },
    [dashboard, refreshList],
  );

  // Dashboard löschen (Persönlich oder Team)
  const deleteDashboard = useCallback(
    async (id: string): Promise<DeleteV2Result> => {
      setIsSaving(true);
      setError(null);
      const res = await executeDeleteDashboard(
        id,
        dashboard,
        dashboards,
        orgId,
        userId,
        setDashboard,
        refreshList,
      );
      setIsSaving(false);
      if (!res.ok) {
        setError(res.error);
      }
      return res;
    },
    [dashboard, dashboards, orgId, userId, refreshList],
  );

  // Speichern als neue persönliche Kopie (z.B. Konflikt- oder Lösch-Rettung)
  const saveAsNewPersonalCopy = useCallback(
    async (config: DashboardConfigV2, title?: string): Promise<SaveV2Result> => {
      setIsSaving(true);
      setError(null);
      const res = await executeSaveAsNewPersonalCopy(
        config,
        title,
        orgId,
        userId,
        setDashboard,
        refreshList,
      );
      setIsSaving(false);
      if (!res.ok) {
        setError(res.error);
      }
      return res;
    },
    [orgId, userId, refreshList],
  );

  return {
    status,
    dashboard,
    dashboards,
    error,
    listError,
    fallbackNotice,
    clearFallbackNotice: () => setFallbackNotice(null),
    isSaving,
    save,
    reload,
    refreshList,
    openDashboard,
    createFromTemplate,
    duplicateCurrent,
    deleteDashboard,
    saveAsNewPersonalCopy,
    shareWithTeam,
  };
}
