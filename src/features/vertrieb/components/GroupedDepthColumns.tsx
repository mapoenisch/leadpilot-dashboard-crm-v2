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

const W = 960;
const H = 165;
const PLOT = { left: 48, right: 16, top: 16, bottom: 44 };
const DEPTH = 9;
// Nachbau Original-WebP: glasige Vorderseite, helle Oberseite, dunkle Seite, Bodenlicht, Spiegelung.
const hell = (color: string, anteil: number) =>
  `color-mix(in srgb, ${color} ${100 - anteil}%, white ${anteil}%)`;
const dunkel = (color: string, anteil: number) =>
  `color-mix(in srgb, ${color} ${100 - anteil}%, black ${anteil}%)`;

function niceMax(value: number): { max: number; step: number } {
  const raw = Math.max(value, 1) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw) ?? raw;
  return { max: Math.ceil(value / step) * step, step };
}

export function GroupedDepthColumns({
  labels,
  series,
  idPrefix,
}: {
  labels: readonly string[];
  series: readonly DepthSeries[];
  idPrefix: string;
}) {
  const all = series.flatMap((s) => s.values);
  const { max, step } = niceMax(Math.max(...all, 0));
  const innerW = W - PLOT.left - PLOT.right;
  const innerH = H - PLOT.top - PLOT.bottom;
  const y = (v: number) => PLOT.top + innerH - (v / max) * innerH;
  const group = innerW / Math.max(labels.length, 1);
  const barW = Math.min(22, (group * 0.55) / Math.max(series.length, 1));
  const gap = barW * 0.18;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  return (
    <div className="flex flex-col gap-2" data-testid="grouped-depth-columns">
      {/* Auf schmalen Breiten scrollt nur die Grafik; per Tastatur erreichbar. */}
      <div
        role="region"
        aria-label="Quartalsverlauf, waagerecht scrollbar"
        tabIndex={0}
        className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="block min-w-[560px]"
          aria-hidden="true"
        >
          <defs>
            {series.map((s, si) => (
              <linearGradient
                key={s.name}
                id={`${idPrefix}-front-${si}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={hell(s.color, 35)} />
                <stop offset="45%" stopColor={s.color} />
                <stop offset="100%" stopColor={dunkel(s.color, 22)} stopOpacity="0.85" />
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
                x1={PLOT.left}
                x2={W - PLOT.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-border)"
                strokeOpacity="0.6"
              />
              <text
                x={PLOT.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--color-text-muted)"
              >
                {formatAnzahl(t)}
              </text>
            </g>
          ))}
          <line
            x1={PLOT.left}
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
            const start = PLOT.left + group * li + (group - width) / 2;
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
                  const x = start + si * (barW + gap);
                  const top = y(v);
                  const h = Math.max(1, y(0) - top);
                  return (
                    <g key={s.name}>
                      {/* Spiegelung auf dem Boden */}
                      <rect
                        className="gdc-spiegel"
                        x={x}
                        y={y(0) + 1}
                        width={barW}
                        height={Math.min(h, 22) * 0.6}
                        fill={s.color}
                        fillOpacity="0.09"
                      />
                      <polygon
                        points={`${x + barW},${top} ${x + barW + DEPTH},${top - DEPTH * 0.6} ${x + barW + DEPTH},${top - DEPTH * 0.6 + h} ${x + barW},${top + h}`}
                        fill={dunkel(s.color, 38)}
                      />
                      <rect
                        data-saeule
                        x={x}
                        y={top}
                        width={barW}
                        height={h}
                        fill={`url(#${idPrefix}-front-${si})`}
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
                        fill={hell(s.color, 45)}
                      />
                    </g>
                  );
                })}
                <text
                  x={start + width / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--color-text-muted)"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {series.length > 1 ? (
        <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-[12px] text-[var(--color-text-muted)]">
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
    </div>
  );
}
