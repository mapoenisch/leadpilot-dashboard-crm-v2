// Executive Dashboard V2 (Auftrag 168 / P13c):
// Hook für ungelesene Alarme im Kopfbereich mit 60-Sekunden-Polling nur bei sichtbarem Tab.

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { fetchUnreadAlarmCount } from '../services/dashboardAlarmService';
import { formatUnreadAlarmCount, shouldPollAlarmCount } from '../model/dashboardAlarmPermitted';
import { useSafeQueryClient } from './useDashboardAlarms';

export const UNREAD_ALARM_COUNT_KEY = ['dashboard', 'alarms', 'unread-count'] as const;

export function unreadAlarmCountKey(organizationId?: string | null, userId?: string | null) {
  return [...UNREAD_ALARM_COUNT_KEY, organizationId ?? 'no-org', userId ?? 'no-user'] as const;
}

export function useUnreadAlarmCount() {
  const { session } = useOrganization();
  const queryClient = useSafeQueryClient();
  const [isTabVisible, setIsTabVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
  );

  const isAuthenticated = Boolean(session && session.userId);
  const orgId = session?.organizationId ?? null;
  const userId = session?.userId ?? null;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (visible && isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: unreadAlarmCountKey(orgId, userId) });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, orgId, userId, isAuthenticated]);

  const isPreview = typeof window !== 'undefined' && window.location.pathname.includes('vorschau');
  const isAuthOrPreview = isAuthenticated || isPreview;
  const pollEnabled = shouldPollAlarmCount({ isTabVisible, isAuthenticated: isAuthOrPreview });

  const query = useQuery({
    queryKey: unreadAlarmCountKey(orgId, userId),
    queryFn: () => fetchUnreadAlarmCount(),
    enabled: isAuthOrPreview,
    refetchInterval: pollEnabled ? 60_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  }, queryClient);

  const count = query.data ?? 0;
  const format = useMemo(() => formatUnreadAlarmCount(count), [count]);

  return {
    count,
    display: format.display,
    ariaLabel: format.ariaLabel,
    hasUnread: format.hasUnread,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
