// Auftrag 163 (P11b): Ausgelagerte Mutation-Operationen für Dashboards.
// Stellt sicher, dass alle Dateien unter 400 Zeilen bleiben.

import type {
  AccessibleDashboardListItemV2,
  DeleteV2Result,
  SaveV2Result,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { createDashboardV2, setActiveDashboardV2Id } from '../services/dashboardStorageV2';
import { copyDashboardV2, deleteTeamDashboardV2 } from '../services/dashboardSharingV2';
import {
  deletePersonalDashboardV2,
  duplicatePersonalDashboardV2,
} from '../services/dashboardSelectionV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { normalizeDashboardLayouts } from '../services/dashboardLayoutIntegrity';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';
import { getDashboardTemplateV2ById } from '../model/dashboardTemplatesV2';
import { loadAndActivateAnyDashboardV2 } from './dashboardV2Access';

export async function executeCreateFromTemplate(
  templateId: string,
  title: string | undefined,
  target: { scope: 'personal' | 'team'; teamId?: string } | undefined,
  orgId: string,
  userId: string,
  setDashboard: (d: StoredDashboardV2Row) => void,
  refreshList: () => Promise<void>,
): Promise<SaveV2Result> {
  const template = getDashboardTemplateV2ById(templateId);
  if (!template) {
    return {
      ok: false,
      error: { kind: 'ungueltig', detail: 'Unbekannte Vorlage' },
    };
  }

  const targetTitle = title?.trim() || template.name;
  const scope = target?.scope ?? 'personal';
  const teamId = scope === 'team' ? target?.teamId : undefined;

  const initialConfig = template.build({
    id: 'dash_v2_' + Math.random().toString(36).slice(2, 10),
    title: targetTitle,
    ownerUserId: userId,
    organizationId: orgId,
    scope,
  });
  if (scope === 'team' && teamId) {
    initialConfig.teamId = teamId;
  }

  const res = await createDashboardV2({
    title: targetTitle,
    config: initialConfig,
    scope,
    teamId,
  });

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  const activateRes = await loadAndActivateAnyDashboardV2(
    res.value.dashboardId,
    orgId,
    userId,
    setDashboard,
  );
  await refreshList();
  if (!activateRes.ok) {
    return activateRes;
  }
  return { ok: true, value: res.value };
}

export async function executeDuplicateCurrent(
  dashboard: StoredDashboardV2Row | null,
  title: string | undefined,
  target: { scope: 'personal' | 'team'; teamId?: string } | undefined,
  orgId: string,
  userId: string,
  setDashboard: (d: StoredDashboardV2Row) => void,
  refreshList: () => Promise<void>,
): Promise<SaveV2Result> {
  if (!dashboard) {
    return { ok: false, error: { kind: 'nicht_gefunden' } };
  }

  const targetTitle = title?.trim() || buildDerivedDashboardTitle(dashboard.title, ' (Kopie)');
  const targetScope =
    target?.scope ?? (dashboard.canWrite === false ? 'personal' : dashboard.scope);
  const targetTeamId = targetScope === 'team' ? (target?.teamId ?? dashboard.teamId) : null;

  let newDashboardId: string;
  let newRevision: number;
  let newUpdatedAt: string;

  if (targetScope === 'team' || dashboard.scope === 'team') {
    const copyRes = await copyDashboardV2({
      sourceId: dashboard.id,
      targetScope,
      targetTeamId,
      title: targetTitle,
    });
    if (!copyRes.ok) {
      return { ok: false, error: copyRes.error };
    }
    newDashboardId = copyRes.value.dashboardId;
    newRevision = copyRes.value.revision;
    newUpdatedAt = copyRes.value.createdAt;
  } else {
    const res = await duplicatePersonalDashboardV2({
      dashboardId: dashboard.id,
      title: targetTitle,
    });
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    newDashboardId = res.value.dashboardId;
    newRevision = res.value.revision;
    newUpdatedAt = res.value.createdAt;
  }

  const activateRes = await loadAndActivateAnyDashboardV2(
    newDashboardId,
    orgId,
    userId,
    setDashboard,
  );
  await refreshList();
  if (!activateRes.ok) {
    return activateRes;
  }
  return {
    ok: true,
    value: {
      dashboardId: newDashboardId,
      revision: newRevision,
      updatedAt: newUpdatedAt,
    },
  };
}

export async function executeShareWithTeam(
  dashboard: StoredDashboardV2Row | null,
  teamId: string,
  title: string,
  refreshList: () => Promise<void>,
): Promise<SaveV2Result> {
  if (!dashboard) {
    return { ok: false, error: { kind: 'nicht_gefunden' } };
  }
  const res = await copyDashboardV2({
    sourceId: dashboard.id,
    targetScope: 'team',
    targetTeamId: teamId,
    title: title.trim() || dashboard.title,
  });
  if (!res.ok) {
    return { ok: false, error: res.error };
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
}

export async function executeDeleteDashboard(
  id: string,
  dashboard: StoredDashboardV2Row | null,
  dashboards: AccessibleDashboardListItemV2[],
  orgId: string,
  userId: string,
  setDashboard: (d: StoredDashboardV2Row) => void,
  refreshList: () => Promise<void>,
): Promise<DeleteV2Result> {
  const isCurrent = dashboard?.id === id;
  const targetItem = dashboards.find((d) => d.id === id);
  const isTeam = targetItem?.scope === 'team' || (isCurrent && dashboard?.scope === 'team');
  const expectedRevision = isCurrent ? dashboard.revision : targetItem?.revision;

  let nextDashboardId: string | null = null;
  if (isTeam) {
    if (expectedRevision === undefined) {
      return { ok: false, error: { kind: 'technisch' } };
    }
    const teamRes = await deleteTeamDashboardV2(id, expectedRevision);
    if (!teamRes.ok) {
      return { ok: false, error: teamRes.error };
    }
    if (isCurrent) {
      const remaining = dashboards.filter((d) => d.id !== id);
      const personalFallback = remaining.find((d) => d.scope === 'personal') ?? remaining[0];
      nextDashboardId = personalFallback?.id ?? null;
    }
  } else {
    const personalRes = await deletePersonalDashboardV2({
      dashboardId: id,
      expectedRevision,
    });
    if (!personalRes.ok) {
      return { ok: false, error: personalRes.error };
    }
    nextDashboardId = personalRes.value.nextDashboardId;
  }

  if (isCurrent && nextDashboardId) {
    const activateRes = await loadAndActivateAnyDashboardV2(
      nextDashboardId,
      orgId,
      userId,
      setDashboard,
    );
    await refreshList();
    if (!activateRes.ok) {
      return { ok: false, error: activateRes.error };
    }
  } else {
    await refreshList();
  }

  return { ok: true, nextDashboardId };
}

export async function executeSaveAsNewPersonalCopy(
  config: DashboardConfigV2,
  title: string | undefined,
  orgId: string,
  userId: string,
  setDashboard: (d: StoredDashboardV2Row) => void,
  refreshList: () => Promise<void>,
): Promise<SaveV2Result> {
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

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  const newRow: StoredDashboardV2Row = {
    id: res.value.dashboardId,
    title: copyTitle,
    scope: 'personal',
    teamId: null,
    teamName: null,
    canWrite: true,
    revision: res.value.revision,
    config: { ...newConfig, id: res.value.dashboardId },
    updatedAt: res.value.updatedAt,
  };
  setActiveDashboardV2Id(orgId, userId, res.value.dashboardId);
  setDashboard(newRow);
  await refreshList();
  return { ok: true, value: res.value };
}
