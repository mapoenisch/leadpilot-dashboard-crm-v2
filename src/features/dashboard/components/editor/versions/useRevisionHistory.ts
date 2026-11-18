// Executive Dashboard V2 (Auftrag 165 / P12):
// Hook für Versionshistorie, Paging, Detail-Caching und Rückfall-Verhalten.

import { useCallback, useEffect, useState } from 'react';
import type { DashboardConfigV2 } from '../../../model/dashboardConfigV2';
import {
  getDashboardV2RevisionDetail,
  getDashboardV2Revisions,
  listDashboardV2RevisionsPage,
} from '../../../services/dashboardRevisionServiceV2';
import type {
  DashboardV2RevisionPageItem,
  DashboardV2RevisionRow,
  DashboardV2StorageError,
} from '../../../services/dashboardStorageV2Types';

export interface UseRevisionHistoryParams {
  dashboardId: string;
  currentRevision: number;
  currentUserId?: string;
  isOpen: boolean;
  pageSize?: number;
}

export function formatRevisionAuthor(item: {
  createdByIsSelf?: boolean;
  createdByName?: string | null;
  createdByActive?: boolean;
}): string {
  if (item.createdByName === null) {
    return 'Gelöschtes Konto';
  }
  const name = item.createdByName ?? (item.createdByIsSelf ? 'Du' : 'Anderes Mitglied');
  const former = item.createdByActive === false ? ' (ehemalig)' : '';
  if (item.createdByIsSelf) {
    return `Du (${name})${former}`;
  }
  return `${name}${former}`;
}

export function formatRevisionDate(isoDate: string): { relative: string; absolute: string } {
  try {
    const date = new Date(isoDate);
    const now = Date.now();
    const diffSec = Math.floor((now - date.getTime()) / 1000);

    let relative: string;
    if (diffSec < 60) {
      relative = 'gerade eben';
    } else if (diffSec < 3600) {
      const min = Math.floor(diffSec / 60);
      relative = `vor ${min} ${min === 1 ? 'Minute' : 'Minuten'}`;
    } else if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      relative = `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    } else {
      const days = Math.floor(diffSec / 86400);
      relative = `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    }

    const formatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const absolute = formatter.format(date) + ' Uhr';

    return { relative, absolute };
  } catch {
    return { relative: '', absolute: isoDate };
  }
}

export function useRevisionHistory({
  dashboardId,
  currentRevision,
  currentUserId,
  isOpen,
  pageSize = 50,
}: UseRevisionHistoryParams) {
  const [revisions, setRevisions] = useState<DashboardV2RevisionPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<DashboardV2StorageError | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [detailsCache, setDetailsCache] = useState<Map<number, DashboardConfigV2>>(new Map());

  const loadInitial = useCallback(async () => {
    if (!dashboardId || !isOpen) return;
    setIsLoading(true);
    setError(null);

    // Versuch 1: Neue page-basierte RPC
    const pageRes = await listDashboardV2RevisionsPage({
      dashboardId,
      limit: pageSize,
    });

    if (pageRes.ok) {
      setRevisions(pageRes.value);
      setHasMore(pageRes.value.length === pageSize);
      setIsFallbackMode(false);
      setIsLoading(false);
      return;
    }

    // Rückfall ohne Hosted-Migration (§2.4 Nr. 24)
    if (pageRes.error.kind === 'server_funktion_fehlt') {
      setIsFallbackMode(true);
      const fallbackRes = await getDashboardV2Revisions(dashboardId);
      if (fallbackRes.ok) {
        const mapped: DashboardV2RevisionPageItem[] = fallbackRes.value.map(
          (r: DashboardV2RevisionRow) => ({
            revision: r.revision,
            title: r.title,
            createdByUserId: r.createdByUserId,
            createdByIsSelf: r.createdByUserId === currentUserId,
            createdByName: r.createdByUserId === currentUserId ? 'Du' : 'Anderes Mitglied',
            createdByActive: true,
            createdAt: r.createdAt,
            changeSummary: r.changeSummary,
          }),
        );
        setRevisions(mapped);
        setHasMore(false);
      } else {
        setError(fallbackRes.error);
      }
    } else {
      setError(pageRes.error);
    }
    setIsLoading(false);
  }, [dashboardId, isOpen, pageSize, currentUserId]);

  useEffect(() => {
    if (isOpen) {
      void loadInitial();
    }
  }, [isOpen, loadInitial, currentRevision]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || revisions.length === 0 || isFallbackMode) return;
    setIsLoadingMore(true);

    const oldestRev = revisions[revisions.length - 1]?.revision;
    if (oldestRev == null) {
      setIsLoadingMore(false);
      return;
    }

    const nextRes = await listDashboardV2RevisionsPage({
      dashboardId,
      beforeRevision: oldestRev,
      limit: pageSize,
    });

    if (nextRes.ok) {
      setRevisions((prev) => [...prev, ...nextRes.value]);
      setHasMore(nextRes.value.length === pageSize);
    } else {
      setError(nextRes.error);
    }
    setIsLoadingMore(false);
  }, [dashboardId, hasMore, isLoadingMore, isFallbackMode, pageSize, revisions]);

  const fetchRevisionConfig = useCallback(
    async (rev: number): Promise<DashboardConfigV2 | null> => {
      if (detailsCache.has(rev)) {
        return detailsCache.get(rev)!;
      }
      const res = await getDashboardV2RevisionDetail({
        dashboardId,
        revision: rev,
      });
      if (res.ok) {
        setDetailsCache((prev) => new Map(prev).set(rev, res.value.config));
        return res.value.config;
      }
      return null;
    },
    [dashboardId, detailsCache],
  );

  return {
    revisions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isFallbackMode,
    loadMore,
    reload: loadInitial,
    fetchRevisionConfig,
  };
}
