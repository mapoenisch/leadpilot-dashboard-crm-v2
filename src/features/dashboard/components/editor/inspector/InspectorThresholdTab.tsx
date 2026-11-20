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
import { getEffectiveUnit } from '../../../model/transformations';
import { formatTileValue } from '../../tileFormat';
import {
  cleanThresholdRule,
  ThresholdArtRadioGroup,
  ThresholdFormFields,
} from './threshold/ThresholdFormFields';
import {
  defaultThresholdRule,
  ReadOnlyThresholdView,
  ThresholdLegacyAlerts,
  ThresholdLivePreview,
} from './threshold/ThresholdLegacyAlerts';
import { AlarmSection } from './threshold/AlarmSection';

export interface InspectorThresholdTabProps {
  selectedTile: DashboardTileConfigV2;
  onTileThresholdChange: (tileId: string, rule: TileThresholdRule | undefined) => void;
  currentValue?: number | null;
  catalogEntry?: ActiveCatalogEntry | CatalogEntry;
  isReadOnly?: boolean;
  tileDataState?: string;
  dashboardId?: string;
  isDirty?: boolean;
}

export function InspectorThresholdTab({
  selectedTile,
  onTileThresholdChange,
  currentValue,
  catalogEntry,
  isReadOnly = false,
  tileDataState,
  dashboardId,
  isDirty = false,
}: InspectorThresholdTabProps) {
  const formId = useId();
  const shape = (catalogEntry as ActiveCatalogEntry)?.shape;
  const isSingleValue = !shape || ['einzelwert', 'verhaeltnis', 'anteil'].includes(shape);
  const baseUnit = (catalogEntry as ActiveCatalogEntry)?.unit ?? '';
  const unit = getEffectiveUnit(baseUnit, selectedTile.query?.transformations);
  const effectiveCatalogEntry = useMemo(
    () => (catalogEntry ? { ...catalogEntry, unit } : { unit }),
    [catalogEntry, unit],
  );

  const currentThreshold = selectedTile.threshold;
  const normalizedInitial = useMemo(
    () => (currentThreshold ? normalizeLegacyThresholdRule(currentThreshold, catalogEntry) : null),
    [currentThreshold, catalogEntry],
  );
  const isLegacy = Boolean(currentThreshold && !isThresholdRuleV2(currentThreshold));

  const [draft, setDraft] = useState<Partial<ThresholdRuleV2>>(() => {
    if (currentThreshold && isThresholdRuleV2(currentThreshold)) return { ...currentThreshold };
    if (normalizedInitial && 'regel' in normalizedInitial) return { ...normalizedInitial.regel };
    return {
      formatVersion: 2,
      enabled: Boolean(currentThreshold?.enabled),
      art: 'hoch_ist_schlecht',
      einheit: unit,
    };
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
    const desc =
      currentThreshold && isThresholdRuleV2(currentThreshold) && currentThreshold.enabled
        ? describeThresholdV2(currentThreshold)
        : null;
    return <ReadOnlyThresholdView description={desc} />;
  }

  const isSavedUnitMismatch = Boolean(
    currentThreshold &&
    isThresholdRuleV2(currentThreshold) &&
    currentThreshold.einheit &&
    currentThreshold.einheit !== unit,
  );

  const cleanedRule = cleanThresholdRule(draft, unit);
  const validation = validateThresholdRuleV2(cleanedRule, effectiveCatalogEntry);
  const isValid = validation.ok;
  const fieldError = !validation.ok
    ? { feld: validation.feld, grund: validation.grund }
    : undefined;
  const isEnabled = Boolean(draft.enabled);

  const previewEval = evaluateThresholdV2(
    cleanedRule,
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
            normalizedInitial={normalizedInitial}
            onReset={() => {
              const r = defaultThresholdRule(unit);
              setDraft(r);
              onTileThresholdChange(selectedTile.id, r);
            }}
          />

          {isSavedUnitMismatch && currentThreshold && isThresholdRuleV2(currentThreshold) && (
            <div
              data-testid="threshold-unit-mismatch-notice"
              className="rounded bg-amber-500/10 p-2 text-[11px] text-amber-300 border border-amber-500/20"
            >
              {THRESHOLD_MESSAGES.einheitenWechsel(currentThreshold.einheit ?? '', unit)}
            </div>
          )}

          <ThresholdArtRadioGroup
            formId={formId}
            art={draft.art ?? 'hoch_ist_schlecht'}
            onChange={(art) => setDraft((p) => cleanThresholdRule({ ...p, art }, unit))}
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
            onClick={() => isValid && onTileThresholdChange(selectedTile.id, cleanedRule)}
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

      <AlarmSection
        selectedTile={selectedTile}
        dashboardId={dashboardId}
        catalogEntry={catalogEntry}
        hasValidRule={isValid && isEnabled}
        isDirty={isDirty}
        canWrite={!isReadOnly}
      />
    </div>
  );
}
