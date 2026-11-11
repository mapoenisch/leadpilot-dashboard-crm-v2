// Executive Dashboard V2 (Auftrag 150 / P07):
// Modaler Revisionskonflikt-Dialog bei gleichzeitiger Bearbeitung (P02 §7.2).
// Bietet Neuladen des Serverstands, Retten als neue persönliche Kopie oder Weitermachen.

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useEscapeToClose } from '../UnsavedChangesDialog';

export interface DashboardConflictDialogV2Props {
  open: boolean;
  isSaving: boolean;
  onReload: () => void;
  onSaveAsCopy: () => void;
  onStay: () => void;
}

export function DashboardConflictDialogV2({
  open,
  isSaving,
  onReload,
  onSaveAsCopy,
  onStay,
}: DashboardConflictDialogV2Props) {
  const stay = () => {
    if (!isSaving) onStay();
  };
  useEscapeToClose(open, stay);

  return (
    <Modal
      open={open}
      onClose={stay}
      title="Revisionskonflikt erkannt"
      maxWidth="620px"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={isSaving} onClick={stay}>
            Hier bleiben
          </Button>
          <Button
            variant="secondary"
            className="border-error text-error"
            disabled={isSaving}
            onClick={onReload}
          >
            Serverstand laden & verwerfen
          </Button>
          <Button disabled={isSaving} onClick={onSaveAsCopy}>
            Als Kopie speichern
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]">
        <p>
          Dieses Dashboard wurde in einem anderen Tab oder Browserfenster bereits mit einer neueren
          Revision gespeichert.
        </p>
        <p className="text-muted-foreground">
          Um einen Datenverlust zu verhindern, wurden deine aktuellen Änderungen nicht
          überschrieben. Du kannst den neuen Serverstand laden oder deine aktuellen Änderungen als
          neues persönliches Dashboard sichern.
        </p>
      </div>
    </Modal>
  );
}
