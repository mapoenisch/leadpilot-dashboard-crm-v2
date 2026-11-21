// Auftrag 171 (P15a §2.1 Nr. 4/5): Vollbildhinweise des Kiosks.
// Sitzung abgelaufen: keine Kacheln, keine Abrufe, nur Hinweis mit letztem gültigem Datenstand.
import { AlertTriangle, Lock } from 'lucide-react';
import { formatKioskTime } from '../../model/kioskParams';

export interface KioskExpiredNoticeProps {
  lastValidDataAt: string | null;
  expiredAt: string | null;
  onRelogin: () => void;
}

export function KioskExpiredNotice({
  lastValidDataAt,
  expiredAt,
  onRelogin,
}: KioskExpiredNoticeProps) {
  const stand = formatKioskTime(lastValidDataAt);
  const at = formatKioskTime(expiredAt);
  return (
    <div
      data-testid="kiosk-session-expired"
      role="alert"
      className="kiosk-root flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[var(--color-bg)] p-8 text-center text-[var(--color-text)]"
    >
      <h1 className="m-0 text-[var(--kiosk-text-title)] font-semibold">
        Sitzung abgelaufen – bitte neu anmelden
      </h1>
      <p className="m-0 max-w-xl text-[var(--kiosk-text-small)] text-[var(--color-text-muted)]">
        Aus Sicherheitsgründen werden keine Daten mehr abgerufen oder angezeigt.
        {at ? ` Abgelaufen um ${at} Uhr.` : ''}
      </p>
      <p
        data-testid="kiosk-last-valid-data"
        className="m-0 text-[var(--kiosk-text-small)] text-[var(--color-text-muted)]"
      >
        Letzter gültiger Datenstand: {stand ? `${stand} Uhr` : 'unbekannt'}
      </p>
      <button
        type="button"
        data-testid="kiosk-relogin"
        onClick={onRelogin}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-[var(--kiosk-text-small)] font-semibold text-[var(--color-text-inverse)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]"
      >
        <Lock size={18} aria-hidden="true" />
        Neu anmelden
      </button>
    </div>
  );
}

export function KioskOfflineBanner({ message }: { message: string }) {
  return (
    <div
      data-testid="kiosk-offline-banner"
      role="alert"
      className="flex items-center gap-2 border-b border-[var(--color-warning)] bg-[var(--color-warning-soft)] px-4 py-2 text-[var(--kiosk-text-small)] font-semibold text-[var(--color-text)]"
    >
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function KioskSkippedNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <p
      data-testid="kiosk-skipped-notice"
      role="status"
      className="m-0 border-b border-[var(--color-border)] px-4 py-1.5 text-[var(--kiosk-text-small)] text-[var(--color-text-muted)]"
    >
      {count === 1
        ? '1 Dashboard wird übersprungen (nicht vorhanden oder keine Leseberechtigung).'
        : `${count} Dashboards werden übersprungen (nicht vorhanden oder keine Leseberechtigung).`}
    </p>
  );
}
