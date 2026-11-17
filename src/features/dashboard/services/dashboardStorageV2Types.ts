// Executive Dashboard V2 (Auftrag 150 / P07):
// Typen und Fehlerklassifizierung für den Supabase V2-Speicheradapter.

import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

export type DashboardV2StorageError =
  | { kind: 'konflikt'; detail?: string }
  | { kind: 'ungueltig'; detail: string }
  | { kind: 'nicht_berechtigt' }
  | { kind: 'nicht_gefunden' }
  | { kind: 'keine_mitgliedschaft' }
  | { kind: 'sitzung_abgelaufen' }
  | { kind: 'letztes_dashboard' }
  | { kind: 'obergrenze_erreicht' }
  | { kind: 'nicht_konfiguriert' }
  | { kind: 'nicht_verfuegbar'; message?: string }
  | { kind: 'team_zugriff_entzogen' }
  | { kind: 'team_nicht_gefunden' }
  | { kind: 'team_hat_dashboards' }
  | { kind: 'team_name_vergeben' }
  | { kind: 'team_grenze' }
  | { kind: 'mitglied_nicht_in_org' }
  | { kind: 'server_funktion_fehlt' }
  | { kind: 'technisch' };

export type StorageResult<T> =
  { ok: true; value: T } | { ok: false; error: DashboardV2StorageError };

export interface StoredDashboardV2Row {
  id: string;
  title: string;
  scope: 'personal' | 'team';
  revision: number;
  config: DashboardConfigV2;
  updatedAt: string;
  teamId?: string | null;
  teamName?: string | null;
  canWrite?: boolean;
}

export interface PersonalDashboardListItemV2 {
  id: string;
  title: string;
  scope: 'personal';
  revision: number;
  tileCount: number;
  sectionCount: number;
  updatedAt: string;
}

export interface DeleteDashboardV2Result {
  deletedId: string;
  nextDashboardId: string | null;
}

export interface DuplicateDashboardV2Result {
  dashboardId: string;
  revision: number;
  createdAt: string;
}

export interface DashboardV2RevisionRow {
  revision: number;
  title: string;
  createdByUserId: string;
  createdAt: string;
  changeSummary: string | null;
}

export interface SavedDashboardV2Result {
  dashboardId: string;
  revision: number;
  updatedAt: string;
}

export interface DashboardTeamV2 {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  dashboardCount: number;
  canWrite: boolean;
  isMember: boolean;
}

export interface DashboardTeamMemberV2 {
  userId: string;
  email: string;
  orgRole: string;
  orgStatus: string;
  teamRole: string;
  createdAt: string;
}

export interface AccessibleDashboardListItemV2 {
  id: string;
  title: string;
  scope: 'personal' | 'team';
  revision: number;
  tileCount: number;
  sectionCount: number;
  updatedAt: string;
  teamId: string | null;
  teamName: string | null;
  canWrite: boolean;
}

export interface LoadedDashboardV2Result {
  id: string;
  title: string;
  scope: 'personal' | 'team';
  teamId: string | null;
  revision: number;
  config: DashboardConfigV2;
  updatedAt: string;
  canWrite: boolean;
}

export interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

const SESSION_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

