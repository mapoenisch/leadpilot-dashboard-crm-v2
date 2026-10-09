// Executive Dashboard, Teilauftrag 5 (Auftrag 074): zentrale Filter. Eingaben sind ein Entwurf und
// wirken erst mit „Filter anwenden“; Sitzungsfilter gelten nur für diese Sitzung, Startfilter werden
// nur im Bearbeitungsmodus in die Arbeitskopie übernommen und mit „Speichern“ dauerhaft.
// Auftrag 086 (Paket C): Von/Bis sind ausgeblendet, weil keine Quelle einen Zeitraum filtert. Ein
// gespeicherter Zeitraum bleibt unverändert erhalten und sichtbar; entfernt wird er nur bewusst
// („Filter zurücksetzen“, „Startfilter entfernen“). Mobil ist der Bereich zunächst zu; der Knopf
// nennt die angewendeten, wirksamen Filter. Auf- und Zuklappen ändert weder Entwurf noch Filter.
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { DashboardFilters as FilterValues } from '../model/dashboardConfig';
import { formatPeriod } from './tileFormat';

export const MAX_PIPELINE_LENGTH = 64;

export interface DashboardFiltersProps {
  /** Aktuell angewendete Sitzungsfilter. */
  value: FilterValues | undefined;
  /** Dauerhaft gespeicherte Startfilter der Ansicht (Arbeitskopie im Bearbeiten). */
  startFilters: FilterValues | undefined;
  editing: boolean;
  locked: boolean;
  /** Mindestens eine Kachel ohne eigene Pipeline unterstützt den zentralen Pipeline-Filter. */
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

/** Filterwerte aus den Feldern; `undefined`, wenn nichts gesetzt ist. Ein gespeicherter Zeitraum fährt mit. */
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
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(fieldsOf(value));
  useEffect(() => setFields(fieldsOf(value)), [value]);
  const set = (patch: Partial<Fields>) => setFields((current) => ({ ...current, ...patch }));

  // Ein ausgeblendetes Pipeline-Feld (keine passende Kachel) zählt nicht mehr: weder für Prüfung noch Anwenden.
  const mask = (f: Fields): Fields => (pipelineSupported ? f : { ...f, pipeline: '' });
  const effective = mask(fields);
  const problem = problemOf(effective);
  const draft = valuesOf(effective);
  const canApply = !locked && !problem && keyOf(effective) !== keyOf(mask(fieldsOf(value)));
  const differsFromStart = keyOf(fieldsOf(startFilters)) !== keyOf(fieldsOf(value));
  const describedBy = problem ? `${errorId} ${noteId}` : noteId;
  // Nur wirksame Filter zählen: heute allein die Pipeline, sofern eine Kachel sie unterstützt.
  const activeCount = pipelineSupported && value?.pipeline ? 1 : 0;
  const savedPeriod = value?.period ?? startFilters?.period;

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant="secondary"
        className="self-start md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="dashboard-filters-toggle"
        onClick={() => setOpen((current) => !current)}
      >
        {activeCount > 0 ? `Filter: ${activeCount} aktiv` : 'Filter'}
      </Button>
      <form
        id={panelId}
        aria-label="Filter"
        data-testid="dashboard-filters"
        onSubmit={(event) => {
          // Enter im Feld wendet an, solange „Filter anwenden“ möglich ist.
          event.preventDefault();
          if (canApply) onApply(draft);
        }}
        className={`${open ? 'flex' : 'hidden'} flex-wrap items-end gap-3 rounded-xl border border-solid border-border bg-surface p-3 md:flex`}
      >
        {/* Feld und Hinweis teilen denselben Platz: Wechselt die Unterstützung (Laden der gespeicherten
            Ansicht, CRM-Kachel hinzugefügt/entfernt), bleibt die Zeile gleich (Auftrag 079, CLS). */}
        <div className="min-w-[200px] max-w-full flex-1">
          {pipelineSupported ? (
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
          ) : (
            <p className="m-0 text-sm text-[var(--color-text-muted)]">
              Keine Kachel dieser Ansicht folgt einem zentralen Pipeline-Filter.
            </p>
          )}
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
                onClick={() =>
                  // Codex PR #72: ein ausgeblendeter Startzeitraum geht beim Übernehmen nicht verloren.
                  onStartFilters(
                    value && !value.period && startFilters?.period
                      ? { ...value, period: startFilters.period }
                      : value,
                  )
                }
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
          {pipelineSupported
            ? 'Pipeline: CRM-Kacheln zeigen nur Deals, deren Pipeline genau so heißt (Groß-/Kleinschreibung zählt); Kacheln mit eigener Pipeline behalten diese; andere Kacheln bleiben ungefiltert. '
            : ''}
          Zeitraumfilter für diese Daten derzeit nicht verfügbar.
          {savedPeriod
            ? ` Gespeicherter Zeitraum ${formatPeriod(savedPeriod)} bleibt erhalten, wirkt aber nicht.`
            : ''}{' '}
          Filter gelten für diese Sitzung
          {editing ? '; Startfilter erst nach „Speichern“' : ''}.
        </p>
      </form>
    </div>
  );
}
