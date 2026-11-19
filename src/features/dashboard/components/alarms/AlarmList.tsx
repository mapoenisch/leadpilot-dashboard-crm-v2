// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 3–5):
// Hauptansicht der Alarmliste mit Filterung, Quittierung und Ausfallhinweis.

import React, { useState, useMemo } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useDashboardAlarms } from '../../hooks/useDashboardAlarms';
import { AlarmWorkerBanner } from './AlarmWorkerBanner';
import { AlarmFilterBar } from './AlarmFilterBar';
import { AlarmEventItemRow } from './AlarmEventItemRow';
import { AlarmAcknowledgeDialog } from './AlarmAcknowledgeDialog';
import type { DashboardAlarmEventItem } from '../../services/dashboardAlarmService';

export const AlarmList: React.FC = () => {
  const [selectedDashboardId, setSelectedDashboardId] = useState('');
  const [nurUngelesen, setNurUngelesen] = useState(false);
  const [nurWarnungKritisch, setNurWarnungKritisch] = useState(false);
  const [limit, setLimit] = useState(50);
  const [selectedEventForAck, setSelectedEventForAck] = useState<DashboardAlarmEventItem | null>(
    null,
  );
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const eventFilters = useMemo(
    () => ({
      dashboardId: selectedDashboardId || undefined,
      nurUngelesen,
      nurWarnungKritisch,
      limit,
      offset: 0,
    }),
    [selectedDashboardId, nurUngelesen, nurWarnungKritisch, limit],
  );

  const { events, isEventsLoading, markRead, markAllRead, acknowledge } = useDashboardAlarms({
    loadEvents: true,
    eventFilters,
  });

  // Einzigartige Dashboards aus den Ereignissen für den Filter
  const dashboardOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of events) {
      if (ev.dashboardId && !map.has(ev.dashboardId)) {
        map.set(ev.dashboardId, ev.dashboardTitle || ev.dashboardId);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [events]);

  const handleMarkRead = async (eventId: string) => {
    await markRead([eventId]);
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllRead(selectedDashboardId || undefined);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleConfirmAcknowledge = async (comment: string) => {
    if (!selectedEventForAck) return;
    await acknowledge({ eventId: selectedEventForAck.id, comment });
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
      ) : events.length === 0 ? (
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
          {events.map((ev: DashboardAlarmEventItem) => (
            <AlarmEventItemRow
              key={ev.id}
              event={ev}
              onMarkRead={handleMarkRead}
              onOpenAcknowledge={setSelectedEventForAck}
            />
          ))}

          {/* Weitere laden (Paging) */}
          {events.length >= limit && (
            <div className="pt-3 text-center">
              <button
                type="button"
                data-testid="load-more-alarms-btn"
                onClick={() => setLimit((prev) => prev + 50)}
                className="rounded-md border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-surface-raised transition-colors cursor-pointer"
              >
                Weitere laden
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
