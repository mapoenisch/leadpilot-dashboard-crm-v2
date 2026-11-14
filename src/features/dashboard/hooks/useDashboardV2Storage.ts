// Executive Dashboard V2 (Auftrag 150 & 158 / P07 & P09b):
// React-Hook für persistente V2-Dashboard-Speicherung, Revisionshistorie,
// Mehrfach-Dashboards, Vorlagenauswahl und sichere Konfliktrettung.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardPreferences } from './useDashboardPreferences';
import {
  createDashboardV2,
  getActiveDashboardV2Id,
  getOrCreatePersonalDashboardV2,
  loadPersonalDashboardV2,
  saveDashboardV2,
  setActiveDashboardV2Id,
  type DashboardV2StorageError,
  type PersonalDashboardListItemV2,
  type SavedDashboardV2Result,
  type StoredDashboardV2Row,
} from '../services/dashboardStorageV2';
import {
  deletePersonalDashboardV2,
  duplicatePersonalDashboardV2,
  listPersonalDashboardsV2,
} from '../services/dashboardSelectionV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { normalizeDashboardLayouts } from '../services/dashboardLayoutIntegrity';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';

export type SaveV2Result =
  | { ok: true; value: SavedDashboardV2Result }
  | { ok: false; error: DashboardV2StorageError };

export type DeleteV2Result =
  | { ok: true; nextDashboardId: string | null }
  | { ok: false; error: DashboardV2StorageError };

export interface UseDashboardV2StorageResult {
  status: 'laden' | 'bereit' | 'fehler';
  dashboard: StoredDashboardV2Row | null;
  dashboards: PersonalDashboardListItemV2[];
  error: DashboardV2StorageError | null;
  isSaving: boolean;
  save: (config: DashboardConfigV2, changeSummary?: string) => Promise<SaveV2Result>;
  reload: (explicitDashboardId?: string) => Promise<void>;
  refreshList: () => Promise<void>;
  openDashboard: (id: string) => Promise<boolean>;
  createFromTemplate: (templateId: string, title?: string) => Promise<SaveV2Result>;
  duplicateCurrent: (title?: string) => Promise<SaveV2Result>;
  deleteDashboard: (id: string) => Promise<DeleteV2Result>;
  saveAsNewPersonalCopy: (config: DashboardConfigV2, title?: string) => Promise<SaveV2Result>;
}

