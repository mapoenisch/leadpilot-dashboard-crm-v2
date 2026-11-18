import { useState, useEffect, useMemo, useId } from 'react';
import type { DashboardTileConfigV2, TileThresholdRule } from '../../../model/dashboardConfigV2';
import type { ActiveCatalogEntry, CatalogEntry } from '../../../model/dashboardCatalog';
import {
  isThresholdRuleV2,
  normalizeLegacyThresholdRule,
  validateThresholdRuleV2,
  evaluateThresholdV2,
  describeThresholdV2,
  type ThresholdRuleV2,
} from '../../../model/thresholdRuleV2';
import { THRESHOLD_MESSAGES } from '../../../model/thresholdMessages';
import { formatTileValue } from '../../tileFormat';
import { ThresholdArtRadioGroup, ThresholdFormFields } from './threshold/ThresholdFormFields';
import { ThresholdLegacyAlerts, ThresholdLivePreview } from './threshold/ThresholdLegacyAlerts';

export interface InspectorThresholdTabProps {
  selectedTile: DashboardTileConfigV2;
  onTileThresholdChange: (tileId: string, rule: TileThresholdRule | undefined) => void;
  currentValue?: number | null;
  catalogEntry?: ActiveCatalogEntry | CatalogEntry;
  isReadOnly?: boolean;
  tileDataState?: string;
}

export function InspectorThresholdTab({
  selectedTile,
  onTileThresholdChange,
  currentValue,
  catalogEntry,
  isReadOnly = false,
  tileDataState,
}: InspectorThresholdTabProps) {
  const formId = useId();
  const shape = (catalogEntry as ActiveCatalogEntry)?.shape;
  const isSingleValue = !shape || ['einzelwert', 'verhaeltnis', 'anteil'].includes(shape);
  const unit = (catalogEntry as ActiveCatalogEntry)?.unit ?? '';

  const currentThreshold = selectedTile.threshold;
  const normalizedInitial = useMemo(
    () => (currentThreshold ? normalizeLegacyThresholdRule(currentThreshold, catalogEntry) : null),
    [currentThreshold, catalogEntry],
  );
  const isLegacy = Boolean(currentThreshold && !isThresholdRuleV2(currentThreshold));
  const isInvalidLegacy = Boolean(
    isLegacy && normalizedInitial && 'ungueltig' in normalizedInitial,
  );

  const [draft, setDraft] = useState<Partial<ThresholdRuleV2>>(() => {
    if (currentThreshold && isThresholdRuleV2(currentThreshold)) return { ...currentThreshold };
    if (normalizedInitial && 'regel' in normalizedInitial) return { ...normalizedInitial.regel };
    const enabled = Boolean(currentThreshold?.enabled);
    return { formatVersion: 2, enabled, art: 'hoch_ist_schlecht', einheit: unit };
  });

  useEffect(() => {
    if (currentThreshold && isThresholdRuleV2(currentThreshold)) setDraft({ ...currentThreshold });
    else if (normalizedInitial && 'regel' in normalizedInitial)
      setDraft({ ...normalizedInitial.regel });
    else if (!currentThreshold)
      setDraft({ formatVersion: 2, enabled: false, art: 'hoch_ist_schlecht', einheit: unit });
  }, [currentThreshold, normalizedInitial, unit]);

  if (!isSingleValue) {
    return (
      <div data-testid="tab-content-schwellenwerte" className="space-y-3 p-2">
        <p className="text-xs text-[var(--color-text-muted)] bg-white/5 p-3 rounded border border-white/10">
          {THRESHOLD_MESSAGES.nurEinzelwert}
        </p>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div data-testid="tab-content-schwellenwerte" className="space-y-3 p-2 text-xs">
        <h4 className="font-medium text-white">Schwellenwert-Regel</h4>
        {currentThreshold && isThresholdRuleV2(currentThreshold) && currentThreshold.enabled ? (
          <p className="text-[var(--color-text-soft)]">{describeThresholdV2(currentThreshold)}</p>
        ) : (
          <p className="text-[var(--color-text-muted)]">Keine Schwellenwert-Überwachung aktiv.</p>
        )}
      </div>
    );
  }

  const validation = validateThresholdRuleV2(draft, catalogEntry);
  const isValid = validation.ok;
  const fieldError = !validation.ok
    ? { feld: validation.feld, grund: validation.grund }
    : undefined;
  const isEnabled = Boolean(draft.enabled);

  const previewEval = evaluateThresholdV2(
    { ...draft, formatVersion: 2, enabled: true, einheit: unit },
    currentValue,
    tileDataState ?? 'bereit',
    unit,
  );
  const valFormatted =
    currentValue !== undefined && currentValue !== null
      ? formatTileValue(currentValue, unit, 'exakt')
      : null;

  return (
    <div data-testid="tab-content-schwellenwerte" className="space-y-4">
      <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
        <input
          type="checkbox"
          data-testid="threshold-enable-toggle"
          checked={isEnabled}
          onChange={(e) => {
            const checked = e.target.checked;
            setDraft((p) => ({ ...p, enabled: checked }));
            if (!checked) onTileThresholdChange(selectedTile.id, undefined);
          }}
          className="rounded border-[var(--color-border,#1b3d39)]"
        />
        <span className="font-medium">Schwellenwert-Überwachung aktivieren</span>
      </label>

      {isEnabled && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
          <ThresholdLegacyAlerts
            isLegacy={isLegacy}
            isInvalidLegacy={isInvalidLegacy}
            invalidMessage={
              normalizedInitial && 'ungueltig' in normalizedInitial
                ? normalizedInitial.ungueltig
                : undefined
            }
            onReset={() => {
              const r: ThresholdRuleV2 = {
                formatVersion: 2,
                enabled: true,
                art: 'hoch_ist_schlecht',
                einheit: unit,
              };
              setDraft(r);
              onTileThresholdChange(selectedTile.id, r);
            }}
          />

          <ThresholdArtRadioGroup
            formId={formId}
            art={draft.art ?? 'hoch_ist_schlecht'}
            onChange={(art) => setDraft((p) => ({ ...p, art }))}
          />

          <ThresholdFormFields
            art={draft.art ?? 'hoch_ist_schlecht'}
            rule={draft}
            unit={unit}
            fieldError={fieldError}
            currentValueFormatted={valFormatted}
            onChangeField={(f, v) => setDraft((p) => ({ ...p, [f]: v }))}
          />

          <ThresholdLivePreview
            currentValue={currentValue}
            valFormatted={valFormatted}
            previewText={previewEval.text}
          />

          <button
            type="button"
            data-testid="threshold-apply-btn"
            disabled={!isValid}
            onClick={() =>
              isValid &&
              onTileThresholdChange(selectedTile.id, {
                ...draft,
                formatVersion: 2,
                enabled: true,
                einheit: unit,
              } as ThresholdRuleV2)
            }
            className={`w-full rounded py-1.5 text-xs font-semibold ${
              isValid
                ? 'bg-primary text-black hover:bg-primary/90 cursor-pointer'
                : 'bg-white/10 text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
            }`}
          >
            Übernehmen
          </button>
        </div>
      )}

      <p
        data-testid="threshold-browser-notice"
        className="text-[10px] text-[var(--color-text-muted)] leading-tight"
      >
        {THRESHOLD_MESSAGES.browserHinweis}
      </p>
    </div>
  );
}
