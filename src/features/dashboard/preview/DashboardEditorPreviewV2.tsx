// Executive Dashboard V2 (Auftrag 148 & 158 / P05 & P09b, Auftrag 163 / P11b):
// Vorschau-Komponente für den visuellen Dashboard-Editor V2 ohne Anmeldung.
// Unterstützt Vorlagen, Sektionen, Dashboard-Auswahl und Team-Freigaben (&teams=1 / &teams=entzogen).

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { TeamAccessRevokedDialogV2 } from '../components/editor/TeamAccessRevokedDialogV2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { useEditorPreviewData } from './editorPreviewData';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';
import { useTimeControlledSource } from '../time/useTimeControlledData';
import { createPreviewLiveStore, parsePreviewLiveScenario } from './previewLiveStore';
import type { TileDataHook } from '../components/LazyDashboardTile';
import {
  INITIAL_PREVIEW_DASHBOARDS,
  INITIAL_TEAM_DASHBOARDS,
  PREVIEW_TEAMS,
} from './previewTeamDashboards';

/** Vorschau-Daten mit derselben gemeinsamen Zeitsteuerung wie der echte V2-Pfad. */
const usePreviewDataTimeControlled: TileDataHook = (tile, filters, options) =>
  useTimeControlledSource(useEditorPreviewData, tile, filters, options);

