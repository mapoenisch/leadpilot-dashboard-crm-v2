// Auftrag 170 (P14b): Zusatzebenen des Liniendiagramms – Vergleichslinie (gestrichelt),
// zweite Reihe mit eigener Achse bei anderer Einheit (nie gemeinsame Achse) und Erwartungsband.
import { useMemo } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import type { TileTimeSeriesExtras } from '../../model/timeseries/types';
import { formatDe, linePath, linePoints, niceScale, type TimeDatumInput } from './depthGeometry';
import { buildBandPath, toChartRows, type AreaRect } from './depthChartHelpers';

const THEME = MANAGEMENT_CHART_THEME.colors;

function maxOf(rows: readonly { value: number | null }[]): number[] {
  return rows.map((r) => r.value).filter((v): v is number => v !== null && Number.isFinite(v));
}

export function useLineOverlays(
  data: readonly { value: number | null }[],
  unit: string,
  extras: TileTimeSeriesExtras | undefined,
  area: AreaRect,
) {
  return useMemo(() => {
    const compareRows: TimeDatumInput[] | null = extras?.compare
      ? toChartRows(extras.compare.points)
      : null;
    const secondRows: TimeDatumInput[] | null = extras?.second
      ? toChartRows(extras.second.points)
      : null;
    const ownAxis = Boolean(extras?.second && extras.second.unit !== unit);
    const bandUppers = extras?.bands?.bands?.map((b) => b.upper) ?? [];
    const shared = [
      ...maxOf(data),
      ...(compareRows ? maxOf(compareRows) : []),
      ...(secondRows && !ownAxis ? maxOf(secondRows) : []),
      ...bandUppers,
    ];
    const scale = niceScale(shared.length > 0 ? Math.max(...shared) : 0);
    const secondValues = secondRows ? maxOf(secondRows) : [];
    const secondScale =
      ownAxis && secondValues.length > 0 ? niceScale(Math.max(...secondValues)) : null;
    const comparePoints = compareRows ? linePoints(compareRows, area, scale.max) : null;
    const secondPoints = secondRows
      ? linePoints(secondRows, area, secondScale ? secondScale.max : scale.max)
      : null;
    return { scale, secondScale, comparePoints, secondPoints };
  }, [data, unit, extras, area]);
}

export type LineOverlay = ReturnType<typeof useLineOverlays>;

export function LineOverlayLayers({
  overlay,
  extras,
  basePoints,
  area,
}: {
  overlay: LineOverlay;
  extras: TileTimeSeriesExtras | undefined;
  basePoints: readonly { x: number; index: number }[];
  area: AreaRect;
}) {
  const baseline = area.top + area.height;
  const bands = extras?.bands?.hasBand ? (extras.bands.bands ?? []) : [];
  const bandPath = buildBandPath(basePoints, bands, area, overlay.scale.max);
  const second = overlay.secondScale;
  return (
    <g data-testid="depth-line-overlays">
      {bandPath ? (
        <path
          d={bandPath}
          fill={THEME.glow}
          stroke={THEME.border}
          strokeDasharray="2 2"
          data-testid="expectation-band"
        />
      ) : null}
      {second?.ticks.map((tick) => (
        <text
          key={`r-${tick}`}
          x={area.left + area.width + 8}
          y={baseline - (tick / second.max) * area.height + 4}
          textAnchor="start"
          fontSize="10"
          fill={THEME.secondary}
          data-testid="depth-second-axis-tick"
        >
          {formatDe(tick)}
        </text>
      ))}
      {overlay.comparePoints ? (
        <path
          d={linePath(overlay.comparePoints)}
          fill="none"
          stroke={THEME.neutral}
          strokeWidth="1.8"
          strokeDasharray="5 4"
          data-testid="depth-compare-line"
        />
      ) : null}
      {overlay.secondPoints ? (
        <path
          d={linePath(overlay.secondPoints)}
          fill="none"
          stroke={THEME.secondary}
          strokeWidth="2"
          strokeDasharray="1 3"
          strokeLinecap="round"
          data-testid="depth-second-series-line"
        />
      ) : null}
    </g>
  );
}

/** Legende und Erklärsätze unter dem Diagramm (Linienart, nicht Farbe allein). */
export function LineOverlayNotes({
  extras,
  unit,
}: {
  extras: TileTimeSeriesExtras | undefined;
  unit: string;
}) {
  if (!extras) return null;
  const lines: { id: string; text: string; accent?: boolean }[] = [];
  if (extras.compare) {
    const label = extras.compare.type === 'vorjahr' ? 'gleiche Periode Vorjahr' : 'Vorperiode';
    lines.push({ id: 'compare', text: `Gestrichelte Linie: ${label}` });
    if (extras.compare.partialNotice) {
      lines.push({ id: 'partial', text: extras.compare.partialNotice, accent: true });
    }
  }
  if (extras.second) {
    const axis = extras.second.unit !== unit ? `, rechte Achse in ${extras.second.unit}` : '';
    lines.push({ id: 'second', text: `Gepunktete Linie: ${extras.second.title}${axis}` });
  }
  if (extras.bands) {
    lines.push({
      id: 'bands',
      text: extras.bands.hasBand ? (extras.bands.explanation ?? '') : (extras.bands.reason ?? ''),
    });
  }
  for (const [i, notice] of extras.notices.entries()) {
    lines.push({ id: `notice-${i}`, text: notice, accent: true });
  }
  if (lines.length === 0) return null;
  return (
    <ul
      data-testid="depth-line-notes"
      className="m-0 flex list-none flex-col gap-[2px] p-0 text-[11px]"
    >
      {lines.map((line) => (
        <li
          key={line.id}
          data-testid={`depth-line-note-${line.id}`}
          className={line.accent ? 'text-accent' : 'text-[var(--color-text-muted)]'}
        >
          {line.text}
        </li>
      ))}
    </ul>
  );
}
