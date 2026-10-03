// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Query-Schlüssel mit Organisationsbezug.
// Trennt CRM-Cache strikt nach Organisation und teilt Abfragen desselben Pipeline-Filters.

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  crm: (organizationId: string) => [...dashboardQueryKeys.all, organizationId, 'crm'] as const,
  pipelineOverview: (organizationId: string, pipeline?: string | null) =>
    [...dashboardQueryKeys.crm(organizationId), 'pipelineOverview', pipeline ?? null] as const,
};