export function useDashboardV2Storage(options?: {
  preferredDashboardId?: string;
}): UseDashboardV2StorageResult {
  const { session } = useOrganization();
  const v1Preferences = useDashboardPreferences();
  const [status, setStatus] = useState<'laden' | 'bereit' | 'fehler'>('laden');
  const [dashboard, setDashboard] = useState<StoredDashboardV2Row | null>(null);
  const [dashboards, setDashboards] = useState<PersonalDashboardListItemV2[]>([]);
  const [error, setError] = useState<DashboardV2StorageError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const orgId = session?.organizationId ?? 'default-org';
  const userId = session?.userId ?? 'default-user';
  const isInitializingRef = useRef(false);
  const dashboardRef = useRef<StoredDashboardV2Row | null>(null);
  dashboardRef.current = dashboard;

  const refreshList = useCallback(async () => {
    const res = await listPersonalDashboardsV2();
    if (res.ok) {
      setDashboards(res.value);
    }
  }, []);

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

      const targetDashboardId =
        explicitDashboardId ??
        options?.preferredDashboardId ??
        getActiveDashboardV2Id(orgId, userId);
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

      // Liste beim Initialisieren einmalig laden
      const listRes = await listPersonalDashboardsV2();
      if (listRes.ok) {
        setDashboards(listRes.value);
      }
    },
    [options?.preferredDashboardId, orgId, userId, v1Preferences.state?.config],
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

  // Gezieltes Öffnen eines Dashboards
  const openDashboard = useCallback(
    async (id: string): Promise<boolean> => {
      setStatus('laden');
      setError(null);
      const res = await loadPersonalDashboardV2(id);
      if (!res.ok || !res.value) {
        setError(res.ok ? { kind: 'nicht_gefunden' } : res.error);
        setStatus('fehler');
        return false;
      }
      setActiveDashboardV2Id(orgId, userId, res.value.id);
      setDashboard(res.value);
      setStatus('bereit');
      await refreshList();
      return true;
    },
    [orgId, userId, refreshList],
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
      setDashboard(updatedRow);
      await refreshList();
      return { ok: true, value: res.value };
    },
    [dashboard, refreshList],
  );

  // Aus Vorlage erstellen
  const createFromTemplate = useCallback(
    async (templateId: string, title?: string): Promise<SaveV2Result> => {
      const { getDashboardTemplateV2ById } = await import(
        '../model/dashboardTemplatesV2'
      );
      const template = getDashboardTemplateV2ById(templateId);
      if (!template) {
        const err: DashboardV2StorageError = {
          kind: 'ungueltig',
          detail: 'Unbekannte Vorlage',
        };
        setError(err);
        return { ok: false, error: err };
      }

      setIsSaving(true);
      setError(null);

      const targetTitle = title?.trim() || template.name;
      const context = {
        id: 'dash_v2_' + Math.random().toString(36).slice(2, 10),
        title: targetTitle,
        ownerUserId: userId,
        organizationId: orgId,
        scope: 'personal' as const,
      };
      const initialConfig = template.build(context);

      const res = await createDashboardV2({
        title: targetTitle,
        config: initialConfig,
        scope: 'personal',
      });

      setIsSaving(false);

      if (!res.ok) {
        setError(res.error);
        return { ok: false, error: res.error };
      }

      setActiveDashboardV2Id(orgId, userId, res.value.dashboardId);
      const loaded = await loadPersonalDashboardV2(res.value.dashboardId);
      if (loaded.ok && loaded.value) {
        setDashboard(loaded.value);
      }
      await refreshList();
      return { ok: true, value: res.value };
    },
    [orgId, userId, refreshList],
  );

  // Aktuelles Dashboard duplizieren
  const duplicateCurrent = useCallback(
    async (title?: string): Promise<SaveV2Result> => {
      if (!dashboard) {
        return { ok: false, error: { kind: 'nicht_gefunden' } };
      }
      setIsSaving(true);
      setError(null);

      const targetTitle =
        title?.trim() ||
        buildDerivedDashboardTitle(dashboard.title, ' (Kopie)');
      const res = await duplicatePersonalDashboardV2({
        dashboardId: dashboard.id,
        title: targetTitle,
      });

      setIsSaving(false);

      if (!res.ok) {
        setError(res.error);
        return { ok: false, error: res.error };
      }

      setActiveDashboardV2Id(orgId, userId, res.value.dashboardId);
      const loaded = await loadPersonalDashboardV2(res.value.dashboardId);
      if (loaded.ok && loaded.value) {
        setDashboard(loaded.value);
      }
      await refreshList();
      return {
        ok: true,
        value: {
          dashboardId: res.value.dashboardId,
          revision: res.value.revision,
          updatedAt: res.value.createdAt,
        },
      };
    },
    [dashboard, orgId, userId, refreshList],
  );

  // Dashboard löschen
  const deleteDashboard = useCallback(
    async (id: string): Promise<DeleteV2Result> => {
      setIsSaving(true);
      setError(null);

      const isCurrent = dashboard?.id === id;
      const expectedRevision = isCurrent
        ? dashboard.revision
        : dashboards.find((d) => d.id === id)?.revision;

      const res = await deletePersonalDashboardV2({
        dashboardId: id,
        expectedRevision,
      });

      setIsSaving(false);

      if (!res.ok) {
        setError(res.error);
        return { ok: false, error: res.error };
      }

      if (isCurrent && res.value.nextDashboardId) {
        setActiveDashboardV2Id(orgId, userId, res.value.nextDashboardId);
        const loaded = await loadPersonalDashboardV2(res.value.nextDashboardId);
        if (loaded.ok && loaded.value) {
          setDashboard(loaded.value);
        }
      }

      await refreshList();
      return { ok: true, nextDashboardId: res.value.nextDashboardId };
    },
    [dashboard, dashboards, orgId, userId, refreshList],
  );

  // Speichern als neue persönliche Kopie (z.B. Konflikt- oder Lösch-Rettung)
  const saveAsNewPersonalCopy = useCallback(
    async (config: DashboardConfigV2, title?: string): Promise<SaveV2Result> => {
      setIsSaving(true);
      setError(null);

      const copyTitle = title?.trim() || buildDerivedDashboardTitle(config.title, ' (Kopie)');
      const copyId = 'dash_v2_' + Math.random().toString(36).slice(2, 10);
      const newConfig: DashboardConfigV2 = normalizeDashboardLayouts({
        ...config,
        id: copyId,
        title: copyTitle,
        metadata: {
          ...config.metadata,
          user_edited: true,
        },
      });

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
      await refreshList();
      return { ok: true, value: res.value };
    },
    [orgId, userId, refreshList],
  );

  return {
    status,
    dashboard,
    dashboards,
    error,
    isSaving,
    save,
    reload,
    refreshList,
    openDashboard,
    createFromTemplate,
    duplicateCurrent,
    deleteDashboard,
    saveAsNewPersonalCopy,
  };
}
