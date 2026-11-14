// Auftrag 158 (P09b): Dialog wenn das aktive Dashboard extern gelöscht wurde.
// Bietet "Als neues Dashboard speichern" und "Anderes Dashboard öffnen".

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useEscapeToClose } from '../UnsavedChangesDialog';

export interface DashboardDeletedDialogV2Props {
  open: boolean;
  isSaving: boolean;
  onSaveAsNew: () => void;
  onOpenOther: () => void;
  onStay?: () => void;
}

export function DashboardDeletedDialogV2({
  open,
  isSaving,
  onSaveAsNew,
  onOpenOther,
  onStay,
}: DashboardDeletedDialogV2Props) {
  const stay = () => {
    if (!isSaving && onStay) onStay();
  };
  useEscapeToClose(open, stay);

  return (
    <Modal
      open={open}
      onClose={stay}
      title="Dieses Dashboard wurde gelöscht."
      maxWidth="620px"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {onStay && (
            <Button variant="secondary" disabled={isSaving} onClick={stay}>
              Im Entwurf bleiben
            </Button>
          )}
          <Button variant="secondary" disabled={isSaving} onClick={onOpenOther}>
            Anderes Dashboard öffnen
          </Button>
          <Button disabled={isSaving} onClick={onSaveAsNew}>
            Als neues Dashboard speichern
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]" role="alert">
        <p>
          Dieses Dashboard wurde zwischenzeitlich in einem anderen Tab oder von einem anderen Gerät gelöscht.
        </p>
        <p className="text-muted-foreground">
          Dein lokaler Entwurf ist noch vorhanden. Du kannst deine Änderungen als neues persönliches Dashboard speichern
          oder zu einem anderen vorhandenen Dashboard wechseln.
        </p>
      </div>
    </Modal>
  );
}
