// Executive Dashboard, Teilauftrag 5 (Auftrag 074): zentrale Filter. Eingaben sind ein Entwurf und
// wirken erst mit „Filter anwenden“; Sitzungsfilter gelten nur für diese Sitzung, Startfilter werden
// nur im Bearbeitungsmodus in die Arbeitskopie übernommen und mit „Speichern“ dauerhaft. Der
// Zeitraum wird gespeichert und angezeigt, wirkt aber noch nicht (kein belegtes Datumsfeld).
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { DashboardFilters as FilterValues } from '../model/dashboardConfig';

export const MAX_PIPELINE_LENGTH = 64;

export interface DashboardFiltersProps {
  /** Aktuell angewendete Sitzungsfilter. */
  value: FilterValues | undefined;
  /** Dauerhaft gespeicherte Startfilter der Ansicht (Arbeitskopie im Bearbeiten). */
  startFilters: FilterValues | undefined;
  editing: boolean;
  locked: boolean;
  /** Mindestens eine Kachel unterstützt den Pipeline-Filter. */
  pipelineSupported: boolean;
  onApply: (filters: FilterValues | undefined) => void;
  onStartFilters: (filters: FilterValues | undefined) => void;
}

interface Fields {
  pipeline: string;
  from: string;
  to: string;
}

const fieldsOf = (filters: FilterValues | undefined): Fields => ({
  pipeline: filters?.pipeline ?? '',
  from: filters?.period?.from ?? '',
  to: filters?.period?.to ?? '',
});
const keyOf = (fields: Fields) => `${fields.pipeline.trim()}|${fields.from}|${fields.to}`;

/** Filterwerte aus den Feldern; `undefined`, wenn nichts gesetzt ist. */
function valuesOf(fields: Fields): FilterValues | undefined {
  const pipeline = fields.pipeline.trim();
  const filters: FilterValues = {
    ...(pipeline ? { pipeline } : {}),
    ...(fields.from && fields.to ? { period: { from: fields.from, to: fields.to } } : {}),
  };
  return Object.keys(filters).length > 0 ? filters : undefined;
}

function problemOf(fields: Fields): string {
  if (fields.pipeline.trim().length > MAX_PIPELINE_LENGTH) {
    return `Pipeline: höchstens ${MAX_PIPELINE_LENGTH} Zeichen.`;
  }
  if (Boolean(fields.from) !== Boolean(fields.to))
    return 'Zeitraum: „Von“ und „Bis“ zusammen angeben.';
  if (fields.from > fields.to && fields.to) return 'Zeitraum: „Von“ darf nicht nach „Bis“ liegen.';
  return '';
}

export function DashboardFilters({
  value,
  startFilters,
  editing,
  locked,
  pipelineSupported,
  onApply,
  onStartFilters,
}: DashboardFiltersProps) {
  const noteId = useId();
  const errorId = useId();
  const [fields, setFields] = useState(fieldsOf(value));
  useEffect(() => setFields(fieldsOf(value)), [value]);
  const set = (patch: Partial<Fields>) => setFields((current) => ({ ...current, ...patch }));

  const problem = problemOf(fields);
  const draft = valuesOf(fields);
  const canApply = !locked && !problem && keyOf(fields) !== keyOf(fieldsOf(value));
  const differsFromStart = keyOf(fieldsOf(startFilters)) !== keyOf(fieldsOf(value));
  const describedBy = problem ? `${errorId} ${noteId}` : noteId;

  return (
    <form
      aria-label="Filter"
      data-testid="dashboard-filters"
      onSubmit={(event) => {
        // Enter im Feld wendet an, solange „Filter anwenden“ möglich ist.
        event.preventDefault();
        if (canApply) onApply(draft);
      }}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-solid border-border bg-surface p-3"
    >
      {pipelineSupported ? (
        <div className="min-w-[200px] max-w-full flex-1">
          <Input
            label="Pipeline"
            value={fields.pipeline}
            maxLength={MAX_PIPELINE_LENGTH + 20}
            error={fields.pipeline.trim().length > MAX_PIPELINE_LENGTH}
            disabled={locked}
            onChange={(event) => set({ pipeline: event.target.value })}
            aria-invalid={problem.startsWith('Pipeline') || undefined}
            aria-describedby={describedBy}
          />
        </div>
      ) : (
        <p className="m-0 text-sm text-[var(--color-text-muted)]">
          Keine Kachel dieser Ansicht unterstützt einen Pipeline-Filter.
        </p>
      )}
      <div className="w-[150px] max-w-full">
        <Input
          label="Von"
          type="date"
          value={fields.from}
          disabled={locked}
          onChange={(event) => set({ from: event.target.value })}
          aria-invalid={problem.startsWith('Zeitraum') || undefined}
          aria-describedby={describedBy}
        />
      </div>
      <div className="w-[150px] max-w-full">
        <Input
          label="Bis"
          type="date"
          value={fields.to}
          disabled={locked}
          onChange={(event) => set({ to: event.target.value })}
          aria-invalid={problem.startsWith('Zeitraum') || undefined}
          aria-describedby={describedBy}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="submit" disabled={!canApply}>
          Filter anwenden
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={locked || (!value && keyOf(fields) === '||')}
          onClick={() => {
            // Auch eine noch nicht angewendete Eingabe leeren (der Prop bleibt dann unverändert).
            setFields(fieldsOf(undefined));
            onApply(undefined);
          }}
        >
          Filter zurücksetzen
        </Button>
        {editing ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={locked || !value || !differsFromStart}
              onClick={() => onStartFilters(value)}
            >
              Als Startfilter übernehmen
            </Button>
            {/* Ein verwaister Startfilter (keine passende Kachel mehr) bleibt entfernbar. */}
            <Button
              size="sm"
              variant="secondary"
              disabled={locked || !startFilters}
              onClick={() => onStartFilters(undefined)}
            >
              Startfilter entfernen
            </Button>
          </>
        ) : null}
      </div>
      {problem ? (
        <p id={errorId} role="alert" className="m-0 basis-full text-[12px] text-error">
          {problem}
        </p>
      ) : null}
      <p id={noteId} className="m-0 basis-full text-[12px] text-[var(--color-text-muted)]">
        Der Zeitraum wird gespeichert, wirkt aber noch nicht: Dafür gibt es kein belegtes
        Datumsfeld. Filter gelten für diese Sitzung
        {editing ? '; Startfilter erst nach „Speichern“' : ''}.
      </p>
    </form>
  );
}
