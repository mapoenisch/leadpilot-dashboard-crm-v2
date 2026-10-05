// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Rückfrage beim Verlassen mit ungespeicherten
// Änderungen. Drei Wege: speichern und weiter, verwerfen und weiter, hier bleiben.
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/**
 * Escape schließt den Dialog auch bei Fokus im Dialog. `Modal` stoppt `keydown` im Dialog (React
 * reicht das als natives stopPropagation an die Wurzel weiter), sein Fenster-Listener sieht Escape
 * dort nie. Die Aufnahmephase kommt vor diesem Stopp; doppeltes Schließen ist wirkungslos.
 */
export function useEscapeToClose(open: boolean, onClose: () => void): void {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);
}

export interface UnsavedChangesDialogProps {
  open: boolean;
  locked: boolean;
  /** Fehlertext des letzten Speicherversuchs; Entwurf und Dialog bleiben dann erhalten. */
  errorMessage?: string;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
}

export function UnsavedChangesDialog(props: UnsavedChangesDialogProps) {
  useEscapeToClose(props.open, props.onStay);
  return (
    <Modal
      open={props.open}
      onClose={props.onStay}
      title="Ungespeicherte Änderungen"
      maxWidth="600px"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={props.locked} onClick={props.onStay}>
            Hier bleiben
          </Button>
          <Button
            variant="secondary"
            className="border-error text-error"
            disabled={props.locked}
            onClick={props.onDiscard}
          >
            Verwerfen und weiter
          </Button>
          <Button disabled={props.locked} onClick={props.onSave}>
            Speichern und weiter
          </Button>
        </div>
      }
    >
      <p className="m-0 text-sm [overflow-wrap:anywhere]">
        Du hast Änderungen am Dashboard, die noch nicht gespeichert sind. Was möchtest du tun?
      </p>
      {props.errorMessage ? (
        <p role="alert" className="mt-3 text-sm text-error [overflow-wrap:anywhere]">
          {props.errorMessage}
        </p>
      ) : null}
    </Modal>
  );
}
