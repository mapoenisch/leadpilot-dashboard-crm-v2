/**
 * LeadPilot Live-KPI Tenant Scope (Auftrag 153 — Befund F-01)
 *
 * Verwaltet die organisationsgebundene Bindung des Live-KPI-Streams im Browser.
 * Hält die aktuell aktive Mandanten-ID. Bei Wechsel oder Abmeldung (null)
 * wird der liveKpiStreamStore synchron zurückgesetzt, sodass keine Daten der
 * vorherigen Organisation sichtbar bleiben.
 */

import { liveKpiStreamStore } from './liveKpiStreamStore';

let activeOrganizationId: string | null = null;

export function getLiveKpiOrganization(): string | null {
  return activeOrganizationId;
}

export function setLiveKpiOrganization(organizationId: string | null): void {
  const normalized = organizationId && organizationId.trim().length > 0 ? organizationId : null;
  if (normalized === activeOrganizationId) {
    return;
  }
  activeOrganizationId = normalized;
  liveKpiStreamStore.reset();
}

/**
 * Nur für Unit-Tests: setzt den Zustand synchron zurück.
 */
export function resetLiveKpiTenantScopeForTesting(): void {
  activeOrganizationId = null;
}
