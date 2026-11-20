// Executive Dashboard V2: Vorschau-Komponente für visuellen Dashboard-Editor V2 ohne Anmeldung.
import { useCallback, useState } from 'react';
import { PreviewBannerV2 } from './PreviewBannerV2';
import { DashboardAlarmsPage } from '../pages/DashboardAlarmsPage';
import { AdminAlarmsPage } from '@/features/admin/pages/AdminAlarmsPage';
import { PREVIEW_ALARMS_DASHBOARD_ID } from './previewAlarms';
import { readPreviewParams } from './previewParams';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { useEditorPreviewData } from './editorPreviewData';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';
import { useTimeControlledSource } from '../time/useTimeControlledData';
import { createPreviewLiveStore } from './previewLiveStore';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { PREVIEW_TEAMS } from './previewTeamDashboards';
import { PREVIEW_VERSIONS_DASHBOARD_ID } from './previewRevisions';
import { PreviewDialogsV2 } from './PreviewDialogsV2';
import { useDashboardImport } from '../components/editor/selection/useDashboardImport';
import { restoreDashboardV2Revision } from '../services/dashboardStorageV2';
import { inMemoryStore } from '../services/dashboardInMemoryStoreV2';
import {
  createPreviewFromTemplate,
  duplicatePreviewDashboard,
  sharePreviewWithTeam,
  initPreviewConfig,
  initPreviewDashboards,
  createPreviewImportDashboard,
  savePreviewDraftCopy,
  savePreviewDashboardDraft,
} from './previewDashboardMutations';
import {
  PREVIEW_TRANSFORMATIONS_DASHBOARD_ID,
  createPreviewTransformationsConfig,
  createPreviewTransformationsListItem,
} from './previewTransformations';

/** Vorschau-Daten mit derselben gemeinsamen Zeitsteuerung wie der echte V2-Pfad. */
const usePreviewDataTimeControlled: TileDataHook = (tile, filters, options) =>
  useTimeControlledSource(useEditorPreviewData, tile, filters, options);

