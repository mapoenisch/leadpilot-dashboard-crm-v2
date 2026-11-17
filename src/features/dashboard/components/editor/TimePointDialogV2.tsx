// Executive Dashboard V2 (Auftrag 161 / P10b-2):
// Dialog zur Auswahl eines historischen Analysezeitpunkts (Modus zeitpunkt).
// Wird per React.lazy nachgeladen, um das Initial-Bundle klein zu halten.

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import {
  formatBerlinLocalDateTime,
  getBerlinPresets,
  parseBerlinDateTime,
} from '../../time/timeControl';

export interface TimePointDialogV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (isoString: string) => void;
  currentAnalysisAt?: string | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function TimePointDialogV2({
  isOpen,
  onClose,
  onSelect,
  currentAnalysisAt,
  triggerRef,
}: TimePointDialogV2Props) {
  const titleId = useId();
  const presets = getBerlinPresets();
  const maxLocalDateTime = formatBerlinLocalDateTime(new Date());

  const [datetimeInput, setDatetimeInput] = useState<string>(() =>
    currentAnalysisAt ? formatBerlinLocalDateTime(currentAnalysisAt) : maxLocalDateTime,
  );
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDatetimeInput(
        currentAnalysisAt
          ? formatBerlinLocalDateTime(currentAnalysisAt)
          : formatBerlinLocalDateTime(new Date()),
      );
      dialogRef.current?.focus();
    }
    const triggerEl = triggerRef?.current;
    return () => {
      triggerEl?.focus();
    };
  }, [isOpen, currentAnalysisAt, triggerRef]);

  if (!isOpen) return null;

  const handleApplyCustom = () => {
    setError(null);
    const parsedIso = parseBerlinDateTime(datetimeInput);
    if (!parsedIso) {
      setError('Bitte ein gültiges Datum und eine Uhrzeit angeben.');
      return;
    }
    const targetMs = Date.parse(parsedIso);
    if (Number.isNaN(targetMs) || targetMs > Date.now()) {
      setError('Der Zeitpunkt darf nicht in der Zukunft liegen.');
      return;
    }
    onSelect(parsedIso);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dialog schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-md rounded-xl border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-5 text-[var(--color-text-soft,#e6f3f1)] shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border,#1b3d39)] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id={titleId} className="m-0 text-base font-semibold">
              Analysezeitpunkt wählen
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-time-point-dialog"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white"
            aria-label="Dialog schließen"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Schnellauswahl (jeweils 24:00 Uhr Berliner Zeit)
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`time-point-preset-${preset.id}`}
                  onClick={() => onSelect(preset.at)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border,#1b3d39)] bg-black/30 px-3 py-2 text-xs font-medium text-[var(--color-text-soft,#e6f3f1)] transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-white"
                >
                  <Calendar className="h-3.5 w-3.5 text-primary/80" aria-hidden="true" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--color-border,#1b3d39)] pt-4">
            <label
              htmlFor="time-point-input"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]"
            >
              Datum und Uhrzeit (Europe/Berlin)
            </label>
            <div className="flex flex-col gap-2">
              <input
                id="time-point-input"
                type="datetime-local"
                data-testid="time-point-datetime-input"
                max={maxLocalDateTime}
                value={datetimeInput}
                onChange={(e) => {
                  setDatetimeInput(e.target.value);
                  setError(null);
                }}
                className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-3 text-xs text-[var(--color-text-soft,#e6f3f1)] outline-none focus:border-primary"
              />
              {error && (
                <p data-testid="time-point-error" className="m-0 text-[11px] text-red-400">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--color-border,#1b3d39)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--color-border,#1b3d39)] bg-transparent px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-white"
          >
            Abbrechen
          </button>
          <button
            type="button"
            data-testid="apply-time-point-button"
            onClick={handleApplyCustom}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-black hover:bg-primary/90"
          >
            Zeitpunkt anwenden
          </button>
        </div>
      </div>
    </div>
  );
}
