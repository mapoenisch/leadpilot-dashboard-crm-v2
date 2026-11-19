// Executive Dashboard V2 (Auftrag 165 / P12):
// Mutationslogik für Vorschau-Szenarien zur Einhaltung der <= 400 Zeilen-Grenze.

import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type {
  AccessibleDashboardListItemV2,
  DashboardV2StorageError,
} from '../services/dashboardStorageV2Types';
import { normalizeDashboardLayouts } from '../services/dashboardLayoutIntegrity';
import { saveDashboardV2 } from '../services/dashboardStorageV2';
import {
  PREVIEW_TEAMS,
  INITIAL_PREVIEW_DASHBOARDS,
  INITIAL_TEAM_DASHBOARDS,
} from './previewTeamDashboards';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';
import { inMemoryStore } from '../services/dashboardInMemoryStoreV2';
import { PREVIEW_VERSIONS_DASHBOARD_ID, initPreviewVersionsStore } from './previewRevisions';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import {
  PREVIEW_THRESHOLDS_DASHBOARD_ID,
  createPreviewThresholdsConfig,
  createPreviewThresholdsListItem,
} from './previewThresholds';
import {
  createPreviewAlarmsConfig,
  createPreviewAlarmsListItem,
} from './previewAlarms';

export type PreviewDashboardSaveResult =
  | {
      ok: true;
      config: DashboardConfigV2;
      listPatch: Partial<AccessibleDashboardListItemV2>;
    }
  | { ok: false; error: DashboardV2StorageError };

/**
 * Speichert den Editor-Entwurf. Liegt das Vorschau-Dashboard im gemeinsamen
 * In-Memory-Revisionsspeicher (versionen=1, Import, Entwurf-Kopie), wird eine
 * neue Revision angelegt – ein Dashboard-Wechsel lädt danach den gespeicherten
 * Stand statt des Ursprungsstands (Codex P2). Sonst bleibt alles lokal.
 */
export async function savePreviewDashboardDraft(params: {
  dashboardId: string;
  config: DashboardConfigV2;
}): Promise<PreviewDashboardSaveResult> {
  if (
    typeof window !== 'undefined' &&
    window.sessionStorage &&
    params.dashboardId === PREVIEW_THRESHOLDS_DASHBOARD_ID
  ) {
    try {
      window.sessionStorage.setItem(
        'dashboard-preview-thresholds-config',
        JSON.stringify(params.config),
      );
    } catch {
      /* ignore */
    }
  }
  const entry = inMemoryStore.get(params.dashboardId);
  if (!entry) {
    return {
      ok: true,
      config: params.config,
      listPatch: {
        title: params.config.title,
        tileCount: params.config.tiles.length,
        sectionCount: params.config.sections?.length ?? 0,
        updatedAt: new Date().toISOString(),
      },
    };
  }
  const config = normalizeDashboardLayouts({
    ...params.config,
    metadata: { ...params.config.metadata, user_edited: true },
  });
  const res = await saveDashboardV2({
    dashboardId: params.dashboardId,
    expectedRevision: entry.row.revision,
    title: config.title,
    config,
  });
  if (!res.ok) return { ok: false, error: res.error };
  return {
    ok: true,
    config,
    listPatch: {
      title: config.title,
      revision: res.value.revision,
      tileCount: config.tiles.length,
      sectionCount: config.sections?.length ?? 0,
      updatedAt: res.value.updatedAt,
    },
  };
}

