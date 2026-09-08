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
  const { items, status } = useLiveKpiActivity(FUNNEL_IDS);

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
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '360px',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <div>
            <div style={{ color: 'var(--color-primary)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Operativer Durchlauf
            </div>
            <h3
              style={{
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 600,
                margin: 0,
              }}
            >
              Live Funnel nach Stufe
            </h3>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '11px' }}>
              5 Stufen · Pseudo-3D-Balken mit Leuchtkanten · Ebene C
            </span>
          </div>
          <Badge variant={confirmedCount > 0 ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
            {confirmedCount === 5 ? '5/5 Stufen aktiv' : `${confirmedCount}/5 bestätigt`}
          </Badge>
        </div>

        {/* Degraded Qualitätswarnung */}
        {hasDegraded && (
          <div style={{ marginBottom: '10px' }}>
            <Badge variant="orange" style={{ padding: '2px 8px', fontSize: '9.5px' }}>
              Qualität eingeschränkt (Degraded Snapshot in einer Stufe)
            </Badge>
          </div>
        )}

        {/* Recharts BarChart mit Pseudo-3D shape */}
        {confirmedCount > 0 ? (
          <div style={{ width: '100%', height: '220px', minWidth: 0 }} aria-hidden="true">
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
                  formatter={(val: any, name: any, item: any) => {
                    if (!item.payload.hasValue) {
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
          <div
            style={{
              padding: '28px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 22, 19, 0.55)',
              border: '1px solid rgba(0, 242, 254, 0.18)',
              margin: '16px 0',
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
              Warte auf bestätigte Funnel-Snapshots aus n8n / Live-Feed...
            </div>
          </div>
        )}
      </div>

      {/* Tabellenalternative für Barrierefreiheit und 375px Viewport */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border-soft)',
          fontSize: '11px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text-muted)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(42, 74, 67, 0.3)', textAlign: 'left' }}>
              <th style={{ padding: '2px 0', fontWeight: 600 }}>Stufe</th>
              <th style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600 }}>Bestätigter Wert</th>
              <th style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600 }}>Qualität</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.id} style={{ borderBottom: '1px solid rgba(42, 74, 67, 0.15)' }}>
                <td style={{ padding: '3px 0', color: 'var(--color-text)' }}>{stage.label}</td>
                <td
                  style={{
                    padding: '3px 0',
                    textAlign: 'right',
                    color: stage.hasValue ? '#00f2fe' : 'var(--color-text-dim)',
                    fontStyle: stage.hasValue ? 'normal' : 'italic',
                  }}
                >
                  {stage.hasValue && stage.value !== null
                    ? `${stage.value.toLocaleString('de-DE')}`
                    : 'Warte auf bestätigten Live-Wert'}
                </td>
                <td
                  style={{
                    padding: '3px 0',
                    textAlign: 'right',
                    color: stage.qualityStatus === 'degraded' ? '#ff7a3d' : 'var(--color-text-muted)',
                  }}
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
    </Card>
  );
});
