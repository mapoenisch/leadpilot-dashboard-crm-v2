import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLiveKpiHistory } from '@/hooks/useLiveKpiHistory';
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';

export interface StreamingAreaChartProps {
  className?: string;
}

function formatEur(value: number): string {
  return `${Math.round(value).toLocaleString('de-DE')} €`;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const StreamingAreaChart = React.memo(function StreamingAreaChart({
  className,
}: StreamingAreaChartProps) {
  const { history, status, error } = useLiveKpiHistory('arr');

  const framerReducedMotion = useReducedMotion();
  const shouldReduceMotion =
    Boolean(framerReducedMotion) ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Filterung: Maximal 30 Punkte, begrenzt auf die letzten 30 Minuten
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const now = Date.now();
    const thirtyMinMs = 30 * 60 * 1000;

    return history
      .filter((snap) => {
        const t = new Date(snap.occurredAt).getTime();
        return !isNaN(t) && now - t <= thirtyMinMs;
      })
      .slice(-30)
      .map((snap) => ({
        timestamp: snap.occurredAt,
        timeLabel: formatTime(snap.occurredAt),
        value: snap.value,
        quality: snap.qualityStatus,
      }));
  }, [history]);

  // Status-Text ermitteln
  let statusText = '';
  if (status === 'unconfigured') {
    statusText = 'Supabase nicht konfiguriert – keine Live-ARR-Historie verfügbar.';
  } else if (status === 'loading') {
    statusText = 'Lade Live-ARR-Historie...';
  } else if (status === 'offline') {
    statusText = 'Warte auf Live-Feed (Offline) – keine aktuellen Ereignisse.';
  } else if (status === 'error') {
    statusText = `Verbindungsfehler beim Abruf der Historie: ${error?.message || 'Nicht erreichbar'}`;
  } else if (chartData.length === 0) {
    statusText = 'Noch keine ARR-Ereignisse im 30-Minuten-Fenster erfasst.';
  }

  const hasData = chartData.length > 0;

  return (
    <Card
      data-testid="live-performance-arr-chart"
      variant="glass"
      className={className ? `${className} live-performance-panel` : 'live-performance-panel'}
      role="region"
      aria-label="Live ARR Verlaufsgraph (30-Minuten-Fenster)"
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
              Finanzielle Dynamik
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
              Live ARR Verlauf (30 Min)
            </h3>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '11px' }}>
              Streaming-Ebene C · maximal 30 Datenpunkte · Leuchtkurve mit Halo
            </span>
          </div>
          <Badge variant={status === 'live' ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
            {status === 'live' ? `${chartData.length} Punkte aktiv` : status}
          </Badge>
        </div>

        {/* Visual Chart Area */}
        {hasData ? (
          <div style={{ width: '100%', height: '220px', minWidth: 0 }} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 14, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveArrAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.42} />
                    <stop offset="60%" stopColor="#00d9c6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.0} />
                  </linearGradient>
                  <filter id="liveArrLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f2fe" floodOpacity="0.65" />
                  </filter>
                </defs>
                <CartesianGrid
                  stroke={MANAGEMENT_CHART_THEME.colors.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="timeLabel"
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
                  tickFormatter={(val) => `${Math.round(val / 1000)}k €`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: MANAGEMENT_CHART_THEME.colors.darkBg,
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#ffffff',
                    boxShadow: '0 0 15px rgba(0, 242, 254, 0.15)',
                  }}
                  formatter={(val: unknown) => [formatEur(Number(val)), 'ARR']}
                  labelFormatter={(lbl) => `Zeit: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#00f2fe"
                  strokeWidth={2.5}
                  filter="url(#liveArrLineGlow)"
                  fill="url(#liveArrAreaGradient)"
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={200}
                  dot={(props: { index?: number; key?: string; cx?: number; cy?: number }) => {
                    const isLast = props.index === chartData.length - 1;
                    if (!isLast) return <g key={props.key || `empty-${props.index}`} />;
                    return (
                      <g key={`halo-${props.index}`}>
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={9}
                          fill="none"
                          stroke="#00f2fe"
                          strokeWidth={1.5}
                          opacity={0.5}
                        />
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={5}
                          fill="none"
                          stroke="#00f2fe"
                          strokeWidth={2}
                          opacity={0.9}
                        />
                        <circle cx={props.cx} cy={props.cy} r={2.5} fill="#ffffff" />
                      </g>
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              padding: '28px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(42, 74, 67, 0.4)',
              margin: '16px 0',
              textAlign: 'center',
            }}
          >
            {/* G39 Welle 1 (Auftrag 054, Block C): Chartflächen-Platzhalter
                im Ladezustand ergänzen — Status-Text bleibt erhalten. */}
            {status === 'loading' && (
              <div aria-hidden="true" style={{ marginBottom: '12px' }}>
                <Skeleton variant="rect" width="100%" height={180} />
              </div>
            )}
            <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
              {statusText}
            </div>
          </div>
        )}
      </div>

      {/* Zugängliche Textalternative unterhalb des Charts */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border-soft)',
          fontSize: '11px',
          color: 'var(--color-text-dim)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Textalternative (ARR-Verlauf):{' '}
        </span>
        {hasData ? (
          <span>
            {chartData.length} Datenpunkte im Fenster. Start: {chartData[0]?.timeLabel} (
            {formatEur(chartData[0]?.value ?? 0)}), Aktuell: {chartData[chartData.length - 1]?.timeLabel} (
            {formatEur(chartData[chartData.length - 1]?.value ?? 0)}).
          </span>
        ) : (
          <span>{statusText}</span>
        )}
      </div>
    </Card>
  );
});