export function DashboardEditorPreviewV2() {
  const [teamsScenario] = useState(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('teams');
  });

  const [dashboards, setDashboards] = useState<AccessibleDashboardListItemV2[]>(() => {
    if (teamsScenario === '1' || teamsScenario === 'entzogen') {
      return [...INITIAL_PREVIEW_DASHBOARDS, ...INITIAL_TEAM_DASHBOARDS];
    }
    return INITIAL_PREVIEW_DASHBOARDS;
  });

  const [activeDashboardId, setActiveDashboardId] = useState<string>(() => {
    if (teamsScenario === 'entzogen') return 'preview_team_dash_write';
    return 'preview_v2_dashboard';
  });

  const [showRevokedDialog, setShowRevokedDialog] = useState(false);

  const [liveScenario] = useState(() => {
    const value =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('live')
        : null;
    return parsePreviewLiveScenario(value);
  });
  const [liveStore] = useState(() => createPreviewLiveStore(liveScenario));

  const [config, setConfig] = useState<DashboardConfigV2>(() => {
    const isEntzogen = teamsScenario === 'entzogen';
    const baseId = isEntzogen ? 'preview_team_dash_write' : 'preview_v2_dashboard';
    const baseTitle = isEntzogen ? 'Team Nord Vertrieb' : 'Executive Dashboard (V2 Beta)';

    const base = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, {
      id: baseId,
      title: baseTitle,
      ownerUserId: 'demo-user-preview',
      organizationId: 'demo-org-preview',
    });

    const scenario =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('scenario')
        : null;

    if ((scenario === 'sections' || scenario === 'confirm') && base.tiles.length >= 6) {
      const sec1Tiles = base.tiles.slice(0, 3).map((t) => t.id);
      const sec2Tiles = base.tiles.slice(3, 6).map((t) => t.id);
      return {
        ...base,
        sections: [
          {
            id: 'sec_finanzen',
            title: 'Finanzen & Ertrag',
            collapsed: false,
            tileIds: sec1Tiles,
          },
          {
            id: 'sec_pipeline',
            title: 'Pipeline & Vertrieb',
            collapsed: true,
            tileIds: sec2Tiles,
          },
        ],
      };
    }

    return base;
  });

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [revokedDraftConfig, setRevokedDraftConfig] = useState<DashboardConfigV2 | null>(null);

  const handleSave = useCallback(
    async (newConfig: DashboardConfigV2): Promise<boolean> => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (teamsScenario === 'entzogen') {
        setRevokedDraftConfig(newConfig);
        setShowRevokedDialog(true);
        return false;
      }
      setConfig(newConfig);
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === activeDashboardId
            ? {
                ...d,
                title: newConfig.title,
                tileCount: newConfig.tiles.length,
                sectionCount: newConfig.sections?.length ?? 0,
                updatedAt: new Date().toISOString(),
              }
            : d,
        ),
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
      const { getDashboardTemplateV2ById } = await import('../model/dashboardTemplatesV2');
      const template = getDashboardTemplateV2ById(templateId);
      const newTitle = title?.trim() || template?.name || 'Neues Dashboard';
      const newId = 'preview_' + Math.random().toString(36).slice(2, 8);
      const now = new Date().toISOString();
      const scope = target?.scope ?? 'personal';
      const targetTeam =
        scope === 'team' ? PREVIEW_TEAMS.find((t) => t.id === target?.teamId) : null;

      const newListItem: AccessibleDashboardListItemV2 = {
        id: newId,
        title: newTitle,
        scope,
        teamId: scope === 'team' ? (target?.teamId ?? null) : null,
        teamName: targetTeam ? targetTeam.name : null,
        canWrite: true,
        revision: 1,
        tileCount: template?.tileCount ?? 0,
        sectionCount: template?.sectionCount ?? 0,
        updatedAt: now,
      };

      setDashboards((prev) => [newListItem, ...prev]);
      setActiveDashboardId(newId);
      if (template) {
        const built = template.build({
          id: newId,
          title: newTitle,
          ownerUserId: 'demo-user-preview',
          organizationId: 'demo-org-preview',
        });
        setConfig(built);
      }
      return { ok: true, value: { dashboardId: newId, revision: 1, updatedAt: now } };
    },
    [],
  );

  const handleDuplicateCurrent = useCallback(
    async (
      title?: string,
      target?: { scope: 'personal' | 'team'; teamId?: string },
      sourceConfig?: DashboardConfigV2,
    ) => {
      const base = sourceConfig ?? config;
      const targetTitle = title?.trim() || buildDerivedDashboardTitle(base.title, ' (Kopie)');
      const newId = 'preview_' + Math.random().toString(36).slice(2, 8);
      const now = new Date().toISOString();
      const scope = target?.scope ?? 'personal';
      const targetTeam =
        scope === 'team' ? PREVIEW_TEAMS.find((t) => t.id === target?.teamId) : null;

      const newListItem: AccessibleDashboardListItemV2 = {
        id: newId,
        title: targetTitle,
        scope,
        teamId: scope === 'team' ? (target?.teamId ?? null) : null,
        teamName: targetTeam ? targetTeam.name : null,
        canWrite: true,
        revision: 1,
        tileCount: base.tiles.length,
        sectionCount: base.sections?.length ?? 0,
        updatedAt: now,
      };

      setDashboards((prev) => [newListItem, ...prev]);
      setActiveDashboardId(newId);
      setConfig({
        ...base,
        id: newId,
        title: targetTitle,
        scope,
        teamId: scope === 'team' && target?.teamId ? target.teamId : undefined,
      });
      return { ok: true, value: { dashboardId: newId, revision: 1, updatedAt: now } };
    },
    [config],
  );

  const handleShareWithTeam = useCallback(
    async (teamId: string, title: string) => {
      const targetTeam = PREVIEW_TEAMS.find((t) => t.id === teamId);
      const newId = 'preview_team_' + Math.random().toString(36).slice(2, 8);
      const now = new Date().toISOString();

      const newListItem: AccessibleDashboardListItemV2 = {
        id: newId,
        title,
        scope: 'team',
        teamId,
        teamName: targetTeam?.name ?? 'Team',
        canWrite: true,
        revision: 1,
        tileCount: config.tiles.length,
        sectionCount: config.sections?.length ?? 0,
        updatedAt: now,
      };

      setDashboards((prev) => [newListItem, ...prev]);
      setActiveDashboardId(newId);
      setConfig((prev) => ({
        ...prev,
        id: newId,
        title,
        scope: 'team',
        teamId,
      }));
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
      {/* Vorschau-Banner */}
      <div
        data-testid="editor-v2-preview-banner"
        className="flex h-7 items-center justify-between border-b border-primary/20 bg-primary/10 px-4 text-[11px] text-primary select-none"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="neutral"
            className="border-primary/40 bg-primary/20 text-primary text-[10px] uppercase"
          >
            Beta-Vorschau
          </Badge>
          <span>
            Dashboard-Editor V2 (P09b/P11b) • Vorschau mit Vorlagenauswahl und Team-Freigaben
          </span>
        </div>
        {saveMessage && (
          <span className="font-semibold text-emerald-400 animate-fade-in">{saveMessage}</span>
        )}
      </div>

      {/* Die 4-Zonen-Shell; Höhe minus Vorschau-Banner, damit die Statusleiste sichtbar bleibt. */}
      <div className="h-[calc(100vh-1.75rem)] overflow-hidden">
        <DashboardEditorShellV2
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
          onSaveAsPersonalCopy={async () => {
            await handleDuplicateCurrent(buildDerivedDashboardTitle(config.title, ' (Kopie)'));
          }}
        />
      </div>

      <TeamAccessRevokedDialogV2
        open={showRevokedDialog}
        dashboardTitle={config.title}
        onSaveAsPersonalCopy={async () => {
          const draft = revokedDraftConfig ?? config;
          const copyTitle = buildDerivedDashboardTitle(draft.title, ' (Persönliche Kopie)');
          await handleDuplicateCurrent(copyTitle, { scope: 'personal' }, draft);
          setShowRevokedDialog(false);
          setRevokedDraftConfig(null);
        }}
        onDiscardAndReload={() => {
          setShowRevokedDialog(false);
          setRevokedDraftConfig(null);
        }}
      />
    </div>
  );
}
