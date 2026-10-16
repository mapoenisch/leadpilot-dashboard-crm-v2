// Auftrag 097 (Paket G2, Welle 4): Linien-/Flächendiagramm mit 3D-Tiefe wie im Original-WebP
// (07-unit-economics-2026): Rückwand mit Hilfslinien, schräger Boden, Reihen auf der Rückwand,
// Fläche unter der Hauptreihe, leuchtende Punkte mit Fallinien. Die Grafik ist für Screenreader
// ausgeblendet; Zusammenfassung liefert ChartFigure, die Werte eine versteckte Datentabelle.
export interface FlaechenReihe {
  name: string;
  values: readonly number[];
  color: string;
  /** Fläche unter der Linie (im Original nur die Hauptreihe). */
  area?: boolean;
}

const W = 560;
const H = 270;
const PLOT = { left: 68, right: 34, top: 24, bottom: 40 };
// Versatz der Rückwand gegenüber der Vorderkante (Tiefe nach hinten oben).
const TIEFE = { x: 20, y: -14 };

function niceMax(value: number): { max: number; step: number } {
  if (!(value > 0)) return { max: 4, step: 1 };
  const raw = value / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw) ?? raw;
  return { max: Math.ceil(value / step) * step, step };
}

export function DepthFlaechen({
  labels,
  series,
  idPrefix,
  regionLabel,
  formatTick = (wert) => wert.toLocaleString('de-DE'),
  datenTabelle,
}: {
  labels: readonly string[];
  series: readonly FlaechenReihe[];
  idPrefix: string;
  regionLabel: string;
  formatTick?: (value: number) => string;
  datenTabelle: (value: number, seriesIndex: number) => string;
}) {
  const { max, step } = niceMax(Math.max(...series.flatMap((s) => s.values), 0));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  // Vorderkante des Bodens
  const x0 = PLOT.left;
  const x1 = W - PLOT.right - TIEFE.x;
  const base = H - PLOT.bottom;
  const innerH = base - PLOT.top + TIEFE.y;
  // Rückwand-Koordinaten (Reihen und Hilfslinien liegen dort)
  const bx = (i: number) =>
    x0 + TIEFE.x + (labels.length > 1 ? (i / (labels.length - 1)) * (x1 - x0) : 0);
  const by = (v: number) => base + TIEFE.y - (v / max) * innerH;
  const bodenHinten = base + TIEFE.y;

  return (
    <div className="flex flex-col gap-2" data-testid="depth-flaechen">
      <div
        role="region"
        aria-label={regionLabel}
        tabIndex={0}
        className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="block min-w-[420px]"
          aria-hidden="true"
        >
          <defs>
            {series.map((s, si) => (
              <linearGradient
                key={s.name}
                id={`${idPrefix}-flaeche-${si}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.08" />
              </linearGradient>
            ))}
            <linearGradient id={`${idPrefix}-boden`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.06" />
            </linearGradient>
            <filter id={`${idPrefix}-leuchten`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* Rückwand und linke Seitenwand */}
          <polygon
            className="dfl-wand"
            points={`${x0},${PLOT.top - TIEFE.y} ${x0 + TIEFE.x},${PLOT.top} ${x0 + TIEFE.x},${bodenHinten} ${x0},${base}`}
            fill="var(--color-primary)"
            fillOpacity="0.05"
            stroke="var(--color-border)"
            strokeOpacity="0.7"
          />
          <rect
            className="dfl-wand"
            x={x0 + TIEFE.x}
            y={PLOT.top}
            width={x1 - x0}
            height={bodenHinten - PLOT.top}
            fill="var(--color-primary)"
            fillOpacity="0.04"
            stroke="var(--color-border)"
            strokeOpacity="0.5"
          />
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={x0 + TIEFE.x}
                x2={x1 + TIEFE.x}
                y1={by(t)}
                y2={by(t)}
                stroke="var(--color-border)"
                strokeOpacity="0.6"
                strokeDasharray={t === 0 ? undefined : '3 4'}
              />
              <text
                x={x0 - 8}
                y={by(t) - TIEFE.y + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--color-text-muted)"
              >
                {formatTick(t)}
              </text>
            </g>
          ))}
          {/* Boden */}
          <polygon
            className="dfl-boden"
            points={`${x0},${base} ${x1},${base} ${x1 + TIEFE.x},${bodenHinten} ${x0 + TIEFE.x},${bodenHinten}`}
            fill={`url(#${idPrefix}-boden)`}
            stroke="var(--color-primary)"
            strokeOpacity="0.45"
          />
          {labels.map((label, li) => (
            <g key={label}>
              <line
                className="dfl-fall"
                x1={bx(li)}
                x2={bx(li)}
                y1={PLOT.top}
                y2={bodenHinten}
                stroke="var(--color-border)"
                strokeOpacity="0.45"
              />
              <text
                x={bx(li) - TIEFE.x}
                y={H - 12}
                textAnchor="middle"
                fontSize="12"
                fill="var(--color-text-muted)"
              >
                {label}
              </text>
            </g>
          ))}
          {series.map((s, si) => {
            const punkte = s.values.map((v, i) => [bx(i), by(v)] as const);
            const linie = punkte.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
            const erste = punkte[0];
            const letzte = punkte[punkte.length - 1];
            return (
              <g key={s.name}>
                {s.area && erste && letzte ? (
                  <path
                    d={`${linie} L${letzte[0]},${bodenHinten} L${erste[0]},${bodenHinten} Z`}
                    fill={`url(#${idPrefix}-flaeche-${si})`}
                  />
                ) : null}
                <path
                  className="dfl-glow"
                  d={linie}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="6"
                  strokeOpacity="0.4"
                  filter={`url(#${idPrefix}-leuchten)`}
                />
                <path
                  d={linie}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {punkte.map(([x, y], i) => (
                  <g key={labels[i] ?? i}>
                    <circle
                      className="dfl-glow"
                      cx={x}
                      cy={y}
                      r="7"
                      fill={s.color}
                      fillOpacity="0.45"
                      filter={`url(#${idPrefix}-leuchten)`}
                    />
                    <circle
                      data-punkt
                      cx={x}
                      cy={y}
                      r="4"
                      fill={`color-mix(in srgb, ${s.color} 55%, white)`}
                      stroke={s.color}
                      strokeWidth="1.5"
                    />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0 text-[12px] text-[var(--color-text-muted)]">
        {series.map((s) => (
          <li key={s.name} className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <rect width="18" height="8" rx="4" fill={s.color} />
            </svg>
            {s.name}
          </li>
        ))}
      </ul>
      {/* Tabellen ignorieren width: 1px; der sr-only-Container hält sie aus dem Layout. */}
      <div className="sr-only">
        <table>
          <caption>Datenwerte des Diagramms</caption>
          <thead>
            <tr>
              <th scope="col">Zeitpunkt</th>
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
    </div>
  );
}
