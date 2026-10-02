// Gemeinsame Bedienelemente der Tiefen-Diagramme (Designprobe, Teilauftrag 0):
// Tooltip-Zeile mit Wert, Einheit, Kategorie und Zeitraum sowie Legenden-Schaltflächen als
// Tastatur- und Touch-Zugang zu den Datenpunkten. Die SVG-Fläche selbst bleibt für Screenreader
// verborgen; Werte stehen in der Tooltip-Zeile und in der Tabellenansicht.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatDe } from './depthGeometry';
import type { DatumInput } from './depthGeometry';

/**
 * Diagramme behalten ihre Lesegröße (Mindestbreite 560 px = 1:1 zur Zeichenfläche). Auf schmalen
 * Kacheln scrollt nur dieser Bereich waagerecht, statt Achsen- und Beschriftungstexte zu verkleinern.
 * Der Bereich ist per Tastatur fokussierbar, damit das Scrollen ohne Maus möglich bleibt.
 */
export function ScrollableChart({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </div>
  );
}

export interface ReadoutProps {
  entry: DatumInput | null;
  unit: string;
  period: string;
  /** Anteile werden mit Prozentzeichen ohne Leerzeichen dargestellt. */
  idleText?: string;
}

export function ChartReadout({ entry, unit, period, idleText }: ReadoutProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      data-testid="chart-readout"
      className="m-0 min-h-[40px] text-[12px] leading-[1.4] text-[var(--color-text-muted)]"
    >
      {entry ? (
        <>
          <span className="font-semibold text-[var(--color-text-primary,#fff)]">{entry.label}</span>
          {' · '}
          <span className="font-mono text-primary">
            {formatDe(entry.value)} {unit}
          </span>
          {' · '}
          {period}
        </>
      ) : (
        (idleText ?? 'Datenpunkt wählen oder darüberfahren')
      )}
    </p>
  );
}

export interface LegendButtonsProps {
  data: readonly DatumInput[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  /** Farben je Eintrag; ohne Angabe erscheint nur der Text. */
  colors?: readonly string[];
  ariaLabel: string;
}

/** Echte Schaltflächen: Tastatur (Tab, Enter) und Touch erreichen jeden Datenpunkt. */
export function LegendButtons({
  data,
  activeIndex,
  onSelect,
  colors,
  ariaLabel,
}: LegendButtonsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-[6px]">
      {data.map((entry, index) => {
        const active = activeIndex === index;
        return (
          <button
            key={entry.label}
            type="button"
            aria-pressed={active}
            // Fokus wirkt wie Hover: Tastatur- und Touch-Nutzung sehen Wert und Hervorhebung sofort.
            onFocus={() => onSelect(index)}
            onBlur={() => onSelect(null)}
            onClick={() => onSelect(index)}
            className={cn(
              'inline-flex items-center gap-[6px] rounded-full border border-solid bg-transparent px-[10px] py-[4px] font-body text-[11.5px] outline-none transition-[all_150ms_ease] focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'border-primary text-primary'
                : 'border-border text-[var(--color-text-muted)] hover:border-primary',
            )}
          >
            {colors ? (
              <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                <circle cx="4" cy="4" r="4" fill={colors[index % colors.length]} />
              </svg>
            ) : null}
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}
