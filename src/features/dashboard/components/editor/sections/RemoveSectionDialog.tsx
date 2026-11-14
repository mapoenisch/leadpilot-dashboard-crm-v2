// Executive Dashboard V2 (Auftrag 157 / P09a):
// Bestätigungsdialog beim Entfernen einer Sektion mit Kacheln.

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { DashboardSectionV2 } from '../../../model/dashboardConfigV2';

export interface RemoveSectionDialogProps {
  open: boolean;
  section: DashboardSectionV2 | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveSectionDialog({
  open,
  section,
  onConfirm,
  onCancel,
}: RemoveSectionDialogProps) {
  if (!section) return null;

  const count = section.tileIds.length;
  const tileLabel = count === 1 ? '1 Kachel bleibt' : `${count} Kacheln bleiben`;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Sektion entfernen"
      maxWidth="500px"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            data-testid="cancel-remove-section-btn"
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="primary"
            data-testid="confirm-remove-section-btn"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={onConfirm}
          >
            Sektion entfernen
          </Button>
        </div>
      }
    >
      <div
        data-testid="remove-section-dialog-content"
        className="space-y-2 py-1 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
        <p className="m-0">
          Möchtest du die Sektion{' '}
          <span className="font-semibold text-white">„{section.title}“</span> wirklich entfernen?
        </p>
        <p className="m-0 text-xs text-[var(--color-text-muted)]">
          Die {tileLabel} erhalten und wandern nach{' '}
          <span className="font-semibold text-white">„Ohne Sektion“</span>. Es wird keine Kachel
          gelöscht.
        </p>
      </div>
    </Modal>
  );
}
