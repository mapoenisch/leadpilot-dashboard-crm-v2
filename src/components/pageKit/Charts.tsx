import type { ReactNode } from 'react';
import type { Tone } from './Panel';

// Auftrag 068 / G66: SVG-Diagramme der Inhaltsseiten (Balkenliste,
// Säulendiagramm, Donut) im Vorlagenstil. Geometrie nur über SVG-Attribute,
// keine Inline-Styles; jede Grafik trägt eine Textzusammenfassung
// (data-testid="chart-summary", G52–G55-Vertrag).

export function ChartFigure({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <figure className="pk-figure" data-testid="chart-summary" aria-label={title}>
      {children}
      <figcaption className="pk-figure__summary">
        <span className="sr-only">{title}: </span>
        {summary}
      </figcaption>
    </figure>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  display: string;
  /** Nebenwert, z. B. Anteil in Klammern. */
  note?: string;
  tone?: Tone;
}

export function BarList({ items, max }: { items: BarDatum[]; max?: number }) {
  const top = max ?? Math.max(...items.map((item) => Math.abs(item.value)), 0);
  const scale = top > 0 ? top : 1;
  return (
    <ul className="pk-bars">
      {items.map((item) => {
        const pct = Math.max(1.5, Math.min(100, (Math.abs(item.value) / scale) * 100));
        return (
          <li className="pk-bar" key={item.label} data-tone={item.tone ?? 'cyan'}>
            <span className="pk-bar__label">{item.label}</span>
            <span className="pk-bar__value">
              {item.display}
              {item.note ? <small>{item.note}</small> : null}
            </span>
            {/* Breiten in Prozent statt gestreckter viewBox: sonst wird das
                Leuchten horizontal mitgestreckt und läuft aus dem Panel. */}
            <svg className="pk-bar__track" width="100%" height="8" aria-hidden="true">
              <rect className="pk-track" x="0" y="0" width="100%" height="8" rx="4" />
              <rect
                className="pk-fill"
                x="0"
                y="0"
                width={`${pct.toFixed(2)}%`}
                height="8"
                rx="4"
              />
            </svg>
          </li>
        );
      })}
    </ul>
  );
}

export interface ColumnSeries {
  name: string;
  values: number[];
  tone?: Tone;
}

const fmt = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 });

/** Rundet auf 1/2/2,5/5 × 10^n auf, damit die Achse glatte Werte zeigt. */
function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const exp = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * exp >= value) ?? 10;
  return step * exp;
}

/**
 * Säulendiagramm, einzeln oder gruppiert, mit Achse und Legende. Horizontal in
 * Prozent, vertikal in Pixeln: Die Schrift bleibt auf jeder Breite gleich groß.
 */
