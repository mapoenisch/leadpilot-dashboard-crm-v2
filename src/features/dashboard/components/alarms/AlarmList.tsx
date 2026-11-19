// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 3–5):
// Hauptansicht der Alarmliste mit Filterung, Quittierung und Ausfallhinweis.

import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useDashboardAlarms } from '../../hooks/useDashboardAlarms';
import { AlarmWorkerBanner } from './AlarmWorkerBanner';
import { AlarmFilterBar } from './AlarmFilterBar';
import { AlarmEventItemRow } from './AlarmEventItemRow';
import { AlarmAcknowledgeDialog } from './AlarmAcknowledgeDialog';
import {
  fetchDashboardAlarmEventsV2,
  type DashboardAlarmEventItem,
} from '../../services/dashboardAlarmService';

const PAGE_SIZE = 50;

export const AlarmList: React.FC = () => {
  const [selectedDashboardId, setSelectedDashboardId] = useState('');
  const [nurUngelesen, setNurUngelesen] = useState(false);
  const [nurWarnungKritisch, setNurWarnungKritisch] = useState(false);
  const [appendedEvents, setAppendedEvents] = useState<DashboardAlarmEventItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedEventForAck, setSelectedEventForAck] = useState<DashboardAlarmEventItem | null>(
    null,
  );
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Filteränderungen setzen angehängte Ereignisse und Paging zurück
  useEffect(() => {
    setAppendedEvents([]);
    setHasMore(true);
  }, [selectedDashboardId, nurUngelesen, nurWarnungKritisch]);

  const eventFilters = useMemo(
    () => ({
      dashboardId: selectedDashboardId || undefined,
      nurUngelesen,
      nurWarnungKritisch,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    [selectedDashboardId, nurUngelesen, nurWarnungKritisch],
  );

  const {
    events: initialEvents,
    isEventsLoading,
    markRead,
    markAllRead,
    acknowledge,
  } = useDashboardAlarms({
    loadEvents: true,
    eventFilters,
  });

  const [knownDashboards, setKnownDashboards] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (initialEvents.length > 0 || appendedEvents.length > 0) {
      setKnownDashboards((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const ev of [...initialEvents, ...appendedEvents]) {
          if (ev.dashboardId && !next.has(ev.dashboardId)) {
            next.set(ev.dashboardId, ev.dashboardTitle || ev.dashboardId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [initialEvents, appendedEvents]);

  const dashboardOptions = useMemo(() => {
    return Array.from(knownDashboards.entries()).map(([id, title]) => ({ id, title }));
  }, [knownDashboards]);

  const displayEvents = useMemo(() => {
    const list = [...initialEvents];
    const seen = new Set(list.map((e) => e.id));
    for (const ev of appendedEvents) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        list.push(ev);
      }
    }
    if (nurUngelesen) {
      return list.filter((e) => !e.gelesen);
    }
    return list;
  }, [initialEvents, appendedEvents, nurUngelesen]);

  const handleMarkRead = async (eventId: string) => {
    await markRead([eventId]);
    setAppendedEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, gelesen: true } : e)));
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllRead({
        dashboardId: selectedDashboardId || undefined,
        nurWarnungKritisch,
      });
      setAppendedEvents((prev) =>
        prev.map((e) => {
          if (selectedDashboardId && e.dashboardId !== selectedDashboardId) return e;
          if (nurWarnungKritisch && e.neuerZustand !== 'warnung' && e.neuerZustand !== 'kritisch')
            return e;
          return { ...e, gelesen: true };
        }),
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const nextOffset = displayEvents.length;
      const res = await fetchDashboardAlarmEventsV2({
        dashboardId: selectedDashboardId || undefined,
        nurUngelesen,
        nurWarnungKritisch,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      if (res.ok && res.data) {
        if (res.data.length < PAGE_SIZE) {
          setHasMore(false);
        }
        setAppendedEvents((prev) => [...prev, ...(res.data ?? [])]);
      } else {
        setHasMore(false);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleConfirmAcknowledge = async (comment: string) => {
    if (!selectedEventForAck) return;
    await acknowledge({ eventId: selectedEventForAck.id, comment });
    setAppendedEvents((prev) =>
      prev.map((e) =>
        e.id === selectedEventForAck.id
          ? {
              ...e,
              quittiertVon: [
                ...e.quittiertVon,
                {
                  userId: 'current-user',
                  email: 'du',
                  quittiertAt: new Date().toISOString(),
                  kommentar: comment || null,
                },
              ],
            }
          : e,
      ),
    );
    setSelectedEventForAck(null);
  };

  return (
    <div data-testid="alarm-list-container" className="space-y-4 max-w-5xl mx-auto">
      {/* Ausfallhinweis-Banner (für alle Nutzer in der Alarmliste sichtbar) */}
      <AlarmWorkerBanner showAllUsers={true} />

      {/* Filterleiste */}
      <AlarmFilterBar
        nurUngelesen={nurUngelesen}
        onChangeNurUngelesen={setNurUngelesen}
        nurWarnungKritisch={nurWarnungKritisch}
        onChangeNurWarnungKritisch={setNurWarnungKritisch}
        selectedDashboardId={selectedDashboardId}
        onChangeDashboardId={setSelectedDashboardId}
        dashboardOptions={dashboardOptions}
        onMarkAllRead={handleMarkAllRead}
        isMarkingAllRead={isMarkingAll}
      />

      {/* Ereignisliste */}
      {isEventsLoading ? (
        <div className="flex items-center justify-center py-16 text-text">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-xs">Lade Alarme…</span>
        </div>
      ) : displayEvents.length === 0 ? (
        <div
          data-testid="alarms-empty-state"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-4 text-center text-text"
        >
          <Bell className="h-10 w-10 text-[var(--color-text-muted)] opacity-50 mb-2" />
          <h4 className="m-0 text-sm font-semibold text-white">Keine Alarm-Meldungen</h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm">
            Für die aktuellen Filtereinstellungen liegen keine Alarmereignisse vor.
          </p>
        </div>
      ) : (
        <div data-testid="alarm-events-list" className="space-y-2.5">
          {displayEvents.map((ev: DashboardAlarmEventItem) => (
            <AlarmEventItemRow
              key={ev.id}
              event={ev}
              onMarkRead={handleMarkRead}
              onOpenAcknowledge={setSelectedEventForAck}
            />
          ))}

          {/* Weitere laden (Paging mit Offset-Erhöhung) */}
          {hasMore && displayEvents.length >= PAGE_SIZE && (
            <div className="pt-3 text-center">
              <button
                type="button"
                data-testid="load-more-alarms-btn"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="rounded-md border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-surface-raised transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? 'Lade weitere…' : 'Weitere laden'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aufbewahrungshinweis am Ende (§8) */}
      <div className="pt-4 border-t border-border-soft text-center text-[11px] text-[var(--color-text-muted)]">
        Meldungen älter als 12 Monate werden automatisch entfernt.
      </div>

      {/* Quittier-Dialog */}
      <AlarmAcknowledgeDialog
        isOpen={Boolean(selectedEventForAck)}
        event={selectedEventForAck}
        onConfirm={handleConfirmAcknowledge}
        onCancel={() => setSelectedEventForAck(null)}
      />
    </div>
  );
};
