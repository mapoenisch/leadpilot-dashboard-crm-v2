import { formatAnzahl } from '@/domain/funnelQuote';

// Auftrag 093 (Paket G1): Gruppierte Säulen mit 3D-Tiefe wie im Original-WebP
// (Quartalsverlauf Funnel-Stufen): je Gruppe eine Säule pro Reihe in der Reihenfarbe,
// helle Oberkante, dunklere Seitenfläche, dezentes Bodenlicht. Werte stehen zusätzlich
// in der Tabelle; die Grafik ist deshalb für Screenreader ausgeblendet (Zusammenfassung
// liefert ChartFigure).
export interface DepthSeries {
  name: string;
  values: readonly number[];
  color: string;
}

const W_STANDARD = 960;
const H_STANDARD = 165;
const PLOT = { right: 16, top: 16, bottom: 44 };
// Platz über der höchsten Säule für Wertebeschriftungen.
const LABEL_TOP = 26;
const DEPTH = 9;
// Nachbau Original-WebP: glasige Vorderseite, helle Oberseite, dunkle Seite, Bodenlicht, Spiegelung.
const hell = (color: string, anteil: number) =>
  `color-mix(in srgb, ${color} ${100 - anteil}%, white ${anteil}%)`;
const dunkel = (color: string, anteil: number) =>
  `color-mix(in srgb, ${color} ${100 - anteil}%, black ${anteil}%)`;

// Lange Beschriftungen (schmale Panels) zweizeilig: Umbruch nach „/“ oder „-“ bzw. am
// Leerzeichen nahe der Mitte, z. B. „Partner/ Empfehlung“, „Outbound- E-Mail“.
function zeilen(label: string, umbrechen: boolean): string[] {
  if (!umbrechen || label.length <= 11) return [label];
  const mitte = label.length / 2;
  const stellen = [...label.matchAll(/[ /-]/g)].map((m) => m.index ?? 0);
  if (stellen.length === 0) return [label];
  const at = stellen.reduce((best, i) => (Math.abs(i - mitte) < Math.abs(best - mitte) ? i : best));
  const trennzeichenBleibt = label[at] !== ' ';
  return [label.slice(0, trennzeichenBleibt ? at + 1 : at), label.slice(at + 1)];
}

function niceMax(value: number): { max: number; step: number } {
  const raw = Math.max(value, 1) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw) ?? raw;
  // Ohne positive Werte (leer/nur Nullen) feste Skala 0–3, sonst Division durch null.
  if (!(value > 0)) return { max: 3, step: 1 };
  return { max: Math.ceil(value / step) * step, step };
}

