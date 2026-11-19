// Executive Dashboard V2 (Auftrag 168 / P13c):
// Dialog zum Quittieren von Warnungen und kritischen Alarmmeldungen mit Barrierefreiheit (useModalA11y).

import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { useModalA11y } from '../editor/versions/useModalA11y';
import { validateAcknowledgementComment } from '../../model/dashboardAlarmPermitted';
import type { DashboardAlarmEventItem } from '../../services/dashboardAlarmService';

export interface AlarmAcknowledgeDialogProps {
  isOpen: boolean;
  event: DashboardAlarmEventItem | null;
  onConfirm: (comment: string) => Promise<void>;
  onCancel: () => void;
}

export const AlarmAcknowledgeDialog: React.FC<AlarmAcknowledgeDialogProps> = ({
  isOpen,
  event,
  onConfirm,
  onCancel,
}) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setComment('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const dialogRef = useModalA11y<HTMLDivElement>({
    isOpen,
    onClose: onCancel,
    closeOnEscape: !isSubmitting,
  });

  if (!isOpen || !event) return null;

  const validation = validateAcknowledgementComment(comment);
  const charCount = comment.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.ok) {
      setError(validation.error ?? 'Ungültiger Kommentar');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(comment.trim());
      onCancel();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Speichern der Quittierung';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ack-dialog-title"
        data-testid="alarm-acknowledge-dialog"
        className="w-full max-w-md rounded-xl border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#041110)] p-5 shadow-2xl text-text font-body"
      >
        <div className="flex items-center justify-between border-b border-border-soft pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h3 id="ack-dialog-title" className="m-0 text-sm font-semibold text-white">
              Alarm quittieren
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded p-1 text-[var(--color-text-muted)] hover:text-white hover:bg-surface-raised transition-colors"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="rounded-lg bg-surface/40 border border-white/5 p-3 space-y-1">
            <div className="font-semibold text-white">{event.dashboardTitle}</div>
            <div className="text-[var(--color-text-muted)]">
              Kachel: <span className="text-white">{event.tileId}</span> · Meldung:{' '}
              <span className="text-white">{event.meldung}</span>
            </div>
            {event.messwert !== null && (
              <div className="text-[11px] text-[var(--color-text-soft)]">
                Messwert: {event.messwert} {event.einheit ?? ''}{' '}
                {event.grenze !== null && `(Schwelle: ${event.grenze})`}
              </div>
            )}
          </div>

          <p className="text-[var(--color-text-muted)] leading-relaxed">
            Mit der Quittierung bestätigst du: <strong>„Gesehen und kümmere mich“</strong>. Dein
            Name/E-Mail wird für andere Berechtigte sichtbar vermerkt.
          </p>

          <div>
            <label
              htmlFor="ack-comment-field"
              className="block font-medium text-white mb-1 flex justify-between"
            >
              <span>Optionaler Kommentar:</span>
              <span
                data-testid="alarm-ack-char-counter"
                className={`text-[10px] ${charCount > 280 ? 'text-rose-400 font-bold' : 'text-[var(--color-text-muted)]'}`}
              >
                {charCount} / 280
              </span>
            </label>
            <textarea
              id="ack-comment-field"
              data-testid="alarm-ack-comment-input"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="z. B. Ursache analysiert, Ticket #123 angelegt..."
              maxLength={300}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-1.5 rounded bg-rose-500/10 p-2 text-[11px] text-rose-300 border border-rose-500/20"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-soft">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-text hover:bg-surface-raised cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              data-testid="alarm-ack-submit-btn"
              disabled={isSubmitting || !validation.ok}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Wird gespeichert…' : 'Gesehen und kümmere mich'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
