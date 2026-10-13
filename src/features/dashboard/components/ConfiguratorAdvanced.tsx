// Auftrag 092: „Erweiterte Einstellungen“ des Konfigurationsfensters. Hier liegen Kombinationen,
// Zeitbezug und eigene Pipeline; die normale Auswahl (Kennzahl, Darstellung, Vorschau) kommt ohne
// diese Details aus. Der Bereich ist eingeklappt, öffnet sich aber von selbst, wenn die Kachel
// bereits abweichende Werte trägt. Der Inhalt bleibt im Elternbaum gehalten (Zustand liegt dort).
import { useId, type ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { allowedFilterModes } from '../hooks/dashboardEditorReducer';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import { defaultsFor, Group, MODE_LABEL, Option, type Choice } from './ConfiguratorFields';

export function AdvancedSettings(props: {
  open: boolean;
  onToggle: () => void;
  /** Kurzer Hinweis am Auslöser, z. B. „1 Abweichung“. */
  summary?: string;
  children: ReactNode;
}) {
  const panelId = useId();
  return (
    <section aria-labelledby={`${panelId}-titel`} className="flex min-w-0 flex-col gap-3">
      <h3 id={`${panelId}-titel`} className="m-0 text-[13px] font-medium">
        <button
          type="button"
          aria-expanded={props.open}
          aria-controls={panelId}
          onClick={props.onToggle}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-medium text-[var(--color-text)]"
        >
          <span aria-hidden="true">{props.open ? '▾' : '▸'}</span>
          Erweiterte Einstellungen
          {props.summary ? (
            <span className="font-normal text-[var(--color-text-muted)]">({props.summary})</span>
          ) : null}
        </button>
      </h3>
      <div id={panelId} hidden={!props.open} className="flex min-w-0 flex-col gap-3">
        {props.open ? props.children : null}
      </div>
    </section>
  );
}

/** Überschrift eines Abschnitts im Konfigurator („Kennzahl“, „Darstellung“, „Vorschau“). */
export function Step(props: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h3 id={id} className="m-0 text-[13px] font-medium">
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}

/** Kurzhinweis am Auslöser: wie viele Einstellungen vom Standard abweichen. */
export function advancedSummaryOf(
  choice: Choice | null,
  entry: ActiveCatalogEntry | undefined,
): string | undefined {
  if (!choice || !entry) return undefined;
  const count = [
    choice.catalogId !== choice.firstId,
    choice.filterMode !== defaultsFor(entry).filterMode,
    choice.pipeline.trim() !== '',
  ].filter(Boolean).length;
  if (count === 0) return undefined;
  return count === 1 ? '1 Abweichung' : `${count} Abweichungen`;
}

export function TimeAndPipeline(props: {
  uid: string;
  entry: ActiveCatalogEntry;
  choice: Choice;
  onChange: (patch: Partial<Choice>) => void;
}) {
  const { uid, entry, choice, onChange } = props;
  return (
    <>
      <Group legend="Zeitbezug">
        {allowedFilterModes(entry).map((option) => (
          <Option
            key={option.mode}
            name={`${uid}-zeitbezug`}
            checked={choice.filterMode === option.mode}
            disabled={!option.allowed}
            label={MODE_LABEL[option.mode]}
            hint={option.allowed ? undefined : option.reason}
            onSelect={() => onChange({ filterMode: option.mode })}
          />
        ))}
      </Group>
      {entry.filters.includes('pipeline') ? (
        <Input
          label="Eigene Pipeline (optional, ersetzt den zentralen Filter)"
          value={choice.pipeline}
          onChange={(event) => onChange({ pipeline: event.target.value })}
        />
      ) : null}
    </>
  );
}
