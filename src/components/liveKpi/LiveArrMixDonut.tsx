import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLiveKpiActivity } from '@/hooks/useLiveKpiActivity';
import { getLiveKpiDefinition } from '@/services/liveKpi/liveKpiDefinitions';

export interface LiveArrMixDonutProps {
  className?: string;
}

const ARR_MIX_IDS = ['arr_direct', 'arr_partner', 'arr_outbound', 'arr_other'] as const;

// 4 klar unterscheidbare Cyan-/Mint-/Teal-Farben aus der Referenz-Farbpalette
const MIX_COLORS = ['#00f2fe', '#3ddc97', '#7cefe6', '#00998a'];
const DEGRADED_COLOR = '#ff7a3d'; // Orange ausschließlich für degraded

function formatEur(val: number): string {
  return `${Math.round(val).toLocaleString('de-DE')} €`;
}

export const LiveArrMixDonut = React.memo(function LiveArrMixDonut({
  className,
}: LiveArrMixDonutProps) {
  const { items } = useLiveKpiActivity(ARR_MIX_IDS);

  const framerReducedMotion = useReducedMotion();
  const shouldReduceMotion =
    Boolean(framerReducedMotion) ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Bestätigte Snapshots den 4 IDs zuordnen
  const { confirmedItems, missingIds, hasDegraded } = useMemo(() => {
    const itemMap = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      if (!itemMap.has(item.kpiId)) {
        itemMap.set(item.kpiId, item);
      }
    }

    const confirmed: {
      id: string;
      label: string;
      value: number;
      qualityStatus: 'valid' | 'degraded';
    }[] = [];
    const missing: { id: string; label: string }[] = [];
    let degradedFound = false;

    for (const id of ARR_MIX_IDS) {
      const def = getLiveKpiDefinition(id);
      const label = def?.label || id;
      const found = itemMap.get(id);

      if (found && typeof found.value === 'number') {
        if (found.qualityStatus === 'degraded') degradedFound = true;
        confirmed.push({
          id,
          label,
          value: found.value,
          qualityStatus: found.qualityStatus,
        });
      } else {
        missing.push({ id, label });
      }
    }

    return {
      confirmedItems: confirmed,
      missingIds: missing,
      hasDegraded: degradedFound,
    };
  }, [items]);

  const isComplete = confirmedItems.length === 4 && missingIds.length === 0;
  const totalArr = useMemo(() => {
    if (!isComplete) return 0;
    return confirmedItems.reduce((acc, curr) => acc + curr.value, 0);
  }, [isComplete, confirmedItems]);

  const chartData = useMemo(() => {
    if (!isComplete || totalArr <= 0) return [];
    return confirmedItems.map((item, index) => {
      const pct = totalArr > 0 ? (item.value / totalArr) * 100 : 0;
      return {
        name: item.label,
        value: item.value,
        pct: Number(pct.toFixed(1)),
        color: item.qualityStatus === 'degraded' ? DEGRADED_COLOR : MIX_COLORS[index % MIX_COLORS.length],
        quality: item.qualityStatus,
      };
    });
  }, [isComplete, confirmedItems, totalArr]);

  return (
    <Card
      data-testid="live-performance-arr-mix"
      variant="glass"
      className={className ? `${className} live-performance-panel` : 'live-performance-panel'}
      role="region"
      aria-label="ARR-Mix nach Akquisitionsquelle"
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
              Portfolio-Split
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
              ARR-Mix nach Akquisitionsquelle
            </h3>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '11px' }}>
              4 Quellen · Streaming-Ebene C
            </span>
          </div>
          <Badge variant={isComplete ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
            {isComplete ? 'Mix vollständig' : `${confirmedItems.length}/4 Werte`}
          </Badge>
        </div>

        {/* Degraded Qualitätswarnung */}
        {hasDegraded && (
          <div style={{ marginBottom: '10px' }}>
            <Badge variant="orange" style={{ padding: '2px 8px', fontSize: '9.5px' }}>
              Qualität eingeschränkt (Degraded Snapshot)
            </Badge>
          </div>
        )}

        {/* Visual Chart / Incomplete State */}
        {isComplete ? (
          <div style={{ width: '100%', height: '200px', minWidth: 0, position: 'relative' }} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={76}
                  paddingAngle={3}
                  isAnimationActive={!shouldReduceMotion}
                  animationDuration={200}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.color}
                      stroke="rgba(6, 22, 19, 0.8)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#051413',
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#ffffff',
                    boxShadow: '0 0 15px rgba(0, 242, 254, 0.15)',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${formatEur(Number(val))} (${item.payload.pct}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Sum Label */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Summe</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }}>
                {Math.round(totalArr / 1000)}k €
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '20px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(42, 74, 67, 0.4)',
              margin: '12px 0',
            }}
          >
            <div style={{ color: 'var(--color-text)', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
              Live-Mix unvollständig – es fehlen bestätigte Werte
            </div>
            <div style={{ color: 'var(--color-text-dim)', fontSize: '11px', lineHeight: 1.4, marginBottom: '10px' }}>
              Zur Vermeidung irreführender Prozentanteile wird der Ring erst gezeichnet, wenn alle 4 Akquisitionsquellen vorliegen.
            </div>
            {missingIds.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Ausstehend:{' '}
                {missingIds.map((m) => (
                  <span
                    key={m.id}
                    style={{
                      display: 'inline-block',
                      background: 'rgba(0, 217, 198, 0.08)',
                      border: '1px solid rgba(0, 217, 198, 0.2)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      marginRight: '4px',
                      marginBottom: '4px',
                      color: 'var(--color-text)',
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zugängliche Tabelle / Liste */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border-soft)',
          fontSize: '11px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text-muted)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(42, 74, 67, 0.3)', textAlign: 'left' }}>
              <th style={{ padding: '2px 0', fontWeight: 600 }}>Quelle</th>
              <th style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600 }}>Status / Wert</th>
              {isComplete && <th style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600 }}>Anteil</th>}
            </tr>
          </thead>
          <tbody>
            {ARR_MIX_IDS.map((id) => {
              const def = getLiveKpiDefinition(id);
              const label = def?.label || id;
              const item = confirmedItems.find((c) => c.id === id);

              if (item) {
                const pct = isComplete && totalArr > 0 ? ((item.value / totalArr) * 100).toFixed(1) : null;
                return (
                  <tr key={id} style={{ borderBottom: '1px solid rgba(42, 74, 67, 0.15)' }}>
                    <td style={{ padding: '3px 0', color: 'var(--color-text)' }}>{label}</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', color: item.qualityStatus === 'degraded' ? '#ff7a3d' : '#00f2fe' }}>
                      {formatEur(item.value)} (bestätigt)
                    </td>
                    {isComplete && <td style={{ padding: '3px 0', textAlign: 'right' }}>{pct}%</td>}
                  </tr>
                );
              }

              return (
                <tr key={id} style={{ borderBottom: '1px solid rgba(42, 74, 67, 0.15)' }}>
                  <td style={{ padding: '3px 0' }}>{label}</td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontStyle: 'italic', color: 'var(--color-text-dim)' }}>
                    ausstehend
                  </td>
                  {isComplete && <td style={{ padding: '3px 0', textAlign: 'right' }}>—</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
