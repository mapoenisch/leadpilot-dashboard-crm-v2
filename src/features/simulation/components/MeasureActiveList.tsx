import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Alert } from '../../../components/ui/Alert';
import { Measure } from '../../../types/measure';
import { V1_PARAMETER_DEFINITIONS } from '../../../simulation/parameterRegistry';

interface MeasureActiveListProps {
  draftMeasures: Measure[];
  detectedConflicts: { parameter: string; message: string }[];
  onRemoveMeasure: (id: string) => void;
}

export const MeasureActiveList: React.FC<MeasureActiveListProps> = ({
  draftMeasures,
  detectedConflicts,
  onRemoveMeasure,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-[var(--space-2)]">
        <h4 className="m-0 text-[15px] font-semibold text-text">
          Aktive Maßnahmen im aktuellen Szenario-Entwurf
        </h4>
        <StatusChip variant="neutral" label={`${draftMeasures.length} Maßnahmen`} size="sm" />
      </div>

      {detectedConflicts.length > 0 && (
        <div data-testid="measure-conflict-alert" className="mb-[var(--space-3)]">
          <Alert variant="warning" title="Konfliktwarnung (MULTIPLE_SET)">
            <ul className="m-0 pl-[var(--space-4)]">
              {detectedConflicts.map((c, i) => (
                <li key={i} className="text-[12px]">
                  {c.message}
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      {draftMeasures.length === 0 ? (
        <Card padding="var(--space-3)">
          <div className="text-center text-[13px] p-[var(--space-2)] text-[var(--color-text-muted)]">
            Noch keine Maßnahmen für diesen Szenario-Entwurf angelegt.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-[var(--space-2)]">
          {draftMeasures.map((m) => {
            const endTick = m.durationTicks !== undefined ? m.startTick + m.durationTicks : undefined;
            return (
              <Card key={m.id} padding="var(--space-3)">
                <div className="flex justify-between items-start flex-wrap gap-[8px]">
                  <div>
                    <div className="flex items-center gap-[var(--space-2)] flex-wrap">
                      <span className="font-semibold text-[14px] text-text">{m.name}</span>
                      <StatusChip variant="cyan" label={`Start: Tick #${m.startTick}`} size="sm" />
                      {m.rampUpTicks ? <StatusChip variant="orange" label={`Ramp-up: ${m.rampUpTicks} Ticks`} size="sm" /> : null}
                      {m.durationTicks ? (
                        <StatusChip variant="neutral" label={`Dauer: ${m.durationTicks} Ticks (bis #${endTick})`} size="sm" />
                      ) : (
                        <StatusChip variant="mint" label="Dauerhaft" size="sm" />
                      )}
                    </div>
                    {m.description && (
                      <div className="text-[12px] mt-[4px] text-[var(--color-text-muted)]">
                        {m.description}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-[6px] mt-[6px]">
                      {m.changes.map((c, idx) => {
                        const def = V1_PARAMETER_DEFINITIONS[c.parameter];
                        const modeLabel = c.mode === 'set' ? '=' : c.mode === 'delta' ? (c.value >= 0 ? '+' : '') : '×';
                        const valFormatted = c.mode === 'multiply' ? `${c.value}x` : `${c.value} ${def?.unit || ''}`;
                        return (
                          <span
                            key={idx}
                            className="rounded border border-solid border-border-soft bg-background-deep text-[11.5px] px-[8px] py-[2px]"
                          >
                            <strong>{def?.label || c.parameter}:</strong> {modeLabel} {valFormatted}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => onRemoveMeasure(m.id)}>
                    Löschen
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
