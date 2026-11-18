import { THRESHOLD_MESSAGES } from '../../../../model/thresholdMessages';

export function ThresholdLegacyAlerts({
  isLegacy,
  isInvalidLegacy,
  invalidMessage,
  onReset,
}: {
  isLegacy: boolean;
  isInvalidLegacy: boolean;
  invalidMessage?: string;
  onReset: () => void;
}) {
  return (
    <>
      {isLegacy && !isInvalidLegacy && (
        <div
          data-testid="threshold-legacy-notice"
          className="rounded bg-amber-500/10 p-2 text-[11px] text-amber-300 border border-amber-500/20"
        >
          {THRESHOLD_MESSAGES.altUebernommen}
        </div>
      )}

      {isInvalidLegacy && invalidMessage && (
        <div
          data-testid="threshold-invalid-notice"
          className="space-y-2 rounded bg-amber-500/10 p-2.5 text-xs text-amber-300 border border-amber-500/30"
        >
          <p>{invalidMessage}</p>
          <button
            type="button"
            data-testid="threshold-reset-btn"
            onClick={onReset}
            className="rounded bg-amber-400 px-2 py-1 text-[11px] font-semibold text-black hover:bg-amber-300 cursor-pointer"
          >
            Neu festlegen
          </button>
        </div>
      )}
    </>
  );
}

export function ThresholdLivePreview({
  currentValue,
  valFormatted,
  previewText,
}: {
  currentValue: number | null | undefined;
  valFormatted: string | null;
  previewText: string;
}) {
  return (
    <div
      data-testid="threshold-live-preview"
      className="rounded border border-white/5 bg-white/5 p-2 text-xs"
    >
      <span className="text-[var(--color-text-muted)]">Live-Vorschau: </span>
      <span className="font-medium text-white">
        {currentValue !== null && currentValue !== undefined
          ? `Mit aktuellem Wert (${valFormatted}): ${previewText}`
          : 'Kein aktueller Wert vorhanden'}
      </span>
    </div>
  );
}
