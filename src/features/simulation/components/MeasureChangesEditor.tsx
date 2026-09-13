import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { NumberStepper } from '../../../components/ui/NumberStepper';
import {
  MEASURE_PARAMETER_KEYS,
  MeasureChange,
  MeasureChangeMode,
  MeasureParameterKey,
} from '../../../types/measure';
import { V1_PARAMETER_DEFINITIONS } from '../../../simulation/parameterRegistry';

interface MeasureChangesEditorProps {
  changes: MeasureChange[];
  onAddChange: () => void;
  onRemoveChange: (index: number) => void;
  onUpdateChange: (index: number, updated: Partial<MeasureChange>) => void;
}

const parameterSelectOptions = MEASURE_PARAMETER_KEYS.map((k) => {
  const def = V1_PARAMETER_DEFINITIONS[k];
  return {
    value: k,
    label: `${def?.label || k} (${def?.unit || ''})`,
  };
});

const modeSelectOptions = [
  { value: 'set', label: 'Festsetzen (= Wert)' },
  { value: 'delta', label: 'Delta / Erhöhen (+/-)' },
  { value: 'multiply', label: 'Multiplizieren (x Faktor)' },
];

export const MeasureChangesEditor: React.FC<MeasureChangesEditorProps> = ({
  changes,
  onAddChange,
  onRemoveChange,
  onUpdateChange,
}) => {
  return (
    <Card padding="var(--space-3)">
      <div className="flex justify-between items-center mb-[8px]">
        <div className="text-[12px] font-semibold uppercase text-primary">
          3. Zielparameter (Treiber) & 4. Intensität
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onAddChange}>
          + Parameter hinzufügen
        </Button>
      </div>

      <div className="flex flex-col gap-[var(--space-3)]">
        {changes.map((c, idx) => {
          const def = V1_PARAMETER_DEFINITIONS[c.parameter];
          return (
            <div
              key={idx}
              className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))_auto] gap-[var(--space-2)] items-end rounded-md border border-solid border-border-soft bg-background-deep p-[10px]"
            >
              <Select
                label="Zielparameter (Treiber)"
                options={parameterSelectOptions}
                value={c.parameter}
                onChange={(val) => onUpdateChange(idx, { parameter: val as MeasureParameterKey })}
                sizeVariant="sm"
              />

              <Select
                label="Änderungsmodus"
                options={modeSelectOptions}
                value={c.mode}
                onChange={(val) => onUpdateChange(idx, { mode: val as MeasureChangeMode })}
                sizeVariant="sm"
              />

              <NumberStepper
                label={`Wert (${c.mode === 'multiply' ? 'Faktor x' : def?.unit || ''})`}
                value={c.value}
                step={c.mode === 'multiply' ? 0.1 : def?.step || 1}
                unit={c.mode === 'multiply' ? 'x' : def?.unit}
                onChange={(val) => onUpdateChange(idx, { value: val })}
                sizeVariant="sm"
              />

              {changes.length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => onRemoveChange(idx)}
                  className="px-[12px] py-[8px] mb-[2px]"
                >
                  ✕
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