export function classifyDashboardV2Error(
  error: SupabaseErrorLike | null | undefined,
  status?: number,
): DashboardV2StorageError {
  const message = error?.message ?? '';
  if (message.includes('LP_TEAM_ACCESS_REVOKED')) {
    return { kind: 'team_zugriff_entzogen' };
  }
  if (message.includes('LP_TEAM_NOT_FOUND')) {
    return { kind: 'team_nicht_gefunden' };
  }
  if (message.includes('LP_TEAM_HAS_DASHBOARDS')) {
    return { kind: 'team_hat_dashboards' };
  }
  if (message.includes('LP_TEAM_NAME_TAKEN')) {
    return { kind: 'team_name_vergeben' };
  }
  if (
    message.includes('LP_TEAM_LIMIT') ||
    message.includes('LP_TEAM_MEMBER_LIMIT') ||
    message.includes('LP_TEAM_DASHBOARD_LIMIT')
  ) {
    return { kind: 'team_grenze' };
  }
  if (message.includes('LP_MEMBER_NOT_IN_ORG')) {
    return { kind: 'mitglied_nicht_in_org' };
  }
  if (message.includes('LP_LAST_DASHBOARD')) {
    return { kind: 'letztes_dashboard' };
  }
  if (message.includes('LP_DASHBOARD_LIMIT')) {
    return { kind: 'obergrenze_erreicht' };
  }
  if (message.includes('LP_DASHBOARD_CONFLICT')) {
    return { kind: 'konflikt', detail: error?.details ?? undefined };
  }
  if (message.includes('LP_DASHBOARD_INVALID')) {
    return { kind: 'ungueltig', detail: error?.details ?? message };
  }
  if (message.includes('LP_DASHBOARD_NOT_FOUND') || message.includes('LP_REVISION_NOT_FOUND')) {
    return { kind: 'nicht_gefunden' };
  }
  if (
    message.includes('LP_FORBIDDEN') ||
    message.includes('LP_TEAM_DASHBOARDS_LOCKED') ||
    message.includes('LP_INVALID_SCOPE')
  ) {
    return { kind: 'nicht_berechtigt' };
  }
  if (message.includes('LP_AUTH_REQUIRED') || message.includes('LP_DASHBOARD_NO_MEMBERSHIP')) {
    return { kind: 'keine_mitgliedschaft' };
  }
  if (status === 401 || SESSION_CODES.has(error?.code ?? '') || /jwt expired/i.test(message)) {
    return { kind: 'sitzung_abgelaufen' };
  }
  if (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    message.includes('PGRST202') ||
    message.includes('42883')
  ) {
    return { kind: 'server_funktion_fehlt' };
  }
  return { kind: 'technisch' };
}

/** Liest die im Browser tablokal (oder browserweit als Fallback) gespeicherte aktive V2-Dashboard-ID. */
export function getActiveDashboardV2Id(orgId: string, userId: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const key = `leadpilot:active_dashboard_v2_id:${orgId}:${userId}`;
    // 1. Tab-lokale Auswahl (sessionStorage) hat Vorrang, damit parallele Tabs isoliert bleiben
    const sessionVal = window.sessionStorage?.getItem(key);
    if (sessionVal) return sessionVal;
    // 2. Browserweite Voreinstellung (localStorage) als Fallback für neue Tabs
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Setzt oder entfernt die aktive V2-Dashboard-ID tablokal und browserweit. */
export function setActiveDashboardV2Id(
  orgId: string,
  userId: string,
  dashboardId: string | null,
): void {
  try {
    if (typeof window === 'undefined') return;
    const key = `leadpilot:active_dashboard_v2_id:${orgId}:${userId}`;
    if (dashboardId) {
      window.sessionStorage?.setItem(key, dashboardId);
      window.localStorage?.setItem(key, dashboardId);
    } else {
      window.sessionStorage?.removeItem(key);
      window.localStorage?.removeItem(key);
    }
  } catch {
    // Fehler bei Quota/Sicherheit im Browser tolerieren
  }
}

export type SaveV2Result =
  { ok: true; value: SavedDashboardV2Result } | { ok: false; error: DashboardV2StorageError };

export type DeleteV2Result =
  { ok: true; nextDashboardId: string | null } | { ok: false; error: DashboardV2StorageError };

export interface UseDashboardV2StorageResult {
  status: 'laden' | 'bereit' | 'fehler';
  dashboard: StoredDashboardV2Row | null;
  dashboards: AccessibleDashboardListItemV2[];
  error: DashboardV2StorageError | null;
  listError: DashboardV2StorageError | null;
  isSaving: boolean;
  save: (config: DashboardConfigV2, changeSummary?: string) => Promise<SaveV2Result>;
  reload: (explicitDashboardId?: string) => Promise<void>;
  refreshList: () => Promise<void>;
  openDashboard: (id: string) => Promise<boolean>;
  createFromTemplate: (
    templateId: string,
    title?: string,
    target?: { scope: 'personal' | 'team'; teamId?: string },
  ) => Promise<SaveV2Result>;
  duplicateCurrent: (
    title?: string,
    target?: { scope: 'personal' | 'team'; teamId?: string },
  ) => Promise<SaveV2Result>;
  deleteDashboard: (id: string) => Promise<DeleteV2Result>;
  saveAsNewPersonalCopy: (config: DashboardConfigV2, title?: string) => Promise<SaveV2Result>;
  shareWithTeam?: (teamId: string, title: string) => Promise<SaveV2Result>;
}
