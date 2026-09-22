// Gate G36 (Auftrag 051): zentrale Query-Key-Factory — keine verstreuten
// String-Literale. Ebenen: ['crm'] > Ressource. syncStatus ist Metadaten-
// State für den Optimistic-Update-Musterfall (Block E), kein Server-Read.
export const crmKeys = {
  all: ['crm'] as const,
  companies: () => [...crmKeys.all, 'companies'] as const,
  contacts: () => [...crmKeys.all, 'contacts'] as const,
  deals: () => [...crmKeys.all, 'deals'] as const,
  auditSummary: () => [...crmKeys.all, 'auditSummary'] as const,
  pipelineOverview: () => [...crmKeys.all, 'pipelineOverview'] as const,
  syncStatus: () => [...crmKeys.all, 'syncStatus'] as const,
  list: (resource: string, params?: unknown) => [...crmKeys.all, 'list', resource, params] as const,
};
