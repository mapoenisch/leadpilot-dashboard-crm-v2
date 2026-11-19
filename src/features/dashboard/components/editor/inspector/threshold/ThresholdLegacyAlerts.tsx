import { THRESHOLD_MESSAGES } from '../../../../model/thresholdMessages';
import type { ThresholdRuleV2 } from '../../../../model/thresholdRuleV2';

export type NormalizedLegacyRule = { regel: ThresholdRuleV2 } | { ungueltig: string };

export const defaultThresholdRule = (einheit: string): ThresholdRuleV2 => ({
  formatVersion: 2,
  enabled: true,
  art: 'hoch_ist_schlecht',
  einheit,
});

export function ThresholdLegacyAlerts({
  isLegacy,
  normalizedInitial,
  onReset,
}: {
  isLegacy: boolean;
  normalizedInitial?: NormalizedLegacyRule | null;
  onReset: () => void;
}) {
  const isInvalidLegacy = Boolean(
    isLegacy && normalizedInitial && 'ungueltig' in normalizedInitial,
  );
  const invalidMessage =
    normalizedInitial && 'ungueltig' in normalizedInitial ? normalizedInitial.ungueltig : undefined;
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

export function ReadOnlyThresholdView({ description }: { description?: string | null }) {
  return (
    <div data-testid="tab-content-schwellenwerte" className="space-y-3 p-2 text-xs">
      <h4 className="font-medium text-white">Schwellenwert-Regel</h4>
      <p
        className={description ? 'text-[var(--color-text-soft)]' : 'text-[var(--color-text-muted)]'}
      >
        {description ?? 'Keine Schwellenwert-Überwachung aktiv.'}
      </p>
    </div>
  );
}
