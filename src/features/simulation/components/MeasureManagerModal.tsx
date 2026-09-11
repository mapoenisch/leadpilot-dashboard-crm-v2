import React, { useState, useMemo } from 'react';
import { useDraftMeasures, useMeasureActions } from '../../../store/hooks';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Alert } from '../../../components/ui/Alert';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { NumberStepper } from '../../../components/ui/NumberStepper';
import { Table, Column } from '../../../components/ui/Table';
import {
  MEASURE_PARAMETER_KEYS,
  Measure,
  MeasureChange,
  MeasureChangeMode,
  MeasureConflict,
  MeasureKpiDelta,
  MeasureParameterKey,
} from '../../../types/measure';
import { V1_PARAMETER_DEFINITIONS } from '../../../simulation/parameterRegistry';
import { systemContext } from '../../../simulation/systemContext';

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
      })
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
      setPreviewError((err instanceof Error ? err.message : '') || 'Fehler bei der Wirkungsvorschau');
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

  const previewColumns: Column<MeasureKpiDelta>[] = [
    {
      key: 'kpiId',
      label: 'KPI (Kennzahl)',
      render: (row) => <strong>{row.label}</strong>,
    },
    {
      key: 'baseValue',
      label: 'Ohne Maßnahmen',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {row.baseValue.toLocaleString('de-DE')} {row.unit}
        </span>
      ),
    },
    {
      key: 'withMeasuresValue',
      label: 'Mit Maßnahmen',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
          {row.withMeasuresValue.toLocaleString('de-DE')} {row.unit}
        </span>
      ),
    },
    {
      key: 'delta',
      label: 'Delta (Wirkung)',
      render: (row) => {
        const isPos = row.delta >= 0;
        const sign = row.delta > 0 ? '+' : '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Badge variant={isPos ? 'cyan' : 'orange'}>
              {sign}
              {row.delta.toLocaleString('de-DE')} {row.unit}
            </Badge>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              ({sign}
              {row.deltaPercent}%)
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Maßnahmenmanager & Geführte Wirkungskette"
      maxWidth="960px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Aktive Maßnahmen: {draftMeasures.length}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Schließen
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Active Draft Measures List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
              Aktive Maßnahmen im aktuellen Szenario-Entwurf
            </h4>
            <StatusChip variant="neutral" label={`${draftMeasures.length} Maßnahmen`} size="sm" />
          </div>

          {detectedConflicts.length > 0 && (
            <div data-testid="measure-conflict-alert" style={{ marginBottom: 'var(--space-3)' }}>
              <Alert variant="warning" title="Konfliktwarnung (MULTIPLE_SET)">
                <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                  {detectedConflicts.map((c, i) => (
                    <li key={i} style={{ fontSize: '12px' }}>
                      {c.message}
                    </li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          {draftMeasures.length === 0 ? (
            <Card padding="var(--space-3)">
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', padding: 'var(--space-2)' }}>
                Noch keine Maßnahmen für diesen Szenario-Entwurf angelegt.
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {draftMeasures.map((m) => {
                const endTick = m.durationTicks !== undefined ? m.startTick + m.durationTicks : undefined;
                return (
                  <Card key={m.id} padding="var(--space-3)">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>{m.name}</span>
                          <StatusChip variant="cyan" label={`Start: Tick #${m.startTick}`} size="sm" />
                          {m.rampUpTicks ? <StatusChip variant="orange" label={`Ramp-up: ${m.rampUpTicks} Ticks`} size="sm" /> : null}
                          {m.durationTicks ? (
                            <StatusChip variant="neutral" label={`Dauer: ${m.durationTicks} Ticks (bis #${endTick})`} size="sm" />
                          ) : (
                            <StatusChip variant="mint" label="Dauerhaft" size="sm" />
                          )}
                        </div>
                        {m.description && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {m.description}
                          </div>
                        )}
                        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {m.changes.map((c, idx) => {
                            const def = V1_PARAMETER_DEFINITIONS[c.parameter];
                            const modeLabel = c.mode === 'set' ? '=' : c.mode === 'delta' ? (c.value >= 0 ? '+' : '') : '×';
                            const valFormatted = c.mode === 'multiply' ? `${c.value}x` : `${c.value} ${def?.unit || ''}`;
                            return (
                              <span
                                key={idx}
                                style={{
                                  background: 'var(--color-bg-deep)',
                                  border: '1px solid var(--color-border-soft)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '11.5px',
                                }}
                              >
                                <strong>{def?.label || c.parameter}:</strong> {modeLabel} {valFormatted}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => removeDraftMeasure(m.id)}>
                        Löschen
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-2) 0' }} />

        {/* 6-Phase Measure Configuration Form */}
        <div>
          <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
            Geführte 6-Phasen Maßnahmenkonfiguration
          </h4>

          {formError && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Alert variant="error">
                {formError}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSaveMeasure} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Phase 1: Beschreibung */}
            <Card padding="var(--space-3)">
              <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                1. Beschreibung & Zielkontext
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
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
              <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                2. Zeitfenster & Wirkungsverlauf
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
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
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border-soft)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Timeline-Vorschau:</span>
                  <span>
                    Start: Tick {startTick} · Ramp-up: {rampUpTicks} Ticks · Dauer: {durationTicks ? `${durationTicks} Ticks` : 'Dauerhaft'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '14px', background: 'var(--color-bg-deep)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(100, (startTick / 30) * 100)}%`,
                      width: durationTicks ? `${Math.min(100, (parseInt(durationTicks, 10) / 30) * 100)}%` : '100%',
                      height: '100%',
                      background: rampUpTicks > 0
                        ? 'linear-gradient(90deg, var(--color-warning) 0%, var(--color-primary) 50%, var(--color-primary) 100%)'
                        : 'var(--color-primary)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Phase 3 & 4: Treiber & Intensität */}
            <Card padding="var(--space-3)">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  3. Zielparameter (Treiber) & 4. Intensität
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddChange}>
                  + Parameter hinzufügen
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {changes.map((c, idx) => {
                  const def = V1_PARAMETER_DEFINITIONS[c.parameter];
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr)) auto',
                        gap: 'var(--space-2)',
                        alignItems: 'flex-end',
                        background: 'var(--color-bg-deep)',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-soft)',
                      }}
                    >
                      <Select
                        label="Zielparameter (Treiber)"
                        options={parameterSelectOptions}
                        value={c.parameter}
                        onChange={(val) =>
                          handleUpdateChange(idx, { parameter: val as MeasureParameterKey })
                        }
                        sizeVariant="sm"
                      />

                      <Select
                        label="Änderungsmodus"
                        options={modeSelectOptions}
                        value={c.mode}
                        onChange={(val) =>
                          handleUpdateChange(idx, { mode: val as MeasureChangeMode })
                        }
                        sizeVariant="sm"
                      />

                      <NumberStepper
                        label={`Wert (${c.mode === 'multiply' ? 'Faktor x' : def?.unit || ''})`}
                        value={c.value}
                        step={c.mode === 'multiply' ? 0.1 : def?.step || 1}
                        unit={c.mode === 'multiply' ? 'x' : def?.unit}
                        onChange={(val) => handleUpdateChange(idx, { value: val })}
                        sizeVariant="sm"
                      />

                      {changes.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveChange(idx)}
                          style={{ padding: '8px 12px', marginBottom: '2px' }}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Phase 5: Wirkungsvorschau */}
            <Card padding="var(--space-3)">
              <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                5. Side-Effect-Freie Wirkungsvorschau
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSimulatePreview}
                  disabled={isPreviewing || draftMeasures.length === 0}
                  size="sm"
                >
                  {isPreviewing ? 'Simuliere Wirkungsvorschau...' : '⚡ Wirkungsvorschau simulieren'}
                </Button>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  (Führt 2 identische Seed-Läufe aus, vergleicht KPI-Deltas, speichert 0 Runs/Versionen)
                </span>
              </div>

              {previewError && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Alert variant="error" title="Fehler bei Wirkungsvorschau">
                    {previewError}
                  </Alert>
                </div>
              )}

              {previewConflicts.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Alert variant="warning" title="Konfliktwarnungen erkannt">
                    <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                      {previewConflicts.map((conf, idx) => (
                        <li key={idx} style={{ fontSize: '12px' }}>
                          {conf.message}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                </div>
              )}

              {previewDeltas && (
                <div data-testid="measure-preview-delta-table" style={{ marginTop: 'var(--space-3)' }}>
                  <Table columns={previewColumns} rows={previewDeltas} minWidth="550px" />
                </div>
              )}
            </Card>

            {/* Phase 6: Speichern */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button type="submit" variant="primary" style={{ minWidth: '200px' }}>
                6. Maßnahme speichern
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};