export function DashboardEditorPreviewV2() {
  const [params] = useState(readPreviewParams);
  const {
    teams: teamsScenario,
    versionen: versionenScenario,
    schwellenwerte: schwellenwerteScenario,
    alarme: alarmeScenario,
    transformationen: transformationenScenario,
    live: liveScenario,
  } = params;
  const [previewTab, setPreviewTab] = useState<'editor' | 'alarme' | 'admin'>('editor');

  const [dashboards, setDashboards] = useState<AccessibleDashboardListItemV2[]>(() => {
    const list = initPreviewDashboards(
      versionenScenario,
      teamsScenario,
      schwellenwerteScenario,
      alarmeScenario,
    );
    return transformationenScenario ? [createPreviewTransformationsListItem(), ...list] : list;
  });

  const [activeDashboardId, setActiveDashboardId] = useState<string>(() => {
    if (transformationenScenario) return PREVIEW_TRANSFORMATIONS_DASHBOARD_ID;
    if (alarmeScenario) return PREVIEW_ALARMS_DASHBOARD_ID;
    if (schwellenwerteScenario) return 'preview_thresholds_dashboard';
    if (versionenScenario) return PREVIEW_VERSIONS_DASHBOARD_ID;
    if (teamsScenario === 'entzogen') return 'preview_team_dash_write';
    return 'preview_v2_dashboard';
  });

  const [showRevokedDialog, setShowRevokedDialog] = useState(false);
  const [liveStore] = useState(() => createPreviewLiveStore(liveScenario));
  const [config, setConfig] = useState<DashboardConfigV2>(() => {
    if (transformationenScenario) return createPreviewTransformationsConfig();
    return initPreviewConfig(
      versionenScenario,
      teamsScenario,
      schwellenwerteScenario,
      alarmeScenario,
    );
  });

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [revokedDraftConfig, setRevokedDraftConfig] = useState<DashboardConfigV2 | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const handleSave = useCallback(
    async (newConfig: DashboardConfigV2): Promise<boolean> => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (teamsScenario === 'entzogen') {
        setRevokedDraftConfig(newConfig);
        setShowRevokedDialog(true);
        return false;
      }
      const saved = await savePreviewDashboardDraft({
        dashboardId: activeDashboardId,
        config: newConfig,
      });
      if (!saved.ok) {
        setSaveMessage('Speichern fehlgeschlagen. Bitte erneut versuchen.');
        setTimeout(() => setSaveMessage(null), 3000);
        return false;
      }
      setConfig(saved.config);
      setDashboards((prev) =>
        prev.map((d) => (d.id === activeDashboardId ? { ...d, ...saved.listPatch } : d)),
      );
      setSaveMessage('Dashboard-Entwurf erfolgreich im Speicher gesichert!');
      setTimeout(() => setSaveMessage(null), 3000);
      return true;
    },
    [activeDashboardId, teamsScenario],
  );

  const handleOpenDashboard = useCallback(
    async (id: string): Promise<boolean> => {
      setActiveDashboardId(id);
      const mem = inMemoryStore.get(id);
      if (mem) {
        setConfig(mem.row.config);
        setDashboards((prev) => {
          if (prev.some((d) => d.id === id)) return prev;
          return [
            {
              id: mem.row.id,
              title: mem.row.title,
              scope: mem.row.scope,
              revision: mem.row.revision,
              tileCount: mem.row.config.tiles.length,
              sectionCount: mem.row.config.sections?.length ?? 0,
              updatedAt: mem.row.updatedAt,
              teamId: mem.row.teamId ?? null,
              teamName: mem.row.teamName ?? null,
              canWrite: true,
            },
            ...prev,
          ];
        });
        return true;
      }
      const target = dashboards.find((d) => d.id === id);
      if (target) {
        setConfig((prev) => ({
          ...prev,
          id,
          title: target.title,
          scope: target.scope,
          teamId: target.scope === 'team' && target.teamId ? target.teamId : undefined,
        }));
      }
      return true;
    },
    [dashboards],
  );

  const handleCreateFromTemplate = useCallback(
    async (
      templateId: string,
      title?: string,
      target?: { scope: 'personal' | 'team'; teamId?: string },
    ) => {
      const { listItem, config: newConfig } = await createPreviewFromTemplate(
        templateId,
        title,
        target,
      );
      setDashboards((prev) => [listItem, ...prev]);
      setActiveDashboardId(listItem.id);
      if (newConfig) setConfig(newConfig);
      return {
        ok: true,
        value: { dashboardId: listItem.id, revision: 1, updatedAt: listItem.updatedAt },
      };
    },
    [],
  );

  const handleDuplicateCurrent = useCallback(
    async (
      title?: string,
      target?: { scope: 'personal' | 'team'; teamId?: string },
      sourceConfig?: DashboardConfigV2,
    ) => {
      const { listItem, config: newConfig } = duplicatePreviewDashboard(
        sourceConfig ?? config,
        title,
        target,
      );
      setDashboards((prev) => [listItem, ...prev]);
      setActiveDashboardId(listItem.id);
      setConfig(newConfig);
      return {
        ok: true,
        value: { dashboardId: listItem.id, revision: 1, updatedAt: listItem.updatedAt },
      };
    },
    [config],
  );

  const handleShareWithTeam = useCallback(
    async (teamId: string, title: string) => {
      const { listItem, config: newConfig } = sharePreviewWithTeam(config, teamId, title);
      setDashboards((prev) => [listItem, ...prev]);
      setActiveDashboardId(listItem.id);
      setConfig(newConfig);
      return { ok: true };
    },
    [config],
  );

  const handleDeleteDashboard = useCallback(
    async (id: string) => {
      const remaining = dashboards.filter((d) => d.id !== id);
      setDashboards(remaining);
      const next = remaining[0];
      if (next) {
        setActiveDashboardId(next.id);
        setConfig((prev) => ({ ...prev, id: next.id, title: next.title }));
      }
      return { ok: true as const, nextDashboardId: next?.id ?? null };
    },
    [dashboards],
  );

  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [versionsContext, setVersionsContext] = useState<{
    isDirty: boolean;
    draftConfig?: DashboardConfigV2;
  } | null>(null);

  const handleRestoreRevision = useCallback(
    async (targetRevision: number, options?: { saveDraftAsCopy: boolean }): Promise<boolean> => {
      if (options?.saveDraftAsCopy && versionsContext?.draftConfig) {
        // Entwurf als echte Kopie sichern; das ursprüngliche Dashboard bleibt aktiv.
        const listItem = savePreviewDraftCopy(versionsContext.draftConfig);
        setDashboards((prev) => [listItem, ...prev]);
      }
      const res = await restoreDashboardV2Revision({
        dashboardId: activeDashboardId,
        targetRevision,
      });
      if (res.ok) {
        const entry = inMemoryStore.get(activeDashboardId);
        if (entry) {
          setConfig(entry.row.config);
          setPreviewKey((k) => k + 1);
          setDashboards((prev) =>
            prev.map((d) =>
              d.id === activeDashboardId
                ? {
                    ...d,
                    revision: entry.row.revision,
                    tileCount: entry.row.config.tiles.length,
                    sectionCount: entry.row.config.sections?.length ?? 0,
                  }
                : d,
            ),
          );
        }
        setIsVersionsOpen(false);
        setSaveMessage(`Revision ${targetRevision} erfolgreich wiederhergestellt!`);
        setTimeout(() => setSaveMessage(null), 3000);
        return true;
      }
      return false;
    },
    [activeDashboardId, versionsContext?.draftConfig],
  );

  const dashboardImport = useDashboardImport({
    userId: 'demo-user-preview',
    organizationId: 'demo-org-preview',
    teams: PREVIEW_TEAMS,
    personalCount: dashboards.filter((d) => d.scope === 'personal').length,
    onOpenDashboard: handleOpenDashboard,
    onRefreshList: async () => {},
    createDashboardFn: async (params) => {
      const { listItem, dashboardId } = createPreviewImportDashboard(params);
      setDashboards((prev) => [listItem, ...prev]);
      return { ok: true, value: { dashboardId, revision: 1, updatedAt: listItem.updatedAt } };
    },
  });

  const currentItem = dashboards.find((d) => d.id === activeDashboardId);
  const currentStored: StoredDashboardV2Row = {
    id: activeDashboardId,
    title: config.title,
    scope: currentItem?.scope ?? 'personal',
    revision: currentItem?.revision ?? 1,
    config,
    updatedAt: new Date().toISOString(),
    teamId: currentItem?.scope === 'team' ? currentItem.teamId : undefined,
    teamName: currentItem?.scope === 'team' ? currentItem.teamName : undefined,
    canWrite: currentItem ? (currentItem.canWrite ?? true) : true,
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-[var(--color-bg-deep,#030c0b)]">
      <PreviewBannerV2
        saveMessage={saveMessage}
        alarmeScenario={alarmeScenario}
        activeTab={previewTab}
        onTabChange={setPreviewTab}
      />

      {alarmeScenario && previewTab !== 'editor' && (
        <div className="h-[calc(100vh-2.5rem)] overflow-y-auto overflow-x-hidden p-3 sm:p-6 max-w-full">
          {previewTab === 'alarme' ? <DashboardAlarmsPage /> : <AdminAlarmsPage />}
        </div>
      )}

      {(!alarmeScenario || previewTab === 'editor') && (
        <div className="h-[calc(100vh-2.5rem)] overflow-hidden">
          <DashboardEditorShellV2
            key={`preview-${activeDashboardId}-${previewKey}`}
            className="h-full"
            initialConfig={config}
            useData={usePreviewDataTimeControlled}
            onSave={handleSave}
            onCancel={() => {
              if (typeof window !== 'undefined') {
                window.location.search = '';
              }
            }}
            liveStore={liveStore}
            liveConfigured={liveScenario !== 'nicht_konfiguriert'}
            dashboards={dashboards}
            currentStoredDashboard={currentStored}
            onOpenDashboard={handleOpenDashboard}
            onCreateFromTemplate={handleCreateFromTemplate}
            onDuplicateCurrent={handleDuplicateCurrent}
            onDeleteDashboard={handleDeleteDashboard}
            onShareWithTeam={handleShareWithTeam}
            onOpenVersions={(ctx) => {
              setVersionsContext(ctx ?? null);
              setIsVersionsOpen(true);
            }}
            onOpenImport={dashboardImport.openImport}
            onSaveAsPersonalCopy={async () => {
              await handleDuplicateCurrent(buildDerivedDashboardTitle(config.title, ' (Kopie)'));
            }}
          />
        </div>
      )}

      <PreviewDialogsV2
        showRevoked={showRevokedDialog}
        dashboardTitle={config.title}
        onSaveAsPersonalCopyFromRevoked={async () => {
          const draft = revokedDraftConfig ?? config;
          const copyTitle = buildDerivedDashboardTitle(draft.title, ' (Persönliche Kopie)');
          await handleDuplicateCurrent(copyTitle, { scope: 'personal' }, draft);
          setShowRevokedDialog(false);
          setRevokedDraftConfig(null);
        }}
        onDiscardAndReloadFromRevoked={() => {
          setShowRevokedDialog(false);
          setRevokedDraftConfig(null);
        }}
        isVersionsOpen={isVersionsOpen}
        dashboardId={activeDashboardId}
        currentRevision={currentStored.revision}
        currentConfig={config}
        isDirty={versionsContext?.isDirty ?? false}
        draftConfig={versionsContext?.draftConfig}
        onCloseVersions={() => {
          setIsVersionsOpen(false);
          setVersionsContext(null);
        }}
        onRestoreRevision={handleRestoreRevision}
        onSaveAsCopy={async (_cfg, title) =>
          handleCreateFromTemplate('custom', title, { scope: 'personal' })
        }
        pageSize={4}
        isImportOpen={dashboardImport.isOpen}
        importFile={dashboardImport.file}
        importParseResult={dashboardImport.parseResult}
        importTitle={dashboardImport.title}
        onImportTitleChange={dashboardImport.setTitle}
        importTargetScope={dashboardImport.targetScope}
        importTargetTeamId={dashboardImport.targetTeamId}
        onImportTargetChange={dashboardImport.setTargetScope}
        importTeams={dashboardImport.teams}
        isImportSubmitting={dashboardImport.isSubmitting}
        importSubmitError={dashboardImport.submitError}
        onImportFileSelect={dashboardImport.handleFileSelect}
        onConfirmImport={dashboardImport.executeImport}
        onCloseImport={dashboardImport.closeImport}
      />
    </div>
  );
}
