// Executive Dashboard V2 (Auftrag 163 / P11b):
// Dialog bei Rechteentzug (§2.1 Nr. 7): Schützt den aktuellen Entwurf.
// Bietet "Entwurf als persönliche Kopie sichern" vs. "Verwerfen und neu laden".

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useEscapeToClose } from '../UnsavedChangesDialog';

export interface TeamAccessRevokedDialogV2Props {
  isOpen?: boolean;
  open?: boolean;
  dashboardTitle?: string;
  onSaveAsPersonalCopy: () => void | Promise<void>;
  onDiscardAndReload: () => void | Promise<void>;
  isSaving?: boolean;
}

export function TeamAccessRevokedDialogV2({
  isOpen,
  open,
  dashboardTitle,
  onSaveAsPersonalCopy,
  onDiscardAndReload,
  isSaving = false,
}: TeamAccessRevokedDialogV2Props) {
  const isModalOpen = Boolean(isOpen ?? open);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      await onSaveAsPersonalCopy();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = async () => {
    setIsProcessing(true);
    try {
      await onDiscardAndReload();
    } finally {
      setIsProcessing(false);
    }
  };

  useEscapeToClose(isModalOpen, () => {
    // Escape verwirft nicht still, sondern verlangt eine Entscheidung
  });

  return (
    <Modal
      open={isModalOpen}
      onClose={() => {
        // Schließen erfordert eine der beiden Aktionen
      }}
      title="Bearbeitungsrechte entzogen"
      maxWidth="540px"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            disabled={isSaving || isProcessing}
            onClick={handleDiscard}
            className="w-full sm:w-auto"
            data-testid="team-revoked-discard-button"
          >
            Verwerfen und neu laden
          </Button>
          <Button
            variant="primary"
            disabled={isSaving || isProcessing}
            onClick={handleSave}
            className="w-full sm:w-auto"
            data-testid="team-revoked-save-copy-button"
          >
            {isProcessing || isSaving
              ? 'Wird gesichert...'
              : 'Entwurf als persönliche Kopie sichern'}
          </Button>
        </div>
      }
    >
      <div
        data-testid="team-access-revoked-dialog"
        className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
        <div
          role="alert"
          className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
        >
          <p className="font-semibold">
            Deine Bearbeitungsrechte für dieses Team-Dashboard wurden entzogen.
          </p>
          <p className="mt-1">
            Deine Änderungen an{' '}
            {dashboardTitle ? (
              <strong className="text-white">„{dashboardTitle}“</strong>
            ) : (
              'diesem Dashboard'
            )}{' '}
            können nicht mehr im Team gespeichert werden. Du kannst deinen aktuellen Entwurf jedoch
            als persönliche Kopie sichern.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Wähle <strong>„Entwurf als persönliche Kopie sichern“</strong>, um deine Änderungen in
          einem eigenen persönlichen Dashboard zu speichern, oder{' '}
          <strong>„Verwerfen und neu laden“</strong>, um den aktuellen Stand vom Server zu laden.
        </p>
      </div>
    </Modal>
  );
}
