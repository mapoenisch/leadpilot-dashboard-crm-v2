// Executive Dashboard V2 (Auftrag 168 / P13c §2.3 Nr. 17):
// Nachgeladene (lazy) Alarm-Seite unter /dashboard/alarme.

import { Bell, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/auth/organizationContext';
import { AlarmList } from '../components/alarms/AlarmList';

export function DashboardAlarmsPage() {
  const { session } = useOrganization();
  const isAdmin = session?.role === 'admin';

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
        {isAdmin && (
          <Link
            to="/admin/alarme"
            data-testid="link-admin-alarms"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface transition-colors"
          >
            <ShieldAlert className="h-4 w-4" />
            Verwaiste Regeln (Admin)
          </Link>
        )}
      </div>

      <AlarmList />
    </div>
  );
}

export default DashboardAlarmsPage;
