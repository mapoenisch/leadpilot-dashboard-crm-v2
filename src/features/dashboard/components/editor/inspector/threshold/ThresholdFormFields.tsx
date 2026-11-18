import React from 'react';
import type { ThresholdArt, ThresholdRuleV2 } from '../../../../model/thresholdRuleV2';

export const ART_OPTIONS = [
  {
    id: 'hoch_ist_schlecht',
    label: 'Höher ist schlecht',
    desc: 'Warnung bei Überschreitung (z. B. Kosten, Durchlaufzeit)',
  },
  {
    id: 'niedrig_ist_schlecht',
    label: 'Niedriger ist schlecht',
    desc: 'Warnung bei Unterschreitung (z. B. ARR, Marge)',
  },
  { id: 'zielbereich', label: 'Zielbereich', desc: 'Normal im Bereich, Warnung außerhalb' },
] as const;

export function ThresholdArtRadioGroup({
  formId,
  art,
  onChange,
}: {
  formId: string;
  art: ThresholdArt;
  onChange: (art: ThresholdArt) => void;
}) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label="Regelart">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
        Art der Überwachung
      </span>
      {ART_OPTIONS.map((opt) => (
        <label
          key={opt.id}
          className={`flex items-start gap-2 rounded border p-1.5 text-xs cursor-pointer ${
            art === opt.id
              ? 'border-primary/50 bg-primary/10 text-white'
              : 'border-white/5 bg-white/5 text-[var(--color-text-soft)] hover:bg-white/10'
          }`}
        >
          <input
            type="radio"
            name={`${formId}-art`}
            value={opt.id}
            data-testid={`threshold-art-${opt.id}`}
            checked={art === opt.id}
            onChange={() => onChange(opt.id as ThresholdArt)}
            className="mt-0.5 text-primary"
          />
          <div className="space-y-0.5">
            <div className="font-medium">{opt.label}</div>
            <div className="text-[10px] text-[var(--color-text-muted)] leading-tight">
              {opt.desc}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

export interface ThresholdFormFieldsProps {
  art: ThresholdArt;
  rule: Partial<ThresholdRuleV2>;
  unit: string;
  fieldError?: { feld?: string; grund: string };
  onChangeField: (feld: string, value: number | undefined) => void;
  currentValueFormatted?: string | null;
}

function parseGermanNumber(str: string): number | undefined {
  const trimmed = str.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : undefined;
}

function formatGermanNumber(num: number | undefined): string {
  if (num === undefined || !Number.isFinite(num)) return '';
  return String(num).replace('.', ',');
}

export const ThresholdFormFields: React.FC<ThresholdFormFieldsProps> = ({
  art,
  rule,
  unit,
  fieldError,
  onChangeField,
  currentValueFormatted,
}) => {
  const renderNumberInput = (
    fieldKey: keyof ThresholdRuleV2,
    label: string,
    isCritical = false,
  ) => {
    const errorMsg = fieldError?.feld === fieldKey ? fieldError.grund : undefined;
    const val = rule[fieldKey] as number | undefined;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <label
            htmlFor={`threshold-input-${fieldKey}`}
            className={isCritical ? 'text-rose-300 font-medium' : 'text-amber-300 font-medium'}
          >
            {label}
          </label>
          {unit && <span className="text-[10px] text-[var(--color-text-muted)]">({unit})</span>}
        </div>
        <div className="relative">
          <input
            id={`threshold-input-${fieldKey}`}
            data-testid={`threshold-${fieldKey}-input`}
            type="text"
            inputMode="decimal"
            defaultValue={formatGermanNumber(val)}
            key={`${fieldKey}-${val ?? 'empty'}`}
            onBlur={(e) => {
              const parsed = parseGermanNumber(e.target.value);
              onChangeField(fieldKey as string, parsed);
            }}
            onChange={(e) => {
              const parsed = parseGermanNumber(e.target.value);
              onChangeField(fieldKey as string, parsed);
            }}
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={errorMsg ? `threshold-error-${fieldKey}` : undefined}
            className={`h-7 w-full rounded border px-2 text-xs text-white outline-none bg-black/40 ${
              errorMsg
                ? 'border-rose-500 ring-1 ring-rose-500/50'
                : isCritical
                  ? 'border-rose-500/40 focus:border-rose-400'
                  : 'border-amber-500/40 focus:border-amber-400'
            }`}
          />
        </div>
        {errorMsg && (
          <p
            id={`threshold-error-${fieldKey}`}
            data-testid={`threshold-error-${fieldKey}`}
            className="text-[10px] text-rose-400 leading-tight"
          >
            {errorMsg}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {currentValueFormatted && (
        <p className="text-[11px] text-[var(--color-text-muted)] bg-white/5 p-1.5 rounded">
          Aktueller Kachelwert:{' '}
          <span className="text-white font-medium">{currentValueFormatted}</span>
        </p>
      )}

      {art === 'hoch_ist_schlecht' && (
        <div className="grid grid-cols-2 gap-2">
          {renderNumberInput('warnung', 'Warnung ab')}
          {renderNumberInput('kritisch', 'Kritisch ab (optional)', true)}
        </div>
      )}

      {art === 'niedrig_ist_schlecht' && (
        <div className="grid grid-cols-2 gap-2">
          {renderNumberInput('warnung', 'Warnung ab')}
          {renderNumberInput('kritisch', 'Kritisch ab (optional)', true)}
        </div>
      )}

      {art === 'zielbereich' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {renderNumberInput('untenWarnung', 'Warnung unter')}
            {renderNumberInput('obenWarnung', 'Warnung über')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {renderNumberInput('untenKritisch', 'Kritisch unter (opt.)', true)}
            {renderNumberInput('obenKritisch', 'Kritisch über (opt.)', true)}
          </div>
        </div>
      )}
    </div>
  );
};
