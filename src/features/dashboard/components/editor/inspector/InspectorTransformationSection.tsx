// Executive Dashboard V2 (Auftrag 169): Kachel-Inspector Abschnitt „Umformen“.
import { useState } from 'react';
import type { ActiveCatalogEntry, CatalogEntry } from '../../../model/dashboardCatalog';
import type { DashboardTileConfigV2 } from '../../../model/dashboardConfigV2';
import type { TileData } from '../../../data/dashboardData';
import {
  UNIT_CONVERSIONS,
  getTransformationAlarmCapability,
  isTransformationChainAlarmPermitted,
  applyTransformations,
  getEffectiveUnit,
  type TileTransformation,
  type TransformationArt,
} from '../../../model/transformations';
import { formatTileValue } from '../../tileFormat';

const MAX_STEPS = 3;
const fmtOperand = (c: (typeof UNIT_CONVERSIONS)[number]) =>
  c.operation === 'divide' ? `÷ ${c.operand === 1000 ? '1.000' : '1.000.000'}` : `× ${c.operand}`;

export interface InspectorTransformationSectionProps {
  selectedTile: DashboardTileConfigV2;
  catalogEntry?: ActiveCatalogEntry | CatalogEntry;
  onChangeTransformations: (next: TileTransformation[] | undefined) => void;
  currentData?: TileData;
}

