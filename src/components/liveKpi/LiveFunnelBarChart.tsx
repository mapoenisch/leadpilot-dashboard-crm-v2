import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLiveKpiActivity } from '@/hooks/useLiveKpiActivity';
import { getLiveKpiDefinition } from '@/services/liveKpi/liveKpiDefinitions';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';

export interface LiveFunnelBarChartProps {
  className?: string;
}

const FUNNEL_IDS = [
  'pipeline_leads',
  'pipeline_mql',
  'pipeline_sql',
  'pipeline_offers',
  'pipeline_won',
] as const;

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: {
    name: string;
    value: number;
    hasValue: boolean;
    color: string;
    quality: 'valid' | 'degraded' | null;
  };
}

/**
 * Typisierte Pseudo-3D SVG-Shape für Funnel-Balken (Gate G26 / Abschnitte 10, 11 & 12).
 * Rendert Vorderseite (rect), Oberseite (polygon), rechte Seitenfläche (polygon)
 * und Boden-Lichtsaum (ellipse).
 */
function renderPseudo3dBar(props: BarShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;

  if (!payload?.hasValue || height <= 0 || width <= 0) {
    return <g key={`empty-${x}-${y}`} />;
  }

  const isDegraded = payload.quality === 'degraded';
  // Tiefe aus Balkenbreite ableiten, begrenzt auf höchstens 8 px (Abschnitt 10)
  const depth = Math.min(8, Math.max(3, Math.round(width * 0.16)));
  const frontWidth = Math.max(1, width - depth);

  // Facetten-Styles
  const frontFill = isDegraded ? 'url(#funnelBarFrontGradOrange)' : 'url(#funnelBarFrontGradCyan)';
  const frontStroke = isDegraded ? '#ff9a66' : '#7cefe6';
  const topFill = isDegraded ? '#ffd1b8' : '#b3f9f4';
  const topStroke = isDegraded ? '#ff9a66' : '#7cefe6';
  const sideFill = isDegraded ? '#8c3500' : '#005e55';
  const sideStroke = isDegraded ? '#c24b00' : '#008a7d';
  const glowFill = isDegraded ? 'rgba(255, 122, 61, 0.5)' : 'rgba(0, 242, 254, 0.55)';

  // Polygone für räumliche Tiefe
  const topPolygon = `${x},${y} ${x + depth},${y - depth} ${x + width},${y - depth} ${x + frontWidth},${y}`;
  const sidePolygon = `${x + frontWidth},${y} ${x + width},${y - depth} ${x + width},${y + height - depth} ${x + frontWidth},${y + height}`;

  const formattedVal = Number(payload.value).toLocaleString('de-DE');

  return (
    <g key={`pseudo3d-bar-${x}-${y}`}>
      {/* Boden-Lichtfleck / Glow */}
      <ellipse
        cx={x + frontWidth / 2}
        cy={y + height}
        rx={Math.max(frontWidth * 0.55, 12)}
        ry={3.5}
        fill={glowFill}
        filter="url(#funnelGroundGlow)"
        opacity={0.8}
      />

      {/* Vorderfläche als rect */}
      <rect
        x={x}
        y={y}
        width={frontWidth}
        height={height}
        fill={frontFill}
        stroke={frontStroke}
        strokeWidth={1}
      />

      {/* Schmale Oberseite als polygon */}
      <polygon
        points={topPolygon}
        fill={topFill}
        stroke={topStroke}
        strokeWidth={1}
      />

      {/* Schmale rechte Seitenfläche als polygon */}
      <polygon
        points={sidePolygon}
        fill={sideFill}
        stroke={sideStroke}
        strokeWidth={0.8}
      />

      {/* Zahlenwert über der Oberseite */}
      <text
        x={x + frontWidth / 2}
        y={y - depth - 6}
        textAnchor="middle"
        fill={isDegraded ? '#ff9a66' : '#ffffff'}
        fontSize={11}
        fontWeight={700}
        fontFamily="var(--font-mono, monospace)"
      >
        {formattedVal}
      </text>
    </g>
  );
}

