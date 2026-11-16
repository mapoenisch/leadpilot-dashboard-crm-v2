// Executive Dashboard, Teilauftrag 2 (Auftrag 071): Query-Schlüssel mit Organisationsbezug.
// Trennt CRM-Cache strikt nach Organisation und teilt Abfragen desselben Pipeline-Filters.

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  crm: (organizationId: string) => [...dashboardQueryKeys.all, organizationId, 'crm'] as const,
  pipelineOverview: (organizationId: string, pipeline?: string | null) =>
    [...dashboardQueryKeys.crm(organizationId), 'pipelineOverview', pipeline ?? null] as const,
  crmOverview: (organizationId: string, userId: string, pipeline?: string | null) =>
    [...dashboardQueryKeys.crm(organizationId), 'crmOverview', userId, pipeline ?? null] as const,
  timeSeries: (
    organizationId: string,
    userId: string,
    source: string,
    metric: string,
    resolution: string,
    from: string,
    to: string,
    pipeline?: string | null,
  ) =>
    [
      ...dashboardQueryKeys.crm(organizationId),
      'timeSeries',
      userId,
      source,
      metric,
      resolution,
      from,
      to,
      pipeline ?? null,
    ] as const,
};
