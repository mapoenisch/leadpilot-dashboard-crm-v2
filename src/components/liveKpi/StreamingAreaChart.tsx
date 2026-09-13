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
    >
      {/* G39 Welle 1: Card-Layout per umhüllendem Div (Card hat kein
          className-Prop, nur style-Passthrough — API unverändert). */}
      <div className="flex flex-col justify-between min-h-[360px] relative overflow-hidden min-w-0">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-[8px] mb-[14px]">
            <div>
              <div className="text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-[2px]">
                Finanzielle Dynamik
              </div>
              <h3 className="m-0 font-display text-[16px] font-semibold text-text">
                Live ARR Verlauf (30 Min)
              </h3>
              <span className="text-[11px] text-[var(--color-text-dim)]">
                Streaming-Ebene C · maximal 30 Datenpunkte · Leuchtkurve mit Halo
              </span>
            </div>
            <Badge variant={status === 'live' ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
              {status === 'live' ? `${chartData.length} Punkte aktiv` : status}
            </Badge>
          </div>

          {/* Visual Chart Area */}
          {hasData ? (
            <div className="w-full h-[220px] min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 14, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveArrAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.42} />
                      <stop offset="60%" stopColor="#00d9c6" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.0} />
                    </linearGradient>
                    <filter id="liveArrLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="2.5"
                        floodColor="#00f2fe"
                        floodOpacity="0.65"
                      />
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
            <div className="text-center border border-solid border-[rgba(42,74,67,0.4)] rounded-md bg-[rgba(255,255,255,0.02)] my-[16px] mx-0 px-[16px] py-[28px]">
              {/* G39 Welle 1 (Auftrag 054, Block C): Chartflächen-Platzhalter
                im Ladezustand ergänzen — Status-Text bleibt erhalten. */}
              {status === 'loading' && (
                <div aria-hidden="true" className="mb-[12px]">
                  <Skeleton variant="rect" width="100%" height={180} />
                </div>
              )}
              <div className="text-[12px] italic text-[var(--color-text-muted)]">{statusText}</div>
            </div>
          )}
        </div>

        {/* Zugängliche Textalternative unterhalb des Charts */}
        <div className="border-0 mt-[12px] pt-[8px] border-t border-solid border-border-soft text-[11px] text-[var(--color-text-dim)]">
          <span className="font-semibold text-[var(--color-text-muted)]">
            Textalternative (ARR-Verlauf):{' '}
          </span>
          {hasData ? (
            <span>
              {chartData.length} Datenpunkte im Fenster. Start: {chartData[0]?.timeLabel} (
              {formatEur(chartData[0]?.value ?? 0)}), Aktuell:{' '}
              {chartData[chartData.length - 1]?.timeLabel} (
              {formatEur(chartData[chartData.length - 1]?.value ?? 0)}).
            </span>
          ) : (
            <span>{statusText}</span>
          )}
        </div>
      </div>
    </Card>
  );
});
