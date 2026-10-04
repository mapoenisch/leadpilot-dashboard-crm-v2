// Designprobe Dashboard-Testkachel (Teilauftrag 0): Ring und Kreis in Draufsicht.
// Stil nach Referenz Marc (02.10.2026): Türkis-Abstufung, dunkle Fugen zwischen den Segmenten,
// Wölbung durch Verlauf (innen dunkler, Außenkante heller), Licht von oben wie bei den Säulen,
// dezentes Leuchten. Keine Neigung und keine Verschiebung: Die Winkel bleiben exakte Anteile.
import { useMemo } from 'react';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
import {
  ChartReadout,
  ChartSummary,
  LegendButtons,
  ScrollableChart,
  useActiveDatum,
} from './ChartReadout';
import { CHART_VIEWBOX, shareColors, shadeHex } from './chartTypes';
import type { DepthChartProps } from './chartTypes';
import { donutSegments, formatDe, shortenLabel, summarizeSeries } from './depthGeometry';

/** Legendenspalte neben dem Ring: Platz für etwa 16 Zeichen vor der Prozentangabe. */
const LEGEND_LABEL_MAX = 16;

const RING_GEOMETRY = { cx: 180, cy: 136, outer: 104, inner: 66 };
// Kreis: gleiche Lage, nur ohne Aussparung.
const PIE_GEOMETRY = { ...RING_GEOMETRY, inner: 0 };
// Fugenfarbe wie der Kartenhintergrund: trennt die Segmente sichtbar.
const GAP = '#061615';

/** Verlaufsstopps je Segment: innen abgedunkelt, Mitte Grundfarbe, helle Lichtkante außen. */
// Der Kreis hat keine Aussparung: Die Mitte wird nur leicht abgedunkelt, sonst wirkt sie trüb.
function bevelStops(color: string, innerRatio: number) {
  return [
    { offset: innerRatio, color: shadeHex(color, innerRatio > 0 ? -0.55 : -0.3) },
    { offset: innerRatio + (1 - innerRatio) * 0.3, color: shadeHex(color, -0.2) },
    { offset: 0.84, color },
    { offset: 0.95, color: shadeHex(color, 0.35) },
    { offset: 1, color: shadeHex(color, 0.1) },
  ];
}