export const LiveFunnelBarChart = React.memo(function LiveFunnelBarChart({
  className,
}: LiveFunnelBarChartProps) {
  const { items } = useLiveKpiActivity(FUNNEL_IDS);

  const framerReducedMotion = useReducedMotion();
  const shouldReduceMotion =
    Boolean(framerReducedMotion) ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const { stages, hasDegraded, confirmedCount } = useMemo(() => {
    const itemMap = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      if (!itemMap.has(item.kpiId)) {
        itemMap.set(item.kpiId, item);
      }
    }

    let degradedFound = false;
    let confirmed = 0;

    const stageList = FUNNEL_IDS.map((id) => {
      const def = getLiveKpiDefinition(id);
      const label = def?.label || id;
      const found = itemMap.get(id);

      if (found && typeof found.value === 'number') {
        confirmed++;
        if (found.qualityStatus === 'degraded') degradedFound = true;
        return {
          id,
          label,
          hasValue: true,
          value: found.value,
          qualityStatus: found.qualityStatus,
        };
      }

      return {
        id,
        label,
        hasValue: false,
        value: null,
        qualityStatus: null,
      };
    });

    return {
      stages: stageList,
      hasDegraded: degradedFound,
      confirmedCount: confirmed,
    };
  }, [items]);

  // Chart-Daten: Nur Stufen mit bestätigtem Wert erhalten einen Balken
  const chartData = useMemo(() => {
    return stages.map((s) => ({
      name: s.label,
      value: s.hasValue ? s.value : 0,
      hasValue: s.hasValue,
      color: s.qualityStatus === 'degraded' ? '#ff7a3d' : '#00f2fe',
      quality: s.qualityStatus,
    }));
  }, [stages]);

  return (
    <Card
      data-testid="live-performance-funnel"
      variant="glass"
      className={className ? `${className} live-performance-panel` : 'live-performance-panel'}
      role="region"
      aria-label="Live Funnel nach Stufe"
    >
      {/* G39 Welle 1: Card-Layout per cva-Variante. Card hat kein className-
          Merge für Layout — daher umhüllendes Div mit den bisherigen
          Layout-Werten als Klassen. */}
      <div className="flex flex-col justify-between min-h-[360px] relative overflow-hidden min-w-0">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-[8px] mb-[14px]">
          <div>
            <div className="text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-[2px]">
              Operativer Durchlauf
            </div>
            <h3 className="m-0 font-display text-[16px] font-semibold text-text">
              Live Funnel nach Stufe
            </h3>
            <span className="text-[11px] text-[var(--color-text-dim)]">
              5 Stufen · Pseudo-3D-Balken mit Leuchtkanten · Ebene C
            </span>
          </div>
          <Badge variant={confirmedCount > 0 ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
            {confirmedCount === 5 ? '5/5 Stufen aktiv' : `${confirmedCount}/5 bestätigt`}
          </Badge>
        </div>

        {/* Degraded Qualitätswarnung */}
        {hasDegraded && (
          <div className="mb-[10px]">
            <Badge variant="orange" style={{ padding: '2px 8px', fontSize: '9.5px' }}>
              Qualität eingeschränkt (Degraded Snapshot in einer Stufe)
            </Badge>
          </div>
        )}

        {/* Recharts BarChart mit Pseudo-3D shape */}
        {confirmedCount > 0 ? (
          <div className="w-full h-[220px] min-w-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 24, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  {/* SVG Filter für weichen Boden-Lichtsaum */}
                  <filter id="funnelGroundGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                  </filter>
                  {/* Gradients für Vorderflächen */}
                  <linearGradient id="funnelBarFrontGradCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#006b63" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="funnelBarFrontGradOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9a66" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#993d00" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={MANAGEMENT_CHART_THEME.colors.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke={MANAGEMENT_CHART_THEME.colors.neutral}
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(0, 217, 198, 0.25)' }}
                />
                <YAxis
                  stroke={MANAGEMENT_CHART_THEME.colors.neutral}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: '#051413',
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#ffffff',
                    boxShadow: '0 0 15px rgba(0, 242, 254, 0.15)',
                  }}
                  formatter={(val: unknown, name: unknown, item: { payload?: { hasValue?: boolean } }) => {
                    if (!item.payload?.hasValue) {
                      return ['Warte auf bestätigten Live-Wert', name];
                    }
                    return [`${Number(val).toLocaleString('de-DE')}`, name];
                  }}
                />
                <Bar
                  dataKey="value"
                  shape={renderPseudo3dBar}
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center border border-solid border-[rgba(0,242,254,0.18)] rounded-md bg-[rgba(6,22,19,0.55)] my-[16px] mx-0 px-[16px] py-[28px]">
            <div className="text-[12px] italic text-[var(--color-text-muted)]">
              Warte auf bestätigte Funnel-Snapshots aus n8n / Live-Feed...
            </div>
          </div>
        )}
      </div>

      {/* Tabellenalternative für Barrierefreiheit und 375px Viewport */}
      <div className="mt-[12px] pt-[8px] border-t border-solid border-border-soft text-[11px] overflow-x-auto">
        <table className="w-full border-collapse text-[var(--color-text-muted)]">
          <thead>
            <tr className="border-b border-solid border-[rgba(42,74,67,0.3)] text-left">
              <th className="font-semibold py-[2px] px-0">Stufe</th>
              <th className="font-semibold text-right py-[2px] px-0">Bestätigter Wert</th>
              <th className="font-semibold text-right py-[2px] px-0">Qualität</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.id} className="border-b border-solid border-[rgba(42,74,67,0.15)]">
                <td className="text-text py-[3px] px-0">{stage.label}</td>
                <td
                  className={`text-right py-[3px] px-0 ${stage.hasValue ? 'not-italic text-[#00f2fe]' : 'italic text-[var(--color-text-dim)]'}`}
                >
                  {stage.hasValue && stage.value !== null
                    ? `${stage.value.toLocaleString('de-DE')}`
                    : 'Warte auf bestätigten Live-Wert'}
                </td>
                <td
                  className={`text-right py-[3px] px-0 ${stage.qualityStatus === 'degraded' ? 'text-[#ff7a3d]' : 'text-[var(--color-text-muted)]'}`}
                >
                  {stage.hasValue
                    ? stage.qualityStatus === 'degraded'
                      ? 'Degraded'
                      : 'Gültig'
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </Card>
  );
});
