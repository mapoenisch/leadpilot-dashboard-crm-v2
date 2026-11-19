// Executive Dashboard V2 (Auftrag 168 / P13c §2.3 Nr. 17):
// Nachgeladene (lazy) Alarm-Seite unter /dashboard/alarme.

import { Bell } from 'lucide-react';
import { AlarmList } from '../components/alarms/AlarmList';

export function DashboardAlarmsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Dashboard-Alarme
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Übersicht aller serverseitigen Schwellenwert-Warnungen und kritischen Alarmmeldungen.
          </p>
        </div>
      </div>

      <AlarmList />
    </div>
  );
}

export default DashboardAlarmsPage;
