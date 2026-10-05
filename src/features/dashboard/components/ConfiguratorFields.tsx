// Auftrag 074: kleine Bausteine des Konfigurationsfensters (Auswahlgruppe, Option, Verzögerung),
// ausgelagert wegen der Dateigrenze von 400 Zeilen.
import { useEffect, useState, type ReactNode } from 'react';

export function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1 p-0 text-[13px] font-medium text-[var(--color-text-muted)]">
        {legend}
      </legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  );
}

export function Option(props: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm [overflow-wrap:anywhere]">
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onSelect}
        className="mt-1"
      />
      <span className={props.disabled ? 'opacity-60' : undefined}>
        {props.label}
        {props.hint ? (
          <span className="block text-[12px] text-[var(--color-text-muted)]">{props.hint}</span>
        ) : null}
      </span>
    </label>
  );
}

/** Verzögerter Wert: Tippen löst in der Vorschau keine Abfrage je Buchstabe aus. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