export function ColumnChart({
  labels,
  series,
  valueSuffix = '',
  highlightLast = false,
  valueLabels,
}: {
  labels: string[];
  series: ColumnSeries[];
  valueSuffix?: string;
  /** Letzte Säule orange (teuerster Kanal, eigener Marktanteil). */
  highlightLast?: boolean;
  /** Eigene Wertbeschriftung je Säule (z. B. „< 0,1 %“). */
  valueLabels?: string[];
}) {
  const height = 240;
  const top = 22;
  const bottom = 30;
  const all = series.flatMap((s) => s.values);
  const ticks = 4;
  const step = niceCeil(Math.max(Math.max(...all, 0), -Math.min(...all, 0)) / ticks) || 1;
  const maxV = Math.ceil(Math.max(...all, 0) / step) * step || step;
  const minV = Math.floor(Math.min(...all, 0) / step) * step;
  const span = maxV - minV || 1;
  const innerH = height - top - bottom;
  const y = (v: number) => top + ((maxV - v) / span) * innerH;
  const tickCount = Math.round(span / step);
  const group = 100 / Math.max(labels.length, 1);
  const barW = Math.min((group * 0.7) / Math.max(series.length, 1), 7);
  const pct = (value: number) => `${value.toFixed(3)}%`;
  return (
    <>
      <div className="pk-colchart" data-dense={labels.length >= 5 ? 'true' : undefined}>
        <svg className="pk-colchart__axis" width="44" height={height} aria-hidden="true">
          {Array.from({ length: tickCount + 1 }, (_, i) => {
            const v = minV + step * i;
            return (
              <text key={i} className="pk-svg-text" x="38" y={y(v) + 4} textAnchor="end">
                {fmt(v)}
              </text>
            );
          })}
        </svg>
        <svg className="pk-colchart__plot" width="100%" height={height} aria-hidden="true">
          {Array.from({ length: tickCount + 1 }, (_, i) => {
            const v = minV + step * i;
            return <line key={i} className="pk-svg-grid" x1="0" x2="100%" y1={y(v)} y2={y(v)} />;
          })}
          {labels.map((label, li) => {
            const start = group * li + (group - barW * series.length) / 2;
            return (
              <g key={label}>
                {series.map((s, si) => {
                  const v = s.values[li] ?? 0;
                  const barTop = y(Math.max(v, 0));
                  const h = Math.max(2, Math.abs(y(v) - y(0)));
                  const tone =
                    highlightLast && li === labels.length - 1 ? 'orange' : (s.tone ?? 'cyan');
                  const x = start + si * barW;
                  return (
                    <g key={s.name} data-tone={tone}>
                      <rect
                        className="pk-fill"
                        x={pct(x + barW * 0.08)}
                        y={barTop}
                        width={pct(barW * 0.84)}
                        height={h}
                        rx="3"
                      />
                      {series.length === 1 ? (
                        <text
                          className="pk-svg-text pk-colchart__value"
                          data-strong="true"
                          x={pct(x + barW / 2)}
                          y={barTop - 6}
                          textAnchor="middle"
                        >
                          {valueLabels?.[li] ?? `${fmt(v)}${valueSuffix}`}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                <text
                  className="pk-svg-text pk-colchart__label"
                  data-odd={li % 2 === 1 ? 'true' : undefined}
                  x={pct(group * li + group / 2)}
                  y={height - 10}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {series.length > 1 ? (
        <ul className="pk-legend">
          {series.map((s) => (
            <li key={s.name} data-tone={s.tone ?? 'cyan'}>
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export interface LineSeries {
  name: string;
  values: number[];
  tone?: Tone;
  /** Fläche unter der Linie leuchtend füllen (Hauptreihe). */
  area?: boolean;
}

/**
 * Liniendiagramm mit Achse, Punkten und Legende. Linien und Flächen liegen in
 * einem gestreckten Innen-SVG (nicht skalierende Strichstärke), Punkte und
 * Beschriftungen in Prozent — die Schrift bleibt auf jeder Breite gleich groß.
 */
export function LineChart({ labels, series }: { labels: string[]; series: LineSeries[] }) {
  const height = 220;
  const top = 12;
  const bottom = 30;
  const all = series.flatMap((s) => s.values);
  const ticks = 4;
  const step = niceCeil(Math.max(...all, 0) / ticks) || 1;
  const maxV = Math.ceil(Math.max(...all, 0) / step) * step || step;
  const innerH = height - top - bottom;
  const y = (v: number) => top + ((maxV - v) / maxV) * innerH;
  const tickCount = Math.round(maxV / step);
  // Randabstand, damit erste und letzte Beschriftung nicht abgeschnitten werden.
  const pad = 6;
  const x = (i: number) =>
    labels.length > 1 ? pad + (i / (labels.length - 1)) * (100 - 2 * pad) : 50;
  const pct = (value: number) => `${value.toFixed(3)}%`;
  const points = (values: number[]) =>
    values.map((v, i) => `${x(i).toFixed(3)},${y(v).toFixed(2)}`).join(' ');
  const axisWidth = maxV >= 10000 ? 64 : 36;
  return (
    <>
      <div className="pk-colchart">
        <svg className="pk-colchart__axis" width={axisWidth} height={height} aria-hidden="true">
          {Array.from({ length: tickCount + 1 }, (_, i) => {
            const v = step * i;
            return (
              <text key={i} className="pk-svg-text" x={axisWidth - 6} y={y(v) + 4} textAnchor="end">
                {fmt(v)}
              </text>
            );
          })}
        </svg>
        <svg className="pk-colchart__plot" width="100%" height={height} aria-hidden="true">
          {Array.from({ length: tickCount + 1 }, (_, i) => (
            <line
              key={i}
              className="pk-svg-grid"
              x1="0"
              x2="100%"
              y1={y(step * i)}
              y2={y(step * i)}
            />
          ))}
          <svg
            x="0"
            y="0"
            width="100%"
            height={height}
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
          >
            {series.map((s) => (
              <g key={s.name} data-tone={s.tone ?? 'cyan'}>
                {s.area ? (
                  <polygon
                    className="pk-line__area"
                    points={`${x(0).toFixed(3)},${y(0)} ${points(s.values)} ${x(
                      s.values.length - 1,
                    ).toFixed(3)},${y(0)}`}
                  />
                ) : null}
                <polyline className="pk-line" points={points(s.values)} />
              </g>
            ))}
          </svg>
          {series.map((s) => (
            <g key={s.name} data-tone={s.tone ?? 'cyan'}>
              {s.values.map((v, i) => (
                <circle key={i} className="pk-line__dot" cx={pct(x(i))} cy={y(v)} r="4" />
              ))}
            </g>
          ))}
          {labels.map((label, i) => (
            <text
              key={label}
              className="pk-svg-text pk-colchart__label"
              x={pct(x(i))}
              y={height - 8}
              textAnchor="middle"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
      <ul className="pk-legend">
        {series.map((s) => (
          <li key={s.name} data-tone={s.tone ?? 'cyan'}>
            {s.name}
          </li>
        ))}
      </ul>
    </>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  tone?: Tone;
}

/** Ringdiagramm mit Mitteltext, daneben optional eine Balkenliste. */
export function Donut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg className="pk-donut" viewBox="0 0 160 160" aria-hidden="true">
      <circle className="pk-arc-track" cx="80" cy="80" r={r} />
      {segments.map((s) => {
        const len = (Math.max(0, s.value) / total) * c;
        const el = (
          <circle
            key={s.label}
            className="pk-arc"
            data-tone={s.tone ?? 'cyan'}
            cx="80"
            cy="80"
            r={r}
            strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          />
        );
        offset += len;
        return el;
      })}
      <text className="pk-donut__center-label" x="80" y="72" textAnchor="middle">
        {centerLabel}
      </text>
      <text className="pk-donut__center-value" x="80" y="96" textAnchor="middle">
        {centerValue}
      </text>
    </svg>
  );
}