// Auftrag 096 (Paket G2, Welle 3): additive Optionen für Kanal- und Planungsseite – Höhe,
// Säulenbreite, Farbe je Säule (z. B. orange hervorgehobener Kanal), Achsenformat und
// Regionsname. Ohne Angabe bleibt das Verhalten der Funnel-Seite unverändert.
export function GroupedDepthColumns({
  labels,
  series,
  idPrefix,
  height = H_STANDARD,
  maxBarWidth = 22,
  colorAt,
  formatTick = formatAnzahl,
  regionLabel = 'Quartalsverlauf, waagerecht scrollbar',
  valueLabel,
  viewWidth = W_STANDARD,
  plotLeft = 48,
  schmal = false,
  datenTabelle,
}: {
  labels: readonly string[];
  series: readonly DepthSeries[];
  idPrefix: string;
  height?: number;
  maxBarWidth?: number;
  colorAt?: (seriesIndex: number, labelIndex: number) => string | undefined;
  formatTick?: (value: number) => string;
  regionLabel?: string;
  valueLabel?: (value: number, seriesIndex: number, labelIndex: number) => string;
  /** Breite des Koordinatensystems; schmale Panels brauchen weniger, damit die Schrift lesbar bleibt. */
  viewWidth?: number;
  plotLeft?: number;
  /** Für halbe Panels: Mindestbreite 420 statt 560 px (darunter scrollt nur die Grafik),
   *  kleinere, bei Bedarf zweizeilige Beschriftung. */
  schmal?: boolean;
  /** Versteckte Datentabelle für Screenreader (SVG ist aria-hidden); Wert formatiert je Reihe.
   *  Für Seiten ohne sichtbare Wertetabelle; die Funnel-Seite hat ihre Trichtertabelle. */
  datenTabelle?: (value: number, seriesIndex: number) => string;
}) {
  const H = height;
  const W = viewWidth;
  const plot = { ...PLOT, left: plotLeft };
  const farbe = (si: number, li: number): string =>
    colorAt?.(si, li) ?? series[si]?.color ?? 'var(--color-primary)';
  const farben = Array.from(
    new Set(labels.flatMap((_, li) => series.map((__, si) => farbe(si, li)))),
  );
  const all = series.flatMap((s) => s.values);
  const { max, step } = niceMax(Math.max(...all, 0));
  // Auftrag 097 (Welle 4): negative Werte (z. B. EBITDA) reichen unter die Nulllinie; die Skala
  // wird um ganze Schritte nach unten verlängert. Ohne negative Werte bleibt min = 0.
  const min = -Math.ceil(Math.max(0, -Math.min(...all, 0)) / step) * step;
  const innerW = W - plot.left - PLOT.right;
  const top0 = PLOT.top + (valueLabel ? LABEL_TOP : 0);
  const innerH = H - top0 - PLOT.bottom - (min < 0 && valueLabel ? LABEL_TOP : 0);
  const y = (v: number) => top0 + innerH - ((v - min) / (max - min)) * innerH;
  const group = innerW / Math.max(labels.length, 1);
  const barW = Math.min(maxBarWidth, (group * 0.55) / Math.max(series.length, 1));
  const gap = barW * 0.18;
  const ticks = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, i) => min + i * step,
  );
  return (
    <div className="flex flex-col gap-2" data-testid="grouped-depth-columns">
      {/* Auf schmalen Breiten scrollt nur die Grafik; per Tastatur erreichbar. */}
      <div
        role="region"
        aria-label={regionLabel}
        tabIndex={0}
        className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className={schmal ? 'block min-w-[420px]' : 'block min-w-[560px]'}
          aria-hidden="true"
        >
          <defs>
            {farben.map((color, fi) => (
              <linearGradient
                key={color}
                id={`${idPrefix}-front-${fi}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={hell(color, 35)} />
                <stop offset="45%" stopColor={color} />
                <stop offset="100%" stopColor={dunkel(color, 22)} stopOpacity="0.85" />
              </linearGradient>
            ))}
            <linearGradient id={`${idPrefix}-glanz`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0.35" />
              <stop offset="35%" stopColor="white" stopOpacity="0.08" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`${idPrefix}-floor`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={plot.left}
                x2={W - PLOT.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-border)"
                strokeOpacity="0.6"
              />
              <text
                x={plot.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="text-[0.75rem]"
                fill="var(--color-text-muted)"
              >
                {formatTick(t)}
              </text>
            </g>
          ))}
          <line
            x1={plot.left}
            x2={W - PLOT.right}
            y1={y(0)}
            y2={y(0)}
            className="gdc-boden"
            stroke="var(--color-primary)"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
          {labels.map((label, li) => {
            const width = series.length * barW + (series.length - 1) * gap;
            const start = plot.left + group * li + (group - width) / 2;
            return (
              <g key={label}>
                <ellipse
                  className="gdc-boden"
                  cx={start + width / 2}
                  cy={y(0) + 2}
                  rx={width * 0.75}
                  ry={7}
                  fill={`url(#${idPrefix}-floor)`}
                />
                {series.map((s, si) => {
                  const v = s.values[li] ?? 0;
                  const color = farbe(si, li);
                  const x = start + si * (barW + gap);
                  const negativ = v < 0;
                  const top = negativ ? y(0) : y(v);
                  const h = Math.max(1, negativ ? y(v) - y(0) : y(0) - top);
                  return (
                    <g key={s.name}>
                      {/* Spiegelung auf dem Boden */}
                      <rect
                        className="gdc-spiegel"
                        x={x}
                        y={y(0) + 1}
                        width={barW}
                        height={Math.min(h, 22) * 0.6}
                        fill={color}
                        fillOpacity="0.09"
                      />
                      <polygon
                        points={`${x + barW},${top} ${x + barW + DEPTH},${top - DEPTH * 0.6} ${x + barW + DEPTH},${top - DEPTH * 0.6 + h} ${x + barW},${top + h}`}
                        fill={dunkel(color, 38)}
                      />
                      <rect
                        data-saeule
                        x={x}
                        y={top}
                        width={barW}
                        height={h}
                        fill={`url(#${idPrefix}-front-${farben.indexOf(color)})`}
                      />
                      <rect
                        className="gdc-glanz"
                        x={x}
                        y={top}
                        width={barW}
                        height={h}
                        fill={`url(#${idPrefix}-glanz)`}
                      />
                      <polygon
                        points={`${x},${top} ${x + DEPTH},${top - DEPTH * 0.6} ${x + barW + DEPTH},${top - DEPTH * 0.6} ${x + barW},${top}`}
                        fill={hell(color, 45)}
                      />
                      {valueLabel ? (
                        <text
                          x={x + (barW + DEPTH) / 2}
                          y={negativ ? top + h + 17 : top - DEPTH * 0.6 - 7}
                          textAnchor="middle"
                          className="text-[0.8125rem]"
                          fontWeight="600"
                          fill="var(--color-text)"
                        >
                          {valueLabel(v, si, li)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                <text
                  x={start + width / 2}
                  y={schmal ? H - 24 : H - 10}
                  textAnchor="middle"
                  className={schmal ? 'text-[0.75rem]' : 'text-[0.8125rem]'}
                  fill="var(--color-text-muted)"
                >
                  {zeilen(label, schmal).map((zeile, zi) => (
                    <tspan key={zeile} x={start + width / 2} dy={zi === 0 ? 0 : 15}>
                      {zeile}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {series.length > 1 ? (
        <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-[0.75rem] text-[var(--color-text-muted)]">
          {series.map((s) => (
            <li key={s.name} className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <rect width="10" height="10" rx="2" fill={s.color} />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
      {datenTabelle ? (
        // Tabellen ignorieren width: 1px; der sr-only-Container hält sie aus dem Layout.
        <div className="sr-only">
          <table>
            <caption>Datenwerte des Diagramms</caption>
            <thead>
              <tr>
                <th scope="col">Kategorie</th>
                {series.map((s) => (
                  <th scope="col" key={s.name}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, li) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {series.map((s, si) => (
                    <td key={s.name}>{datenTabelle(s.values[li] ?? 0, si)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