export function initPreviewDashboards(
  versionenScenario: boolean,
  teamsScenario: string | null,
  schwellenwerteScenario?: boolean,
  alarmeScenario?: boolean,
): AccessibleDashboardListItemV2[] {
  if (alarmeScenario) {
    const isViewer = teamsScenario === '1' || teamsScenario === 'viewer';
    const alarmItem = createPreviewAlarmsListItem(!isViewer);
    const rest =
      teamsScenario === '1' || teamsScenario === 'entzogen'
        ? [...INITIAL_PREVIEW_DASHBOARDS, ...INITIAL_TEAM_DASHBOARDS]
        : INITIAL_PREVIEW_DASHBOARDS;
    return [alarmItem, ...rest];
  }
  if (schwellenwerteScenario) {
    const isViewer = teamsScenario === '1' || teamsScenario === 'viewer';
    const threshItem = createPreviewThresholdsListItem(!isViewer);
    const rest =
      teamsScenario === '1' || teamsScenario === 'entzogen'
        ? [...INITIAL_PREVIEW_DASHBOARDS, ...INITIAL_TEAM_DASHBOARDS]
        : INITIAL_PREVIEW_DASHBOARDS;
    return [threshItem, ...rest];
  }
  if (versionenScenario) {
    const { currentConfig } = initPreviewVersionsStore();
    const base: AccessibleDashboardListItemV2[] = [
      {
        id: PREVIEW_VERSIONS_DASHBOARD_ID,
        title: currentConfig.title,
        scope: 'personal',
        revision: 4,
        tileCount: currentConfig.tiles.length,
        sectionCount: currentConfig.sections?.length ?? 0,
        updatedAt: new Date().toISOString(),
        teamId: null,
        teamName: null,
        canWrite: true,
      },
      ...INITIAL_PREVIEW_DASHBOARDS,
    ];
    if (teamsScenario === '1' || teamsScenario === 'entzogen') {
      return [...base, ...INITIAL_TEAM_DASHBOARDS];
    }
    return base;
  }
  if (teamsScenario === '1' || teamsScenario === 'entzogen') {
    return [...INITIAL_PREVIEW_DASHBOARDS, ...INITIAL_TEAM_DASHBOARDS];
  }
  return INITIAL_PREVIEW_DASHBOARDS;
}

export interface CreateFromTemplateResult {
  listItem: AccessibleDashboardListItemV2;
  config: DashboardConfigV2 | null;
}

export async function createPreviewFromTemplate(
  templateId: string,
  title?: string,
  target?: { scope: 'personal' | 'team'; teamId?: string },
): Promise<CreateFromTemplateResult> {
  const { getDashboardTemplateV2ById } = await import('../model/dashboardTemplatesV2');
  const template = getDashboardTemplateV2ById(templateId);
  const newTitle = title?.trim() || template?.name || 'Neues Dashboard';
  const newId = 'preview_' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const scope = target?.scope ?? 'personal';
  const targetTeam = scope === 'team' ? PREVIEW_TEAMS.find((t) => t.id === target?.teamId) : null;

  const listItem: AccessibleDashboardListItemV2 = {
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

  const config = template
    ? template.build({
        id: newId,
        title: newTitle,
        ownerUserId: 'demo-user-preview',
        organizationId: 'demo-org-preview',
      })
    : null;

  return { listItem, config };
}

export function duplicatePreviewDashboard(
  baseConfig: DashboardConfigV2,
  title?: string,
  target?: { scope: 'personal' | 'team'; teamId?: string },
): { listItem: AccessibleDashboardListItemV2; config: DashboardConfigV2 } {
  const targetTitle = title?.trim() || buildDerivedDashboardTitle(baseConfig.title, ' (Kopie)');
  const newId = 'preview_' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const scope = target?.scope ?? 'personal';
  const targetTeam = scope === 'team' ? PREVIEW_TEAMS.find((t) => t.id === target?.teamId) : null;

  const listItem: AccessibleDashboardListItemV2 = {
    id: newId,
    title: targetTitle,
    scope,
    teamId: scope === 'team' ? (target?.teamId ?? null) : null,
    teamName: targetTeam ? targetTeam.name : null,
    canWrite: true,
    revision: 1,
    tileCount: baseConfig.tiles.length,
    sectionCount: baseConfig.sections?.length ?? 0,
    updatedAt: now,
  };

  const config: DashboardConfigV2 = {
    ...baseConfig,
    id: newId,
    title: targetTitle,
    scope,
    teamId: scope === 'team' && target?.teamId ? target.teamId : undefined,
  };

  return { listItem, config };
}

export function sharePreviewWithTeam(
  baseConfig: DashboardConfigV2,
  teamId: string,
  title: string,
): { listItem: AccessibleDashboardListItemV2; config: DashboardConfigV2 } {
  const targetTeam = PREVIEW_TEAMS.find((t) => t.id === teamId);
  const newId = 'preview_team_' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();

  const listItem: AccessibleDashboardListItemV2 = {
    id: newId,
    title,
    scope: 'team',
    teamId,
    teamName: targetTeam?.name ?? 'Team',
    canWrite: true,
    revision: 1,
    tileCount: baseConfig.tiles.length,
    sectionCount: baseConfig.sections?.length ?? 0,
    updatedAt: now,
  };

  const config: DashboardConfigV2 = {
    ...baseConfig,
    id: newId,
    title,
    scope: 'team',
    teamId,
  };

  return { listItem, config };
}

export function initPreviewConfig(
  versionenScenario: boolean,
  teamsScenario: string | null,
  schwellenwerteScenario?: boolean,
  alarmeScenario?: boolean,
): DashboardConfigV2 {
  if (alarmeScenario) {
    return createPreviewAlarmsConfig();
  }
  if (schwellenwerteScenario) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem('dashboard-preview-thresholds-config');
        if (stored) return JSON.parse(stored) as DashboardConfigV2;
      } catch {
        /* ignore */
      }
    }
    return createPreviewThresholdsConfig();
  }
  if (versionenScenario) {
    const entry = inMemoryStore.get(PREVIEW_VERSIONS_DASHBOARD_ID);
    if (entry) return entry.row.config;
  }
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
}

