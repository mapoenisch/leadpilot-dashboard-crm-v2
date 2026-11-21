// Auftrag 171 (P15a §2.1 Nr. 7): Alarmglocke im Kiosk — Zähler sichtbar, aber kein Quittier-Dialog
// und keine Navigation zur Alarmliste (anders als die Glocke im Kopf der App, Auftrag 168).
import { Bell } from 'lucide-react';
import { useUnreadAlarmCount } from '../../hooks/useUnreadAlarmCount';

export function KioskAlarmIndicator() {
  const { display, ariaLabel, hasUnread } = useUnreadAlarmCount();
  return (
    <span
      data-testid="kiosk-alarm-indicator"
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      className="relative inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-primary)]"
    >
      <Bell size={18} aria-hidden="true" />
      {hasUnread && (
        <span
          data-testid="kiosk-alarm-count"
          className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-error)] px-1 text-[10px] font-bold leading-none text-white"
        >
          {display}
        </span>
      )}
    </span>
  );
}