export function Depth3dDonutChart({
  idPrefix,
  data,
  unit,
  period,
  title,
  reducedMotion,
  formatValue,
  stableLegend = false,
  solid = false,
}: DepthChartProps) {
  const GEOMETRY = solid ? PIE_GEOMETRY : RING_GEOMETRY;
  const [active, setActive] = useActiveDatum(data);
  const segments = useMemo(() => donutSegments(data, GEOMETRY), [data, GEOMETRY]);
  const colors = useMemo(() => shareColors(data.map((entry) => entry.value)), [data]);
  const colorOf = (index: number) => colors[index] ?? '#1E7F7C';
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const glow = `${idPrefix}-ring-glow`;
  const sheen = `${idPrefix}-ring-sheen`;
  const hole = `${idPrefix}-ring-hole`;
  const summaryId = `${idPrefix}-summary`;
  const summary = useMemo(
    () => summarizeSeries(data, unit, period, 'share', formatValue),
    [data, unit, period, formatValue],
  );
  const transition = reducedMotion ? '' : 'transition-opacity duration-150';

  return (
    <div className="flex flex-col gap-[10px]" data-testid="depth-donut-chart">
      <ScrollableChart label={`${title}: ${solid ? 'Kreis' : 'Ring'}, waagerecht scrollbar`}>
        <svg
          viewBox={`0 0 ${CHART_VIEWBOX.width} ${CHART_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label={`${title}: ${solid ? 'Kreis' : 'Ring'}`}
          aria-describedby={summaryId}
          className="block h-auto w-full min-w-[560px]"
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            {segments.map((segment) => (
              <radialGradient
                key={segment.label}
                id={`${idPrefix}-seg-${segment.index}`}
                gradientUnits="userSpaceOnUse"
                cx={GEOMETRY.cx}
                cy={GEOMETRY.cy}
                r={GEOMETRY.outer}
              >
                {bevelStops(colorOf(segment.index), GEOMETRY.inner / GEOMETRY.outer).map((stop) => (
                  <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                ))}
              </radialGradient>
            ))}
            {/* Licht von oben wie bei den Säulen: oben aufgehellt, unten abgedunkelt. */}
            <linearGradient
              id={sheen}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={GEOMETRY.cy - GEOMETRY.outer}
              x2="0"
              y2={GEOMETRY.cy + GEOMETRY.outer}
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
            </linearGradient>
            <radialGradient id={hole} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0b2624" />
              <stop offset="85%" stopColor="#061615" />
              <stop offset="100%" stopColor="#020a0a" />
            </radialGradient>
          </defs>
          {/* Dezentes Leuchten hinter dem Ring. */}
          <g filter={`url(#${glow})`} opacity="0.35" aria-hidden="true">
            {segments.map((segment) => (
              <path key={segment.label} d={segment.path} fill={colorOf(segment.index)} />
            ))}
          </g>
          {segments.map((segment) => {
            const dimmed = active !== null && active !== segment.index;
            const isActive = active === segment.index;
            return (
              <g
                key={segment.label}
                data-testid="depth-ring-segment"
                data-active={isActive ? 'true' : 'false'}
                opacity={dimmed ? 0.45 : 1}
                className={transition}
                onMouseEnter={() => setActive(segment.index)}
              >
                <path d={segment.path} fill={`url(#${idPrefix}-seg-${segment.index})`} />
                <path d={segment.path} fill={`url(#${sheen})`} pointerEvents="none" />
                <path
                  d={segment.path}
                  fill="none"
                  stroke={isActive ? '#ffffff' : GAP}
                  strokeWidth={isActive ? 1.6 : 2.5}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              </g>
            );
          })}
          {solid ? null : (
            <circle
              cx={GEOMETRY.cx}
              cy={GEOMETRY.cy}
              r={GEOMETRY.inner - 1.5}
              fill={`url(#${hole})`}
              stroke={MANAGEMENT_CHART_THEME.colors.primary}
              strokeOpacity="0.18"
              pointerEvents="none"
            />
          )}
          {solid ? null : (
            <>
              <text
                x={GEOMETRY.cx}
                y={GEOMETRY.cy + 2}
                textAnchor="middle"
                fontSize="24"
                fontWeight="700"
                fill="#ffffff"
                fontFamily="var(--font-mono, monospace)"
              >
                {formatDe(total)}
                {unit === '%' ? ' %' : ''}
              </text>
              <text
                x={GEOMETRY.cx}
                y={GEOMETRY.cy + 20}
                textAnchor="middle"
                fontSize="10.5"
                fill={MANAGEMENT_CHART_THEME.colors.neutral}
              >
                {unit && unit !== '%' ? `${unit} gesamt` : 'gesamt'}
              </text>
            </>
          )}
          <g transform="translate(330 62)">
            {segments.map((segment) => (
              <g key={segment.label} transform={`translate(0 ${segment.index * 30})`}>
                <rect width="10" height="10" y="-9" rx="2" fill={colorOf(segment.index)} />
                <text x="18" fontSize="12" fill="#e6f3f1">
                  <title>{segment.label}</title>
                  {shortenLabel(segment.label, LEGEND_LABEL_MAX)}
                </text>
                <text
                  x="180"
                  textAnchor="end"
                  fontSize="12"
                  fill={MANAGEMENT_CHART_THEME.colors.neutral}
                  fontFamily="var(--font-mono, monospace)"
                >
                  {formatDe(Math.round(segment.share * 1000) / 10)} %
                </text>
              </g>
            ))}
          </g>
        </svg>
      </ScrollableChart>
      <ChartSummary id={summaryId} text={summary} />
      <ChartReadout
        entry={active === null ? null : (data[active] ?? null)}
        unit={unit}
        formatValue={formatValue}
        period={period}
      />
      <LegendButtons
        stableHeight={stableLegend}
        data={data}
        activeIndex={active}
        onSelect={setActive}
        colors={colors}
        ariaLabel={solid ? 'Kreisausschnitt wählen' : 'Segment wählen'}
      />
    </div>
  );
}