export function createPreviewImportDashboard(params: {
  title: string;
  config: DashboardConfigV2;
  scope?: 'personal' | 'team';
  teamId?: string;
  changeSummary?: string;
}): { listItem: AccessibleDashboardListItemV2; dashboardId: string } {
  const newId = 'preview_imported_' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const targetTeam = params.teamId ? PREVIEW_TEAMS.find((t) => t.id === params.teamId) : null;

  const listItem: AccessibleDashboardListItemV2 = {
    id: newId,
    title: params.title,
    scope: params.scope ?? 'personal',
    teamId: params.teamId ?? null,
    teamName: targetTeam ? targetTeam.name : null,
    revision: 1,
    tileCount: params.config.tiles?.length ?? 0,
    sectionCount: params.config.sections?.length ?? 0,
    updatedAt: now,
    canWrite: true,
  };

  inMemoryStore.set(newId, {
    row: {
      id: newId,
      title: params.title,
      scope: params.scope ?? 'personal',
      teamId: params.teamId ?? null,
      teamName: listItem.teamName,
      revision: 1,
      config: { ...params.config, id: newId, title: params.title },
      updatedAt: now,
    },
    revisions: [
      {
        revision: 1,
        title: params.title,
        createdByUserId: 'demo-user-preview',
        createdAt: now,
        changeSummary: params.changeSummary ?? 'Aus Datei importiert',
        config: { ...params.config, id: newId, title: params.title },
      },
    ],
  });

  return { listItem, dashboardId: newId };
}

/**
 * Sichert einen ungespeicherten Entwurf vor dem Wiederherstellen als persönliche Kopie
 * (mit der tatsächlichen Entwurfskonfiguration), ohne das aktive Dashboard zu wechseln.
 */
export function savePreviewDraftCopy(
  draftConfig: DashboardConfigV2,
): AccessibleDashboardListItemV2 {
  const { listItem } = createPreviewImportDashboard({
    title: buildDerivedDashboardTitle(draftConfig.title, ' (Entwurf-Kopie)'),
    config: { ...draftConfig, scope: 'personal', teamId: undefined },
    scope: 'personal',
    changeSummary: 'Entwurf vor Wiederherstellung gesichert',
  });
  return listItem;
}
