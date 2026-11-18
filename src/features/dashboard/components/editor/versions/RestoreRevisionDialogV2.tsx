// Executive Dashboard V2 (Auftrag 165 / P12):
// Bestätigungsdialog für das Wiederherstellen einer früheren Revision mit Entwurfsschutz.

import { useState } from 'react';
import { AlertTriangle, RotateCcw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DASHBOARD_VERSION_MESSAGES } from '../../../model/dashboardVersionMessages';
import { useModalA11y } from './useModalA11y';

export interface RestoreRevisionDialogV2Props {
  isOpen: boolean;
  targetRevision: number;
  currentRevision: number;
  isDirty: boolean;
  scope?: 'personal' | 'team';
  teamName?: string | null;
  onConfirmRestore: (options: { saveDraftAsCopy: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function RestoreRevisionDialogV2({
  isOpen,
  targetRevision,
  currentRevision,
  isDirty,
  scope,
  teamName,
  onConfirmRestore,
  onCancel,
}: RestoreRevisionDialogV2Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogRef = useModalA11y<HTMLDivElement>({
    isOpen,
    onClose: onCancel,
  });

  if (!isOpen) return null;

  const nextRevision = currentRevision + 1;
  const isTeam = scope === 'team';

  const handleAction = async (saveDraftAsCopy: boolean) => {
    setIsSubmitting(true);
    try {
      await onConfirmRestore({ saveDraftAsCopy });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-dialog-title"
      tabIndex={-1}
      data-testid="restore-revision-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm outline-none"
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-6 shadow-xl text-[var(--color-text-soft,#e6f3f1)] space-y-4">
        {/* Titel */}
        <div className="flex items-center gap-2">
          {isDirty ? (
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          ) : (
            <RotateCcw className="h-5 w-5 text-primary" />
          )}
          <h2 id="restore-dialog-title" className="text-base font-semibold text-white">
            {isDirty ? 'Ungespeicherte Änderungen' : DASHBOARD_VERSION_MESSAGES.restoreConfirmTitle}
          </h2>
        </div>

        {/* Beschreibung */}
        <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text-soft)]">
          {isDirty && (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-300 font-medium">
              {DASHBOARD_VERSION_MESSAGES.restoreDraftWarning}
            </p>
          )}

          <p>{DASHBOARD_VERSION_MESSAGES.restoreNotice(targetRevision, nextRevision)}</p>

          {isTeam && teamName && (
            <p className="text-[var(--color-text-muted)]">
              {DASHBOARD_VERSION_MESSAGES.restoreTeamNotice(teamName)}
            </p>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex flex-col gap-2 pt-2">
          {isDirty ? (
            <>
              <Button
                type="button"
                data-testid="restore-save-copy-button"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleAction(true)}
                className="w-full justify-center gap-1.5 text-xs font-semibold"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{DASHBOARD_VERSION_MESSAGES.restoreDraftSaveAsCopy}</span>
              </Button>

              <Button
                type="button"
                data-testid="restore-discard-button"
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleAction(false)}
                className="w-full justify-center text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              >
                <span>{DASHBOARD_VERSION_MESSAGES.restoreDraftDiscard}</span>
              </Button>

              <Button
                type="button"
                data-testid="restore-cancel-button"
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={onCancel}
                className="w-full justify-center text-xs"
              >
                <span>{DASHBOARD_VERSION_MESSAGES.restoreCancel}</span>
              </Button>
            </>
          ) : (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                data-testid="restore-cancel-button"
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={onCancel}
                className="text-xs"
              >
                <span>{DASHBOARD_VERSION_MESSAGES.restoreCancel}</span>
              </Button>
              <Button
                type="button"
                data-testid="confirm-restore-button"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleAction(false)}
                className="gap-1.5 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Wiederherstellen…' : 'Wiederherstellen'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
