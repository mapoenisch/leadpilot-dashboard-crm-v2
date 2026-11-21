// Auftrag 171 (P15a §2.2 Nr. 10): Einstieg „Im Kiosk anzeigen“ aus der Dashboard-Ansicht,
// auch für Viewer. Auswahl der Rotations-Dashboards aus der Liste, die der Nutzer ohnehin lesen
// darf; die Kiosk-Seite prüft die Rechte beim Öffnen erneut (RLS).
import { useId, useState } from 'react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  AccessibleDashboardListItemV2,
  PersonalDashboardListItemV2,
} from '../../services/dashboardStorageV2Types';
import {
  buildKioskUrl,
  clampKioskInterval,
  KIOSK_INTERVAL_DEFAULT_S,
  KIOSK_INTERVAL_MAX_S,
  KIOSK_INTERVAL_MIN_S,
} from '../../model/kioskParams';

export interface KioskLaunchButtonProps {
  currentDashboardId: string;
  dashboards: readonly (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[];
  /** Gesperrt mit Begründung (z. B. ungespeicherte Änderungen), sonst null. */
  disabledReason?: string | null;
}

/** Navigation ohne Router-Abhängigkeit (gleiches Muster wie die Alarmglocke, Auftrag 168). */
function openKiosk(url: string) {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function KioskLaunchButton({
  currentDashboardId,
  dashboards,
  disabledReason = null,
}: KioskLaunchButtonProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([currentDashboardId]);
  const [interval, setIntervalText] = useState(String(KIOSK_INTERVAL_DEFAULT_S));
  const intervalId = useId();
  const intervalValue = Number(interval);
  const intervalValid =
    Number.isInteger(intervalValue) &&
    intervalValue >= KIOSK_INTERVAL_MIN_S &&
    intervalValue <= KIOSK_INTERVAL_MAX_S;
  const ordered = dashboards.filter((d) => selected.includes(d.id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      <button
        type="button"
        data-testid="kiosk-launch-button"
        disabled={disabledReason !== null}
        onClick={() => {
          setSelected([currentDashboardId]);
          setOpen(true);
        }}
        className="flex h-8 items-center gap-1.5 rounded border border-[var(--color-border,#1b3d39)] bg-black/20 px-2.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title={disabledReason ?? 'Dashboard im Kiosk-Modus (Vollbild, Rotation) anzeigen'}
      >
        <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Im Kiosk anzeigen</span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Im Kiosk anzeigen"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Abbrechen
            </Button>
            <Button
              data-testid="kiosk-launch-submit"
              disabled={ordered.length === 0 || !intervalValid}
              onClick={() => {
                setOpen(false);
                openKiosk(
                  buildKioskUrl({
                    ids: ordered.map((d) => d.id),
                    intervalSec: clampKioskInterval(intervalValue),
                  }),
                );
              }}
              className="w-full sm:w-auto"
            >
              Kiosk starten
            </Button>
          </div>
        }
      >
        <div
          data-testid="kiosk-launch-dialog"
          className="flex flex-col gap-4 text-sm text-[var(--color-text-soft,#e6f3f1)]"
        >
          <p className="m-0 text-xs text-[var(--color-text-muted)]">
            Der Kiosk zeigt die gewählten Dashboards im Vollbild ohne Menüs und wechselt zwischen
            ihnen. Es gilt deine Anmeldung; ein öffentlicher Link entsteht nicht.
          </p>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dashboards in der Rotation
            </legend>
            {dashboards.map((d) => (
              <label key={d.id} className="flex min-h-[36px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid={`kiosk-launch-option-${d.id}`}
                  checked={selected.includes(d.id)}
                  onChange={() => toggle(d.id)}
                />
                <span>{d.title}</span>
                {'teamName' in d && d.teamName && (
                  <span className="text-xs text-[var(--color-text-muted)]">({d.teamName})</span>
                )}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={intervalId}
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Wechsel alle … Sekunden ({KIOSK_INTERVAL_MIN_S}–{KIOSK_INTERVAL_MAX_S})
            </label>
            <input
              id={intervalId}
              data-testid="kiosk-launch-interval"
              type="number"
              inputMode="numeric"
              min={KIOSK_INTERVAL_MIN_S}
              max={KIOSK_INTERVAL_MAX_S}
              value={interval}
              onChange={(e) => setIntervalText(e.target.value)}
              aria-invalid={!intervalValid}
              className="h-9 w-32 rounded border border-[var(--color-border,#1b3d39)] bg-black/20 px-2 text-sm text-[var(--color-text)]"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
