// Executive Dashboard, Teilauftrag 5 (Auftrag 074): zentrale Filter. Eingaben sind ein Entwurf und
// wirken erst mit „Filter anwenden“; Sitzungsfilter gelten nur für diese Sitzung, Startfilter werden
// nur im Bearbeitungsmodus in die Arbeitskopie übernommen und mit „Speichern“ dauerhaft.
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

function pipelineOf(filters: FilterValues | undefined): string {
  return filters?.pipeline ?? '';
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
  const [pipeline, setPipeline] = useState(pipelineOf(value));
  useEffect(() => setPipeline(pipelineOf(value)), [value]);

  const trimmed = pipeline.trim();
  const tooLong = trimmed.length > MAX_PIPELINE_LENGTH;
  const draft: FilterValues | undefined = trimmed ? { pipeline: trimmed } : undefined;
  const changed = trimmed !== pipelineOf(value);
  const differsFromStart = pipelineOf(startFilters) !== pipelineOf(value);

  return (
    <section
      aria-label="Filter"
      data-testid="dashboard-filters"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-solid border-border bg-surface p-3"
    >
      {pipelineSupported ? (
        <div className="min-w-[200px] max-w-full flex-1">
          <Input
            label="Pipeline"
            value={pipeline}
            maxLength={MAX_PIPELINE_LENGTH + 20}
            error={tooLong ? `Höchstens ${MAX_PIPELINE_LENGTH} Zeichen.` : undefined}
            disabled={locked}
            onChange={(event) => setPipeline(event.target.value)}
            aria-describedby={noteId}
          />
        </div>
      ) : (
        <p className="m-0 text-sm text-[var(--color-text-muted)]">
          Keine Kachel dieser Ansicht unterstützt zurzeit einen Filter.
        </p>
      )}
      {pipelineSupported ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={locked || tooLong || !changed} onClick={() => onApply(draft)}>
            Filter anwenden
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={locked || (!value && !pipeline)}
            onClick={() => onApply(undefined)}
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
      ) : null}
      <p id={noteId} className="m-0 basis-full text-[12px] text-[var(--color-text-muted)]">
        Ein Zeitraumfilter ist noch nicht verfügbar: Dafür gibt es kein belegtes Datumsfeld. Filter
        gelten für diese Sitzung{editing ? '; Startfilter erst nach „Speichern“' : ''}.
      </p>
    </section>
  );
}
