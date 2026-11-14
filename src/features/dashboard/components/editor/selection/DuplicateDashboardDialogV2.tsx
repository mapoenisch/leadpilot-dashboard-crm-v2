// Auftrag 158 (P09b): Dialog zum Duplizieren eines Dashboards.
// Titel vorbelegt über buildDerivedDashboardTitle, Prüfung auf ungespeicherte Änderungen.

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { DashboardV2StorageError, StoredDashboardV2Row } from '../../../services/dashboardStorageV2Types';
import {
  MAX_DASHBOARD_TITLE_LENGTH,
  buildDerivedDashboardTitle,
} from '../../../model/dashboardTitles';
import { useEscapeToClose } from '../../UnsavedChangesDialog';

export type DuplicateConfirmResult =
  | boolean
  | { ok: boolean; error?: DashboardV2StorageError };

export interface DuplicateDashboardDialogV2Props {
  open: boolean;
  onClose: () => void;
  currentDashboard: StoredDashboardV2Row;
  isDirty: boolean;
  onDuplicate: (title: string, saveFirst?: boolean) => Promise<DuplicateConfirmResult>;
  isSaving?: boolean;
}

function getDuplicateErrorMessage(error?: DashboardV2StorageError): string {
  if (!error) return 'Das Dashboard konnte nicht dupliziert werden.';
  switch (error.kind) {
    case 'obergrenze_erreicht':
      return 'Die Obergrenze von 20 Dashboards wurde erreicht. Bitte lösche ein bestehendes Dashboard.';
    case 'konflikt':
      return 'Revisionskonflikt: Der aktuelle Stand konnte vor dem Duplizieren nicht gespeichert werden.';
    case 'nicht_gefunden':
      return 'Das Quell-Dashboard wurde nicht gefunden.';
    case 'nicht_berechtigt':
    case 'keine_mitgliedschaft':
      return 'Keine Berechtigung zum Duplizieren dieses Dashboards.';
    default:
      return 'Das Dashboard konnte nicht dupliziert werden.';
  }
}

export function DuplicateDashboardDialogV2({
  open,
  onClose,
  currentDashboard,
  isDirty,
  onDuplicate,
  isSaving = false,
}: DuplicateDashboardDialogV2Props) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  useEffect(() => {
    if (open) {
      setTitle(buildDerivedDashboardTitle(currentDashboard.title, ' (Kopie)'));
      setError(null);
    }
  }, [open, currentDashboard.title]);

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  useEscapeToClose(open, handleClose);

  const handleSubmit = async (saveFirst: boolean) => {
    if (isSaving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Bitte gib einen Titel für das duplizierte Dashboard ein.');
      return;
    }
    if (trimmed.length > MAX_DASHBOARD_TITLE_LENGTH) {
      setError(`Der Titel darf höchstens ${MAX_DASHBOARD_TITLE_LENGTH} Zeichen lang sein.`);
      return;
    }

    setError(null);
    const res = await onDuplicate(trimmed, saveFirst);
    if (typeof res === 'boolean') {
      if (!res) setError('Das Dashboard konnte nicht dupliziert werden.');
    } else if (res && !res.ok) {
      setError(getDuplicateErrorMessage(res.error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Dashboard duplizieren"
      maxWidth="580px"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Abbrechen
          </Button>
          {isDirty ? (
            <>
              <Button
                variant="secondary"
                disabled={isSaving || !title.trim()}
                onClick={() => handleSubmit(false)}
                className="w-full sm:w-auto"
              >
                Nur Stand duplizieren
              </Button>
              <Button
                data-testid="duplicate-submit-button"
                disabled={isSaving || !title.trim()}
                onClick={() => handleSubmit(true)}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Wird gespeichert & dupliziert...' : 'Speichern & duplizieren'}
              </Button>
            </>
          ) : (
            <Button
              data-testid="duplicate-submit-button"
              disabled={isSaving || !title.trim()}
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto"
            >
              {isSaving ? 'Wird dupliziert...' : 'Dashboard duplizieren'}
            </Button>
          )}
        </div>
      }
    >
      <div data-testid="duplicate-dashboard-dialog" className="flex flex-col gap-4 text-sm text-[var(--color-text-soft,#e6f3f1)]">
        {error && (
          <div
            role="alert"
            data-testid="duplicate-dashboard-error"
            className="rounded border border-error/40 bg-error/10 p-2.5 text-xs text-error"
          >
            {error}
          </div>
        )}

        {isDirty && (
          <div
            role="note"
            className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300"
          >
            <p className="font-semibold">Ungespeicherte Änderungen vorhanden</p>
            <p className="mt-1">
              Es wird der gespeicherte Server-Stand dupliziert. Ungespeicherte Änderungen im aktuellen Entwurf
              werden nicht übernommen, es sei denn, du wählst „Speichern & duplizieren“.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Titel des neuen Dashboards
          </label>
          <input
            id={inputId}
            data-testid="duplicate-dashboard-title-input"
            type="text"
            disabled={isSaving}
            value={title}
            maxLength={MAX_DASHBOARD_TITLE_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-3 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <span className="text-[11px] text-muted-foreground">
            {title.length} / {MAX_DASHBOARD_TITLE_LENGTH} Zeichen
          </span>
        </div>
      </div>
    </Modal>
  );
}
