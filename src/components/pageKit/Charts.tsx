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
            <svg
              className="pk-bar__track"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect className="pk-track" x="0" y="0" width="100" height="8" rx="4" />
              <rect className="pk-fill" x="0" y="0" width={pct} height="8" rx="4" />
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

/** Säulendiagramm, einzeln oder gruppiert, mit Achse und Legende. */
export function ColumnChart({
  labels,
  series,
  valueSuffix = '',
  highlightLast = false,
}: {
  labels: string[];
  series: ColumnSeries[];
  valueSuffix?: string;
  /** Letzte Säule orange (teuerster Kanal, Planwert). */
  highlightLast?: boolean;
}) {
  const width = 640;
  const height = 260;
  const pad = { top: 24, right: 12, bottom: 36, left: 44 };
  const all = series.flatMap((s) => s.values);
  const maxV = niceCeil(Math.max(...all, 0));
  const minV = -niceCeil(-Math.min(...all, 0));
  const span = maxV - minV || 1;
  const innerH = height - pad.top - pad.bottom;
  const innerW = width - pad.left - pad.right;
  const y = (v: number) => pad.top + ((maxV - v) / span) * innerH;
  const group = innerW / Math.max(labels.length, 1);
  const barW = Math.min(34, (group * 0.62) / Math.max(series.length, 1));
  const ticks = 4;
  return (
    <>
      <svg className="pk-columns" viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = minV + (span * i) / ticks;
          return (
            <g key={i}>
              <line
                className="pk-svg-grid"
                x1={pad.left}
                x2={width - pad.right}
                y1={y(v)}
                y2={y(v)}
              />
              <text className="pk-svg-text" x={pad.left - 6} y={y(v) + 4} textAnchor="end">
                {fmt(Math.round(v))}
              </text>
            </g>
          );
        })}
        {labels.map((label, li) => {
          const gx = pad.left + group * li + (group - barW * series.length) / 2;
          return (
            <g key={label}>
              {series.map((s, si) => {
                const v = s.values[li] ?? 0;
                const top = y(Math.max(v, 0));
                const h = Math.max(2, Math.abs(y(v) - y(0)));
                const tone =
                  highlightLast && li === labels.length - 1 ? 'orange' : (s.tone ?? 'cyan');
                return (
                  <g key={s.name} data-tone={tone}>
                    <rect
                      className="pk-fill"
                      x={gx + si * barW + 2}
                      y={top}
                      width={barW - 4}
                      height={h}
                      rx="3"
                    />
                    {series.length === 1 ? (
                      <text
                        className="pk-svg-text"
                        data-strong="true"
                        x={gx + barW / 2}
                        y={top - 6}
                        textAnchor="middle"
                      >
                        {fmt(v)}
                        {valueSuffix}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <text
                className="pk-svg-text"
                x={pad.left + group * li + group / 2}
                y={height - 12}
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
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
