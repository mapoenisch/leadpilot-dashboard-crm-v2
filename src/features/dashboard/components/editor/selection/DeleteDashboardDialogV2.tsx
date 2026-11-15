// Auftrag 158 (P09b): Bestätigungsdialog zum endgültigen Löschen eines Dashboards.
// Nennung von Titel, Kachelanzahl und Hinweis auf endgültigen Datenverlust.

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  DashboardV2StorageError,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import { useEscapeToClose } from '../../UnsavedChangesDialog';

export type DeleteConfirmResult = boolean | { ok: boolean; error?: DashboardV2StorageError };

export interface DeleteDashboardDialogV2Props {
  open: boolean;
  onClose: () => void;
  dashboard: StoredDashboardV2Row;
  onConfirm: () => Promise<DeleteConfirmResult>;
  isSaving?: boolean;
}

function getDeleteErrorMessage(error?: DashboardV2StorageError): string {
  if (!error) return 'Das Dashboard konnte nicht gelöscht werden.';
  switch (error.kind) {
    case 'konflikt':
      return 'Revisionskonflikt: Das Dashboard wurde zwischenzeitlich anderweitig geändert. Bitte lade die Seite neu, bevor du es löschst.';
    case 'letztes_dashboard':
      return 'Das letzte Dashboard kann nicht gelöscht werden.';
    case 'nicht_gefunden':
      return 'Das Dashboard wurde bereits gelöscht oder existiert nicht mehr.';
    case 'nicht_berechtigt':
    case 'keine_mitgliedschaft':
      return 'Du hast keine Berechtigung, dieses Dashboard zu löschen.';
    default:
      return 'Das Dashboard konnte nicht gelöscht werden.';
  }
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
    const res = await onConfirm();
    if (typeof res === 'boolean') {
      if (!res) setError('Das Dashboard konnte nicht gelöscht werden.');
    } else if (res && !res.ok) {
      setError(getDeleteErrorMessage(res.error));
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
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Abbrechen
          </Button>
          <Button
            data-testid="delete-dashboard-confirm-button"
            variant="danger"
            disabled={isSaving}
            onClick={handleConfirm}
            className="max-w-full truncate w-full sm:w-auto"
          >
            <span className="truncate">
              {isSaving ? 'Wird gelöscht...' : `„${dashboard.title}“ endgültig löschen`}
            </span>
          </Button>
        </div>
      }
    >
      <div
        data-testid="delete-dashboard-dialog"
        className="flex flex-col gap-3 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
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
            Das Dashboard und seine Versionshistorie werden endgültig gelöscht. Diese Aktion kann
            nicht rückgängig gemacht werden.
          </p>
        </div>
      </div>
    </Modal>
  );
}
