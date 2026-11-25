// Gemeinsame Bedienelemente der Tiefen-Diagramme (Designprobe, Teilauftrag 0):
// Tooltip-Zeile mit Wert, Einheit, Kategorie und Zeitraum sowie Legenden-Schaltflächen als
// Tastatur- und Touch-Zugang zu den Datenpunkten. Die SVG-Fläche selbst bleibt für Screenreader
// verborgen; Werte stehen in der Tooltip-Zeile und in der Tabellenansicht.
import { useEffect, useState, type ReactNode, type SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import { formatDe } from './depthGeometry';
import type { DatumInput, TimeDatumInput } from './depthGeometry';
import { useTileFit } from '../tileFit';

function getDatumKey(entry: DatumInput | TimeDatumInput): string {
  if ('at' in entry && typeof entry.at === 'string' && entry.at.length > 0) {
    return entry.at;
  }
  return entry.label;
}

/**
 * Auswahl eines Datenpunkts, gespeichert über einen stabilen Schlüssel (Zeitstempel `at` für
 * Verlaufspunkte, Label für Kategorien) statt über den Index: Sortiert ein Filterwechsel
 * oder Refresh die Reihe neu, bleibt dieselbe Kategorie bzw. derselbe Zeitpunkt gewählt.
 * Behebt zudem doppelte Labels bei der Winterzeitumstellung (Codex Review).
 */
export function useActiveDatum(
  data: readonly (DatumInput | TimeDatumInput)[],
): [number | null, (next: SetStateAction<number | null>) => void] {
  const [key, setKey] = useState<string | null>(null);
  const index = key === null ? -1 : data.findIndex((entry) => getDatumKey(entry) === key);
  const active = index >= 0 ? index : null;
  const missing = key !== null && index < 0;
  useEffect(() => {
    if (missing) setKey(null);
  }, [missing]);
  const setActive = (next: SetStateAction<number | null>) => {
    const value = typeof next === 'function' ? next(active) : next;
    const item = value === null ? undefined : data[value];
    setKey(item ? getDatumKey(item) : null);
  };
  return [active, setActive];
}

/**
 * Diagramme behalten ihre Lesegröße (Mindestbreite 560 px = 1:1 zur Zeichenfläche). Auf schmalen
 * Kacheln scrollt nur dieser Bereich waagerecht, statt Achsen- und Beschriftungstexte zu verkleinern.
 * Der Bereich ist per Tastatur fokussierbar, damit das Scrollen ohne Maus möglich bleibt.
 */
export function ScrollableChart({ label, children }: { label: string; children: ReactNode }) {
  // Auftrag 174b (K2): eingepasst ist die Layoutbreite nie schmaler als das Diagramm; ohne
  // Scrollbereich und ohne den Hinweis „scrollbar“ in der Beschriftung.
  const fit = useTileFit();
  if (fit) {
    return (
      <div role="group" aria-label={label.replace(/,\s*waagerecht scrollbar/, '')}>
        {children}
      </div>
    );
  }
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

/** Datenabhängige Kurzfassung für Screenreader; per aria-describedby mit dem SVG verknüpft. */
export function ChartSummary({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="sr-only">
      {text}
    </p>
  );
}

export interface ReadoutProps {
  entry: DatumInput | TimeDatumInput | null;
  unit: string;
  period: string;
  /** Anteile werden mit Prozentzeichen ohne Leerzeichen dargestellt. */
  idleText?: string;
  formatValue?: (value: number) => string;
  /** Zusatz hinter dem Wert, z. B. der Anteil eines Ringsegments („12,5 % Anteil“). */
  extra?: string;
  /** Dashboard-Kacheln: feste, intern scrollende Höhe; lange Zeitangaben verschieben nichts. */
  stableHeight?: boolean;
  /** Kündigt Änderungen per aria-live="polite" an (Auftrag 164 §2.1 Nr. 3; mitlaufende Kacheln setzen false). */
  announce?: boolean;
}

/** Feste Höhe der Ablesezeile (drei Textzeilen); Überlauf scrollt, siehe `ChartReadout`. */
export const READOUT_STABLE_CLASS = 'h-[60px] overflow-y-auto';

export function ChartReadout({
  entry,
  unit,
  period,
  idleText,
  formatValue,
  extra,
  stableHeight = false,
  announce = true,
}: ReadoutProps) {
  const timeEntry = entry as TimeDatumInput | null;
  const isNull = entry ? entry.value === null : false;
  const gapText = isNull
    ? timeEntry?.status === 'vor_historienbeginn'
      ? 'vor Aufzeichnungsbeginn'
      : 'keine Messung'
    : null;
  const measuredText = timeEntry?.measuredAt
    ? ` · gemessen ${new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(timeEntry.measuredAt))} Uhr`
    : '';

  return (
    <p
      role="status"
      aria-live={announce ? 'polite' : 'off'}
      data-testid="chart-readout"
      tabIndex={stableHeight ? 0 : undefined}
      className={cn(
        'm-0 text-[12px] leading-[1.4] text-[var(--color-text-muted)]',
        stableHeight
          ? `${READOUT_STABLE_CLASS} outline-none focus-visible:ring-2 focus-visible:ring-primary`
          : 'min-h-[40px]',
      )}
    >
      {entry ? (
        <>
          <span className="font-semibold text-[var(--color-text-primary,#fff)]">{entry.label}</span>
          {' · '}
          {isNull ? (
            <span className="font-medium text-[var(--color-text-muted)]">{gapText}</span>
          ) : (
            <span className="font-mono text-primary">
              {formatValue
                ? formatValue(entry.value as number)
                : `${formatDe(entry.value as number)} ${unit}`.trim()}
            </span>
          )}
          {extra ? ` · ${extra}` : ''}
          {' · '}
          {period}
          {measuredText}
        </>
      ) : (
        (idleText ?? 'Datenpunkt wählen oder darüberfahren')
      )}
    </p>
  );
}

export interface LegendButtonsProps {
  data: readonly (DatumInput | TimeDatumInput)[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  /** Farben je Eintrag; ohne Angabe erscheint nur der Text. */
  colors?: readonly string[];
  ariaLabel: string;
  /** Feste Mindesthöhe der Legendenzeile (Dashboard-Kacheln), siehe `LEGEND_RESERVE_CLASS`. */
  stableHeight?: boolean;
}

/** Gemeinsame Klassen: Legende und Platzhalter umbrechen dadurch gleich. */
const LEGEND_CHIP_CLASS =
  'inline-flex items-center gap-[6px] rounded-full border border-solid bg-transparent px-[10px] py-[4px] font-body text-[11.5px]';
export const SLIDER_ROW_CLASS =
  'flex items-center gap-[10px] text-[11.5px] text-[var(--color-text-muted)]';
export const SLIDER_LABEL = 'Zeitpunkt wählen';
/**
 * Dashboard-Kacheln (Auftrag 073): Beim Laden sind die Kategorien noch unbekannt. Legende und
 * Platzhalter erhalten deshalb dieselbe Mindesthöhe für zwei Chipzeilen; bis zu zwei Zeilen
 * wächst die Kachel beim Datenempfang nicht. Die Höhe ist fest: weitere Zeilen (viele oder lange
 * CRM-Stufen) scrollen innerhalb der Legende, die Schaltflächen bleiben per Tastatur erreichbar.
 */
export const LEGEND_RESERVE_CLASS = 'h-[62px] content-start overflow-y-auto';

/** Bedienelemente unter dem Diagramm: Legende (mit oder ohne Farbpunkt) oder Zeitregler. */
export type ChartControls = 'legend' | 'legend-dots' | 'slider';

/**
 * Unsichtbares Gerüst mit derselben Struktur wie ein geladenes Diagramm: Zeichenfläche 2:1 mit
 * 560 px Mindestbreite, Ausgabezeile und dieselben Legenden-Schaltflächen bzw. derselbe Regler.
 * Lade- und Fehlerzustand reservieren damit bei jeder Kachelbreite die Endhöhe.
 */
export function ChartLayoutReserve({
  labels,
  controls,
  stableLegend = false,
}: {
  labels: readonly string[];
  controls: ChartControls;
  /** Dieselbe feste Legendenhöhe wie `LegendButtons` mit `stableHeight`. */
  stableLegend?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid="chart-layout-reserve"
      className="invisible flex flex-col gap-[10px]"
    >
      <div className="overflow-hidden">
        <div className="aspect-[2/1] w-full min-w-[560px]" />
      </div>
      <p
        className={cn(
          'm-0 text-[12px] leading-[1.4]',
          stableLegend ? READOUT_STABLE_CLASS : 'min-h-[40px]',
        )}
      >
        &nbsp;
      </p>
      {controls === 'slider' ? (
        <div className={SLIDER_ROW_CLASS}>
          <span>{SLIDER_LABEL}</span>
          <input type="range" disabled tabIndex={-1} className="min-w-0 flex-1" />
        </div>
      ) : (
        <div className={cn('flex flex-wrap gap-[6px]', stableLegend && LEGEND_RESERVE_CLASS)}>
          {/* Ohne bekannte Labels (Laden, blockierte Zustände) hält ein Platzhalter-Chip die Zeile. */}
          {(labels.length > 0 ? labels : ['\u00a0']).map((label) => (
            <button key={label} type="button" disabled tabIndex={-1} className={LEGEND_CHIP_CLASS}>
              {controls === 'legend-dots' ? <svg width="8" height="8" /> : null}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Echte Schaltflächen: Tastatur (Tab, Enter) und Touch erreichen jeden Datenpunkt. */
export function LegendButtons({
  data,
  activeIndex,
  onSelect,
  colors,
  ariaLabel,
  stableHeight = false,
}: LegendButtonsProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-[6px]', stableHeight && LEGEND_RESERVE_CLASS)}
    >
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
              LEGEND_CHIP_CLASS,
              'outline-none transition-[all_150ms_ease] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary',
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
