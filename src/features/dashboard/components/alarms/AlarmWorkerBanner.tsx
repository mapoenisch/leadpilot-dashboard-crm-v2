// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 9):
// Ausfall- und Pausierungs-Banner für den Alarm-Worker.
// Sichtbar für Admins im Kopfbereich und in der Alarmliste; für alle anderen Nutzer in der Alarmliste.

import React from 'react';
import { AlertTriangle, PauseCircle } from 'lucide-react';
import { useDashboardAlarms } from '../../hooks/useDashboardAlarms';
import { useOrganization } from '@/auth/organizationContext';

export interface AlarmWorkerBannerProps {
  showAllUsers?: boolean;
  isAdmin?: boolean;
  className?: string;
}

export const AlarmWorkerBanner: React.FC<AlarmWorkerBannerProps> = ({
  showAllUsers = false,
  isAdmin: isAdminProp,
  className = '',
}) => {
  const { session } = useOrganization();
  const isAdmin = isAdminProp ?? session?.role === 'admin';

  const { workerStatus } = useDashboardAlarms();

  if (!workerStatus) return null;
  if (!isAdmin && !showAllUsers) return null;

  if (workerStatus.ueberfaellig) {
    const mins = workerStatus.minutenSeitLetztemLauf ?? 15;
    return (
      <div
        role="alert"
        data-testid="alarm-worker-banner"
        data-banner-type="ueberfaellig"
        className={`flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 max-w-full ${className}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <span className="break-words min-w-0">
          Die Alarmprüfung ist seit {mins} Minuten nicht gelaufen. Alarme werden gerade nicht
          ausgewertet.
        </span>
      </div>
    );
  }

  if (!workerStatus.auswertungAktiv) {
    return (
      <div
        role="alert"
        data-testid="alarm-worker-banner"
        data-banner-type="pausiert"
        className={`flex items-center gap-2 rounded-md border border-neutral-500/30 bg-neutral-800/80 px-3 py-2 text-xs font-medium text-[var(--color-text-soft)] max-w-full ${className}`}
      >
        <PauseCircle className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
        <span className="break-words min-w-0">Die Alarmprüfung ist pausiert.</span>
      </div>
    );
  }

  return null;
};