export function InspectorTransformationSection({
  selectedTile,
  catalogEntry,
  onChangeTransformations,
  currentData,
}: InspectorTransformationSectionProps) {
  const [selectedArtToAdd, setSelectedArtToAdd] = useState<TransformationArt>('umbenennen');
  const [isAdding, setIsAdding] = useState(false);

  const kette: TileTransformation[] = selectedTile.query?.transformations ?? [];
  const baseUnit = (catalogEntry as ActiveCatalogEntry)?.unit ?? '';
  const isTimeSeries = (catalogEntry as ActiveCatalogEntry)?.history?.kind === 'ereignisse';

  const chainAlarm = isTransformationChainAlarmPermitted(kette);
  const hasAlarmConfigured = Boolean(
    selectedTile.alarm?.status === 'aktiv' ||
    selectedTile.alarm?.status === 'pausiert' ||
    selectedTile.threshold?.enabled,
  );
  const showAlarmWarning = hasAlarmConfigured && !chainAlarm.alarmfaehig;
  const currentUnit = getEffectiveUnit(baseUnit, kette);

  const previewBefore = currentData;
  const previewAfter = currentData ? applyTransformations(currentData, kette) : undefined;

  const handleAddStep = (art: TransformationArt) => {
    if (kette.length >= MAX_STEPS) return;
    let newStep: TileTransformation;
    if (art === 'umbenennen') {
      newStep = { art: 'umbenennen', name: selectedTile.title || catalogEntry?.name || 'Kachel' };
    } else if (art === 'einheit_umrechnen') {
      const match = UNIT_CONVERSIONS.find((c) => c.von === currentUnit);
      newStep = { art: 'einheit_umrechnen', von: match?.von ?? 'EUR', zu: match?.zu ?? 'Tsd. EUR' };
    } else {
      newStep = { art: 'gleitender_durchschnitt', fenster: 7 };
    }
    onChangeTransformations([...kette, newStep]);
    setIsAdding(false);
  };

  const handleRemoveStep = (index: number) => {
    const next = kette.filter((_, i) => i !== index);
    onChangeTransformations(next.length > 0 ? next : undefined);
  };

  const handleMoveStep = (from: number, to: number) => {
    if (to < 0 || to >= kette.length) return;
    const next = [...kette];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChangeTransformations(next);
  };

  const handleUpdateStep = (index: number, updated: TileTransformation) => {
    const next = [...kette];
    next[index] = updated;
    onChangeTransformations(next);
  };

  return (
    <div
      data-testid="inspector-transformation-section"
      className="space-y-3 rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-2.5 text-xs"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-white">Umformen</span>
          <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)]">
            ({kette.length}/{MAX_STEPS} Schritte)
          </span>
        </div>
        {kette.length < MAX_STEPS && !isAdding && (
          <button
            type="button"
            data-testid="add-transformation-btn"
            onClick={() => setIsAdding(true)}
            className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-primary hover:bg-primary/20"
          >
            + Schritt hinzufügen
          </button>
        )}
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)] leading-tight m-0">
        Kette statt Formel: Bis zu 3 Schritte in fester Reihenfolge.
      </p>

      {showAlarmWarning && (
        <div
          data-testid="transformation-alarm-warning"
          className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200"
        >
          <strong>Achtung:</strong> Der Alarm dieser Kachel wird pausiert. (
          {chainAlarm.grund ?? 'Transformation ist nicht alarmfähig.'})
        </div>
      )}

      {kette.length > 0 && (
        <div className="space-y-2">
          {kette.map((step, idx) => {
            const cap = getTransformationAlarmCapability(step);
            return (
              <div
                key={idx}
                data-testid={`transformation-step-${idx}`}
                className="rounded border border-white/10 bg-black/40 p-2 space-y-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-white capitalize">
                      {step.art.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid={`transformation-move-up-${idx}`}
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, idx - 1)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Nach oben verschieben"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      data-testid={`transformation-move-down-${idx}`}
                      disabled={idx === kette.length - 1}
                      onClick={() => handleMoveStep(idx, idx + 1)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Nach unten verschieben"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      data-testid={`transformation-remove-${idx}`}
                      onClick={() => handleRemoveStep(idx)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/20"
                      title="Schritt entfernen"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {step.art === 'umbenennen' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--color-text-muted)]">
                      Neuer Anzeigename (max. 60 Zeichen):
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      data-testid={`transformation-name-${idx}`}
                      value={step.name}
                      onChange={(e) =>
                        handleUpdateStep(idx, { art: 'umbenennen', name: e.target.value })
                      }
                      className="h-7 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
                    />
                    <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                      Ändert nur den Anzeigenamen einer Serie oder des Werts.
                    </p>
                  </div>
                )}

                {step.art === 'einheit_umrechnen' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--color-text-muted)]">
                      Umrechnung wählen:
                    </label>
                    <select
                      data-testid={`transformation-conversion-${idx}`}
                      value={`${step.von}:::${step.zu}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(':::');
                        const von = parts[0];
                        const zu = parts[1];
                        if (von && zu) {
                          handleUpdateStep(idx, { art: 'einheit_umrechnen', von, zu });
                        }
                      }}
                      className="h-7 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
                    >
                      {UNIT_CONVERSIONS.map((c) => (
                        <option
                          key={c.id}
                          value={`${c.von}:::${c.zu}`}
                          className="bg-[var(--color-bg-deep,#051413)]"
                        >
                          {c.von} → {c.zu} ({fmtOperand(c)})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                      Rechnet Werte und Schwellenwerte anhand fester Faktoren um.
                    </p>
                  </div>
                )}

                {step.art === 'gleitender_durchschnitt' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--color-text-muted)]">
                      Fenstergröße (2–30 Punkte, nachlaufend):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        max={30}
                        data-testid={`transformation-fenster-${idx}`}
                        value={step.fenster}
                        onChange={(e) => {
                          const val = Math.max(2, Math.min(30, parseInt(e.target.value, 10) || 2));
                          handleUpdateStep(idx, { art: 'gleitender_durchschnitt', fenster: val });
                        }}
                        className="h-7 w-20 rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
                      />
                      <span className="text-[10.5px] text-[var(--color-text-muted)]">Punkte</span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                      Glättet Zeitreihen nachlaufend. Lücken bleiben erhalten.
                    </p>
                  </div>
                )}

                <div className="pt-1 border-t border-white/5">
                  <span
                    data-testid={`transformation-alarm-badge-${idx}`}
                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${
                      cap.alarmfaehig
                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {cap.alarmfaehig ? 'Alarm möglich' : `Kein Alarm möglich: ${cap.grund}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdding && (
        <div className="rounded border border-primary/30 bg-black/30 p-2 space-y-2">
          <label className="text-[10.5px] font-semibold text-white">Art auswählen:</label>
          <div className="space-y-1.5">
            <label className="flex items-start gap-2 cursor-pointer text-[11px] text-white">
              <input
                type="radio"
                name="art_choice"
                value="umbenennen"
                checked={selectedArtToAdd === 'umbenennen'}
                onChange={() => setSelectedArtToAdd('umbenennen')}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">Umbenennen</span>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                  Ändert nur den Anzeigenamen einer Serie oder des Werts.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer text-[11px] text-white">
              <input
                type="radio"
                name="art_choice"
                value="einheit_umrechnen"
                checked={selectedArtToAdd === 'einheit_umrechnen'}
                onChange={() => setSelectedArtToAdd('einheit_umrechnen')}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">Einheit umrechnen</span>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                  Feste Positivliste (z. B. EUR in Tsd. EUR).
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-2 text-[11px] ${
                isTimeSeries
                  ? 'cursor-pointer text-white'
                  : 'opacity-40 cursor-not-allowed text-white/50'
              }`}
            >
              <input
                type="radio"
                name="art_choice"
                value="gleitender_durchschnitt"
                disabled={!isTimeSeries}
                checked={selectedArtToAdd === 'gleitender_durchschnitt'}
                onChange={() => setSelectedArtToAdd('gleitender_durchschnitt')}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">Gleitender Durchschnitt</span>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">
                  Glättet Zeitreihen nachlaufend (2–30 Punkte).
                </p>
                {!isTimeSeries && (
                  <p
                    data-testid="transformation-disabled-durchschnitt"
                    className="text-[9.5px] text-rose-300 m-0"
                  >
                    Gesperrt: Nur für Zeitreihen verfügbar.
                  </p>
                )}
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded px-2 py-0.5 text-[10.5px] text-[var(--color-text-muted)] hover:bg-white/10"
            >
              Abbrechen
            </button>
            <button
              type="button"
              data-testid="confirm-add-transformation-btn"
              onClick={() => handleAddStep(selectedArtToAdd)}
              className="rounded bg-primary px-2.5 py-0.5 text-[10.5px] font-semibold text-black hover:bg-primary/90"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      {kette.length > 0 && (
        <div
          data-testid="transformation-preview"
          className="border-t border-white/5 pt-2 text-[10.5px] text-[var(--color-text-muted)] space-y-1"
        >
          <div className="font-medium text-white">Vorschau:</div>
          <div className="flex items-center justify-between">
            <span>Vorher:</span>
            <span className="text-white font-mono">
              {previewBefore && 'value' in previewBefore && previewBefore.value != null
                ? formatTileValue(previewBefore.value, baseUnit, 'exakt')
                : baseUnit || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Nachher:</span>
            <span className="text-teal-300 font-mono font-medium">
              {previewAfter && 'value' in previewAfter && previewAfter.value != null
                ? formatTileValue(previewAfter.value, currentUnit, 'exakt')
                : currentUnit || '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
