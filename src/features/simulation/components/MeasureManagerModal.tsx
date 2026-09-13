import React, { useState, useMemo } from 'react';
import { useDraftMeasures, useMeasureActions } from '../../../store/hooks';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { NumberStepper } from '../../../components/ui/NumberStepper';
import {
  Measure,
  MeasureChange,
  MeasureConflict,
  MeasureKpiDelta,
  MeasureParameterKey,
} from '../../../types/measure';
import { V1_PARAMETER_DEFINITIONS } from '../../../simulation/parameterRegistry';
import { systemContext } from '../../../simulation/systemContext';
import { MeasureActiveList } from './MeasureActiveList';
import { MeasureChangesEditor } from './MeasureChangesEditor';
import { MeasurePreviewSection } from './MeasurePreviewSection';

interface MeasureManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeasureManagerModal: React.FC<MeasureManagerModalProps> = ({ isOpen, onClose }) => {
  const draftMeasures = useDraftMeasures();
  const { addDraftMeasure, removeDraftMeasure, previewMeasures } = useMeasureActions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startTick, setStartTick] = useState<number>(0);
  const [durationTicks, setDurationTicks] = useState<string>('');
  const [rampUpTicks, setRampUpTicks] = useState<number>(0);
  const [changes, setChanges] = useState<MeasureChange[]>([
    { parameter: 'salesRepCount', mode: 'set', value: 4 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewDeltas, setPreviewDeltas] = useState<MeasureKpiDelta[] | null>(null);
  const [previewConflicts, setPreviewConflicts] = useState<MeasureConflict[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Check real-time conflicts among draft measures
  const detectedConflicts = useMemo(() => {
    const conflicts: { parameter: string; message: string }[] = [];
    const setMeasuresByParam: Record<string, Measure[]> = {};
    for (const m of draftMeasures) {
      for (const ch of m.changes) {
        if (ch.mode === 'set') {
          if (!setMeasuresByParam[ch.parameter]) {
            setMeasuresByParam[ch.parameter] = [];
          }
          setMeasuresByParam[ch.parameter].push(m);
        }
      }
    }
    for (const [param, mList] of Object.entries(setMeasuresByParam)) {
      if (mList.length > 1) {
        const def = V1_PARAMETER_DEFINITIONS[param as MeasureParameterKey];
        conflicts.push({
          parameter: param,
          message: `Konflikt erkannt: Mehrere Maßnahmen setzen den Parameter „${def?.label || param}" absolut (Modus SET).`,
        });
      }
    }
    return conflicts;
  }, [draftMeasures]);

  const handleAddChange = () => {
    setChanges([...changes, { parameter: 'marketingBudgetYearly', mode: 'delta', value: 10000 }]);
  };

  const handleRemoveChange = (index: number) => {
    if (changes.length <= 1) return;
    setChanges(changes.filter((_, i) => i !== index));
  };

  const handleUpdateChange = (index: number, updated: Partial<MeasureChange>) => {
    setChanges(
      changes.map((c, i) => {
        if (i !== index) return c;
        const merged = { ...c, ...updated };
        if (updated.parameter && updated.parameter !== c.parameter) {
          const def = V1_PARAMETER_DEFINITIONS[updated.parameter];
          if (def) {
            merged.value = def.defaultValue;
          }
        }
        return merged;
      }),
    );
  };

  const handleSimulatePreview = async () => {
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const result = await previewMeasures(draftMeasures, 50);
      setPreviewDeltas(result.kpiDeltas);
      setPreviewConflicts(result.conflicts);
    } catch (err) {
      setPreviewError(
        (err instanceof Error ? err.message : '') || 'Fehler bei der Wirkungsvorschau',
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSaveMeasure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Bitte geben Sie einen Namen für die Maßnahme ein.');
      return;
    }

    if (changes.length === 0) {
      setFormError('Bitte fügen Sie mindestens eine Parameteränderung hinzu.');
      return;
    }

    const durationNum = durationTicks.trim() !== '' ? parseInt(durationTicks, 10) : undefined;
    if (durationNum !== undefined && (isNaN(durationNum) || durationNum <= 0)) {
      setFormError('Die Dauer muss eine positive Zahl von Ticks sein.');
      return;
    }

    const newMeasure: Measure = {
      id: `measure-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      startTick,
      durationTicks: durationNum,
      rampUpTicks: rampUpTicks > 0 ? rampUpTicks : undefined,
      changes,
      createdAt: systemContext.now(),
    };

    addDraftMeasure(newMeasure);

    // Reset Form
    setName('');
    setDescription('');
    setStartTick(0);
    setDurationTicks('');
    setRampUpTicks(0);
    setChanges([{ parameter: 'salesRepCount', mode: 'set', value: 4 }]);
    setFormError(null);
    setPreviewDeltas(null);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Maßnahmenmanager & Geführte Wirkungskette"
      maxWidth="960px"
      footer={
        <div className="flex justify-between w-full items-center">
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Aktive Maßnahmen: {draftMeasures.length}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Schließen
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--space-4)]">
        {/* Active Draft Measures List */}
        <MeasureActiveList
          draftMeasures={draftMeasures}
          detectedConflicts={detectedConflicts}
          onRemoveMeasure={removeDraftMeasure}
        />

        <hr className="border-0 border-t border-solid border-border my-[var(--space-2)] mx-0" />

        {/* 6-Phase Measure Configuration Form */}
        <div>
          <h4 className="text-[15px] font-semibold text-text mt-0 mb-[var(--space-3)] mr-0 ml-0">
            Geführte 6-Phasen Maßnahmenkonfiguration
          </h4>

          {formError && (
            <div className="mb-[var(--space-3)]">
              <Alert variant="error">{formError}</Alert>
            </div>
          )}

          <form onSubmit={handleSaveMeasure} className="flex flex-col gap-[var(--space-4)]">
            {/* Phase 1: Beschreibung */}
            <Card padding="var(--space-3)">
              <div className="text-[12px] font-semibold uppercase mb-[8px] text-primary">
                1. Beschreibung & Zielkontext
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[var(--space-3)]">
                <Input
                  label="Name der Maßnahme *"
                  placeholder="z. B. Sales-Team Verdopplung"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  sizeVariant="sm"
                  helperText="Eindeutige Bezeichnung der Steuerungsmaßnahme."
                />
                <Input
                  label="Beschreibung (optional)"
                  placeholder="z. B. Zusätzliche Vertriebsoffensive in Q2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  sizeVariant="sm"
                  helperText="Strategische Begründung oder Kontext."
                />
              </div>
            </Card>

            {/* Phase 2: Zeitfenster & Visuelle Timeline */}
            <Card padding="var(--space-3)">
              <div className="text-[12px] font-semibold uppercase mb-[8px] text-primary">
                2. Zeitfenster & Wirkungsverlauf
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[var(--space-3)]">
                <NumberStepper
                  label="Start (Tick #)"
                  value={startTick}
                  min={0}
                  max={300}
                  unit="Ticks"
                  onChange={setStartTick}
                  sizeVariant="sm"
                  helperText="Zeitpunkt der Maßnahmenaktivierung."
                />
                <NumberStepper
                  label="Ramp-up (Ticks)"
                  value={rampUpTicks}
                  min={0}
                  max={100}
                  unit="Ticks"
                  onChange={setRampUpTicks}
                  sizeVariant="sm"
                  helperText="0 = sofortige volle Wirkung."
                />
                <Input
                  label="Dauer (Ticks, leer = dauerhaft)"
                  type="number"
                  placeholder="dauerhaft"
                  value={durationTicks}
                  onChange={(e) => setDurationTicks(e.target.value)}
                  sizeVariant="sm"
                  helperText="Laufzeit in Ticks oder dauerhaft wirksam."
                />
              </div>

              {/* Visual Timeline Bar Preview */}
              <div className="border-0 border-t border-solid border-border-soft mt-[12px] pt-[10px]">
                <div className="flex justify-between text-[11px] mb-[4px] text-[var(--color-text-muted)]">
                  <span>Timeline-Vorschau:</span>
                  <span>
                    Start: Tick {startTick} · Ramp-up: {rampUpTicks} Ticks · Dauer:{' '}
                    {durationTicks ? `${durationTicks} Ticks` : 'Dauerhaft'}
                  </span>
                </div>
                <div className="w-full h-[14px] rounded bg-background-deep relative overflow-hidden">
                  <div
                    className="absolute h-full rounded-[2px]"
                    // G39 Welle 3: Balkenposition/-breite/-verlauf aus
                    // Formular-State (berechnet) — als Klasse nicht
                    // darstellbar (Entscheidung 2).
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Timeline-Balken aus State), siehe Auftrag 056 Entscheidung 2
                    style={{
                      left: `${Math.min(100, (startTick / 30) * 100)}%`,
                      width: durationTicks
                        ? `${Math.min(100, (parseInt(durationTicks, 10) / 30) * 100)}%`
                        : '100%',
                      background:
                        rampUpTicks > 0
                          ? 'linear-gradient(90deg, var(--color-warning) 0%, var(--color-primary) 50%, var(--color-primary) 100%)'
                          : 'var(--color-primary)',
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Phase 3 & 4: Treiber & Intensität */}
            <MeasureChangesEditor
              changes={changes}
              onAddChange={handleAddChange}
              onRemoveChange={handleRemoveChange}
              onUpdateChange={handleUpdateChange}
            />

            {/* Phase 5: Wirkungsvorschau */}
            <MeasurePreviewSection
              isPreviewing={isPreviewing}
              draftMeasuresCount={draftMeasures.length}
              onSimulatePreview={handleSimulatePreview}
              previewError={previewError}
              previewConflicts={previewConflicts}
              previewDeltas={previewDeltas}
            />

            {/* Phase 6: Speichern */}
            <div className="flex justify-end mt-[var(--space-2)]">
              <Button
                type="submit"
                variant="primary"
                // G39 Welle 3: statische Breite als Klasse via Block-A-Merge.
                className="min-w-[200px]"
              >
                6. Maßnahme speichern
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};
