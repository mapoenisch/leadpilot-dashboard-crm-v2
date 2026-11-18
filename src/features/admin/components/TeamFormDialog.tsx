// Executive Dashboard V2 (Auftrag 163 / P11b):
// Dialog zum Anlegen und Umbenennen von Dashboard-Teams.

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { DashboardV2StorageError } from '@/features/dashboard/services/dashboardStorageV2Types';
import { getDashboardTeamErrorMessage } from '@/features/dashboard/model/dashboardTeamMessages';
import { useEscapeToClose } from '@/features/dashboard/components/UnsavedChangesDialog';

export interface TeamFormData {
  id?: string;
  name: string;
  description: string | null;
}

export interface TeamFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: TeamFormData | null;
  onSubmit: (
    name: string,
    description: string | null,
  ) => Promise<{ ok: boolean; error?: DashboardV2StorageError }>;
  isSaving?: boolean;
}

export function TeamFormDialog({
  open,
  onClose,
  initialData,
  onSubmit,
  isSaving: isSavingProp = false,
}: TeamFormDialogProps) {
  // Eigener Speicherzustand: Der Dialog bleibt gesperrt, bis die Anfrage beendet ist,
  // auch wenn die aufrufende Seite keinen isSaving-Wert liefert.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSaving = isSavingProp || isSubmitting;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nameInputId = useId();
  const descInputId = useId();

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? '');
      setDescription(initialData?.description ?? '');
      setError(null);
    }
  }, [open, initialData]);

  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      onClose();
    }
  };

  useEscapeToClose(open, handleClose);

  const isEdit = Boolean(initialData?.id);
  const trimmedName = name.trim();
  const trimmedDesc = description.trim();
  const isSubmitDisabled = isSaving || !trimmedName || trimmedName.length > 80;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await onSubmit(trimmedName, trimmedDesc ? trimmedDesc : null);
      if (!res.ok) {
        setError(getDashboardTeamErrorMessage(res.error, 'team'));
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Team bearbeiten' : 'Neues Team anlegen'}
      maxWidth="500px"
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
            data-testid="team-form-submit-button"
            variant="primary"
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {isSaving
              ? isEdit
                ? 'Wird gespeichert...'
                : 'Wird angelegt...'
              : isEdit
                ? 'Änderungen speichern'
                : 'Team anlegen'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
        {error && (
          <div
            role="alert"
            data-testid="team-form-error"
            className="rounded border border-error/40 bg-error/10 p-2.5 text-xs text-error"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={nameInputId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Team-Name <span className="text-error">*</span>
          </label>
          <input
            id={nameInputId}
            data-testid="team-name-input"
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            placeholder="z. B. Vertrieb Süd"
            className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] px-3 text-sm text-white placeholder-muted-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <span className="text-[11px] text-muted-foreground">
            {name.length}/80 Zeichen (in der Organisation eindeutig)
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={descInputId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Beschreibung (optional)
          </label>
          <textarea
            id={descInputId}
            data-testid="team-description-input"
            rows={3}
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
            placeholder="Zweck oder Zuständigkeit des Teams..."
            className="w-full rounded border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] p-2.5 text-sm text-white placeholder-muted-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
