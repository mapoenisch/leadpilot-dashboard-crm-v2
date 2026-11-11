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
  | { kind: 'nicht_konfiguriert' }
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
