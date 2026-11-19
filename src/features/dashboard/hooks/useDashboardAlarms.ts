// Executive Dashboard V2 (Auftrag 168 / P13c):
// TanStack Query Hook für Alarmregeln, Alarmereignisse, Quittierung und Admin-Übernahme.

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import {
  fetchDashboardAlarmRules,
  createDashboardAlarmRule,
  updateDashboardAlarmRule,
  pauseDashboardAlarmRule,
  resumeDashboardAlarmRule,
  deleteDashboardAlarmRule,
  takeoverDashboardAlarmRule,
  fetchDashboardAlarmEventsV2,
  markAlarmEventsRead,
  markAllAlarmEventsRead,
  acknowledgeAlarmEvent,
  fetchAlarmWorkerStatus,
  fetchOrganizationAlarmRules,
  fetchDashboardRetentionInfo,
  type CreateAlarmRuleParams,
  type UpdateAlarmRuleParams,
  type ListAlarmEventsParams,
  type MarkAllAlarmEventsReadOptions,
} from '../services/dashboardAlarmService';
import { unreadAlarmCountKey } from './useUnreadAlarmCount';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

export function useSafeQueryClient(): QueryClient {
  try {
    return useQueryClient();
  } catch {
    return fallbackQueryClient;
  }
}

export const DASHBOARD_ALARMS_KEY = ['dashboard', 'alarms'] as const;

export function dashboardAlarmRulesKey(
  orgId?: string | null,
  userId?: string | null,
  dashboardId?: string | null,
) {
  return [...DASHBOARD_ALARMS_KEY, 'rules', orgId ?? 'no-org', userId ?? 'no-user', dashboardId ?? 'all'] as const;
}

export function dashboardAlarmEventsKey(
  orgId?: string | null,
  userId?: string | null,
  filters?: ListAlarmEventsParams,
) {
  return [
    ...DASHBOARD_ALARMS_KEY,
    'events',
    orgId ?? 'no-org',
    userId ?? 'no-user',
    JSON.stringify(filters ?? {}),
  ] as const;
}

export function organizationAlarmRulesKey(orgId?: string | null) {
  return [...DASHBOARD_ALARMS_KEY, 'org-rules', orgId ?? 'no-org'] as const;
}

export function alarmWorkerStatusKey() {
  return [...DASHBOARD_ALARMS_KEY, 'worker-status'] as const;
}

export function useDashboardAlarms(options: {
  dashboardId?: string;
  eventFilters?: ListAlarmEventsParams;
  loadEvents?: boolean;
  loadOrgRules?: boolean;
} = {}) {
  const { dashboardId, eventFilters, loadEvents = false, loadOrgRules = false } = options;
  const { session } = useOrganization();
  const queryClient = useSafeQueryClient();

  const orgId = session?.organizationId ?? null;
  const userId = session?.userId ?? null;
  const isAdmin = session?.role === 'admin';

  const isPreview = typeof window !== 'undefined' && window.location.pathname.includes('vorschau');

  // 1. Alarmregeln des Dashboards
  const rulesQuery = useQuery({
    queryKey: dashboardAlarmRulesKey(orgId, userId, dashboardId),
    queryFn: async () => {
      if (!dashboardId) return [];
      const res = await fetchDashboardAlarmRules(dashboardId);
      if (!res.ok) throw new Error(res.error || 'Fehler beim Laden der Alarmregeln');
      return res.data ?? [];
    },
    enabled: Boolean(dashboardId && (session || isPreview)),
    staleTime: 30_000,
  }, queryClient);

  // 2. Alarmereignisse
  const eventsQuery = useQuery({
    queryKey: dashboardAlarmEventsKey(orgId, userId, eventFilters),
    queryFn: async () => {
      const res = await fetchDashboardAlarmEventsV2(eventFilters);
      if (!res.ok) throw new Error(res.error || 'Fehler beim Laden der Alarmereignisse');
      return res.data ?? [];
    },
    enabled: Boolean(loadEvents && (session || isPreview)),
    staleTime: 15_000,
  }, queryClient);

  // 3. Organisationsweite Regeln (nur für Admin oder Vorschau)
  const orgRulesQuery = useQuery({
    queryKey: organizationAlarmRulesKey(orgId),
    queryFn: async () => {
      const res = await fetchOrganizationAlarmRules();
      if (!res.ok) throw new Error(res.error || 'Fehler beim Laden der Organisationsregeln');
      return res.data ?? [];
    },
    enabled: Boolean(loadOrgRules && (isAdmin || isPreview)),
    staleTime: 30_000,
  }, queryClient);

  // 4. Worker Status
  const workerStatusQuery = useQuery({
    queryKey: alarmWorkerStatusKey(),
    queryFn: () => fetchAlarmWorkerStatus(),
    enabled: Boolean(session || isPreview),
    refetchInterval: 60_000,
    staleTime: 30_000,
  }, queryClient);

  // 5. Revisions-Aufbewahrungs-Info für das Dashboard
  const retentionInfoQuery = useQuery({
    queryKey: [...DASHBOARD_ALARMS_KEY, 'retention-info', dashboardId ?? 'none'],
    queryFn: () => fetchDashboardRetentionInfo(dashboardId!),
    enabled: Boolean(dashboardId && (session || isPreview)),
    staleTime: 60_000,
  }, queryClient);

  // Helper zum Invalidieren
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: DASHBOARD_ALARMS_KEY });
    queryClient.invalidateQueries({ queryKey: unreadAlarmCountKey(orgId, userId) });
  };

  // Mutationen
  const createRuleMutation = useMutation({
    mutationFn: (params: CreateAlarmRuleParams) => createDashboardAlarmRule(params),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const updateRuleMutation = useMutation({
    mutationFn: (params: UpdateAlarmRuleParams) => updateDashboardAlarmRule(params),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const pauseRuleMutation = useMutation({
    mutationFn: (ruleId: string) => pauseDashboardAlarmRule(ruleId),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const resumeRuleMutation = useMutation({
    mutationFn: (ruleId: string) => resumeDashboardAlarmRule(ruleId),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteDashboardAlarmRule(ruleId),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const takeoverRuleMutation = useMutation({
    mutationFn: (ruleId: string) => takeoverDashboardAlarmRule(ruleId),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const markReadMutation = useMutation({
    mutationFn: (eventIds: string[]) => markAlarmEventsRead(eventIds),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const markAllReadMutation = useMutation({
    mutationFn: (opts?: MarkAllAlarmEventsReadOptions | string) => markAllAlarmEventsRead(opts),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  const acknowledgeMutation = useMutation({
    mutationFn: ({ eventId, comment }: { eventId: string; comment?: string | null }) =>
      acknowledgeAlarmEvent({ eventId, comment }),
    onSuccess: () => invalidateAll(),
  }, queryClient);

  return {
    rules: rulesQuery.data ?? [],
    isRulesLoading: rulesQuery.isLoading,
    events: eventsQuery.data ?? [],
    isEventsLoading: eventsQuery.isLoading,
    orgRules: orgRulesQuery.data ?? [],
    isOrgRulesLoading: orgRulesQuery.isLoading,
    workerStatus: workerStatusQuery.data,
    retentionInfo: retentionInfoQuery.data,
    createRule: createRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    pauseRule: pauseRuleMutation.mutateAsync,
    resumeRule: resumeRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutateAsync,
    takeoverRule: takeoverRuleMutation.mutateAsync,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    acknowledge: acknowledgeMutation.mutateAsync,
    refetchEvents: eventsQuery.refetch,
    refetchRules: rulesQuery.refetch,
    refetchOrgRules: orgRulesQuery.refetch,
  };
}
