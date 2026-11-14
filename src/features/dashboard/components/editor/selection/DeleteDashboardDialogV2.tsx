// Auftrag 158 (P09b): Bestätigungsdialog zum endgültigen Löschen eines Dashboards.
// Nennung von Titel, Kachelanzahl und Hinweis auf endgültigen Datenverlust.

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { StoredDashboardV2Row } from '../../../services/dashboardStorageV2Types';
import { useEscapeToClose } from '../../UnsavedChangesDialog';

export interface DeleteDashboardDialogV2Props {
  open: boolean;
  onClose: () => void;
  dashboard: StoredDashboardV2Row;
  onConfirm: () => Promise<boolean>;
  isSaving?: boolean;
}

export function DeleteDashboardDialogV2({
  open,
  onClose,
  dashboard,
  onConfirm,
  isSaving = false,
}: DeleteDashboardDialogV2Props) {
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      onClose();
    }
  };

  useEscapeToClose(open, handleClose);

  const handleConfirm = async () => {
    setError(null);
    const success = await onConfirm();
    if (!success) {
      setError('Das Dashboard konnte nicht gelöscht werden.');
    }
  };

  const tileCount = dashboard.config.tiles?.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Dashboard löschen?"
      maxWidth="540px"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isSaving} onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            data-testid="delete-dashboard-confirm-button"
            variant="danger"
            disabled={isSaving}
            onClick={handleConfirm}
          >
            {isSaving ? 'Wird gelöscht...' : `„${dashboard.title}“ endgültig löschen`}
          </Button>
        </div>
      }
    >
      <div data-testid="delete-dashboard-dialog" className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]">
        {error && (
          <div
            role="alert"
            data-testid="delete-dashboard-error"
            className="rounded border border-error/40 bg-error/10 p-2.5 text-xs text-error"
          >
            {error}
          </div>
        )}

        <p>
          Möchtest du das Dashboard <strong className="text-white">„{dashboard.title}“</strong> (
          {tileCount} {tileCount === 1 ? 'Kachel' : 'Kacheln'}) wirklich löschen?
        </p>

        <div
          role="alert"
          className="rounded border border-error/40 bg-error/10 p-3 text-xs text-error"
        >
          <p className="font-semibold">Achtung: Endgültiges Löschen</p>
          <p className="mt-1">
            Das Dashboard und seine Versionshistorie werden endgültig gelöscht. Diese Aktion kann nicht
            rückgängig gemacht werden.
          </p>
        </div>
      </div>
    </Modal>
  );
}
