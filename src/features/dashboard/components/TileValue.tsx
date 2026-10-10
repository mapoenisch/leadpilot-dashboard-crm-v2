// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Darstellungen Zahl und Tabelle.
// Fehlende Werte zeigen „Keine Daten“, nie 0. Die Zahl ist kompakt, Tabelle und Screenreader exakt.
import type { DatumInput } from './charts/depthGeometry';
import { formatTileValue } from './tileFormat';

/** Trennt die Einheit ab, damit sie kleiner neben der Zahl steht (wie in der Testkachel). */
function splitUnit(text: string): { number: string; unit: string } {
  const space = text.search(/ [^\d\s-]/);
  return space > 0
    ? { number: text.slice(0, space), unit: text.slice(space + 1) }
    : { number: text, unit: '' };
}

/** Auftrag 091: Vorperiode neutral als Text – kein Pfeil, keine Farbe, keine Bewertung. */
function ComparisonLine({
  value,
  unit,
  comparison,
}: {
  value: number;
  unit: string;
  comparison: { label: string; value: number };
}) {
  const delta = value - comparison.value;
  const sign = delta > 0 ? '+' : '';
  const comparisonText = [
    `Vorjahr (${comparison.label}): ${formatTileValue(comparison.value, unit, 'kompakt')}`,
    `Veränderung ${sign}${formatTileValue(delta, unit, 'kompakt')}`,
  ].join(' · ');
  return (
    <p data-testid="tile-comparison" className="m-0 text-[12px] text-[var(--color-text-muted)]">
      {comparisonText}
    </p>
  );
}

export function TileNumber({
  value,
  unit,
  comparison,
}: {
  value: number;
  unit: string;
  comparison?: { label: string; value: number };
}) {
  const compact = formatTileValue(value, unit, 'kompakt');
  const exact = formatTileValue(value, unit, 'exakt');
  const parts = splitUnit(compact);
  return (
    <div data-testid="tile-number" className="flex min-h-[48px] flex-col justify-center">
      <p className="m-0 flex flex-wrap items-baseline gap-x-[8px] text-[var(--color-text-primary,#fff)]">
        <span aria-hidden="true" className="font-mono text-[32px] font-bold leading-none">
          {parts.number}
        </span>{' '}
        {parts.unit ? (
          <span
            aria-hidden="true"
            className="text-[15px] font-medium text-[var(--color-text-muted)]"
          >
            {parts.unit}
          </span>
        ) : null}
        <span className="sr-only">{exact}</span>
      </p>
      {comparison ? <ComparisonLine value={value} unit={unit} comparison={comparison} /> : null}
    </div>
  );
}

export function TileTable({
  rows,
  unit,
  caption,
}: {
  rows: readonly DatumInput[];
  unit: string;
  caption: string;
}) {
  return (
    <table
      data-testid="tile-table"
      className="w-full border-collapse text-[13px] text-[var(--color-text-muted)]"
    >
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-0 border-b border-solid border-border">
          <th scope="col" className="py-[8px] text-left font-semibold">
            Kategorie
          </th>
          <th scope="col" className="py-[8px] text-right font-semibold">
            Wert
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={`${row.label}-${index}`}
            className="border-0 border-b border-solid border-[var(--color-border-glass,rgba(0,217,198,0.08))]"
          >
            <th
              scope="row"
              className="py-[8px] text-left font-normal text-[var(--color-text-soft,#e6f3f1)] [overflow-wrap:anywhere]"
            >
              {row.label}
            </th>
            <td className="whitespace-nowrap py-[8px] text-right font-mono text-primary">
              {formatTileValue(row.value, unit, 'exakt')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
