/**
 * LeadPilot Live-KPI Tenant Scope (Auftrag 153 — Befund F-01)
 *
 * Verwaltet die organisationsgebundene Bindung des Live-KPI-Streams im Browser.
 * Hält die aktuell aktive Mandanten-ID. Bei Wechsel oder Abmeldung (null)
 * wird der registrierte Store synchron zurückgesetzt.
 *
 * Entkoppelt von liveKpiStreamStore via Callback-Registrierung, damit dieser
 * Scope schlank bleibt und keine Store-Dependencies in den Initial-Bundle zieht.
 */

let activeOrganizationId: string | null = null;
let resetStoreCallback: (() => void) | null = null;

export function getLiveKpiOrganization(): string | null {
  return activeOrganizationId;
}

export function registerLiveKpiStoreReset(callback: () => void): () => void {
  resetStoreCallback = callback;
  return () => {
    if (resetStoreCallback === callback) {
      resetStoreCallback = null;
    }
  };
}

export function setLiveKpiOrganization(organizationId: string | null): void {
  const normalized = organizationId && organizationId.trim().length > 0 ? organizationId : null;
  if (normalized === activeOrganizationId) {
    return;
  }
  activeOrganizationId = normalized;
  resetStoreCallback?.();
}

/**
 * Nur für Unit-Tests: setzt den Zustand synchron zurück.
 */
export function resetLiveKpiTenantScopeForTesting(): void {
  activeOrganizationId = null;
}
