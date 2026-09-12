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
    >
      {/* G39 Welle 1: Card-Layout per umhüllendem Div (Card hat kein
          className-Prop, nur style-Passthrough — API unverändert). */}
      <div className="flex flex-col justify-between min-h-[360px] relative overflow-hidden min-w-0">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-[8px] mb-[14px]">
          <div>
            <div className="text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-[2px]">
              Portfolio-Split
            </div>
            <h3 className="m-0 font-display text-[16px] font-semibold text-text">
              ARR-Mix nach Akquisitionsquelle
            </h3>
            <span className="text-[11px] text-[var(--color-text-dim)]">
              4 Quellen · Streaming-Ebene C
            </span>
          </div>
          <Badge variant={isComplete ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
            {isComplete ? 'Mix vollständig' : `${confirmedItems.length}/4 Werte`}
          </Badge>
        </div>

        {/* Degraded Qualitätswarnung */}
        {hasDegraded && (
          <div className="mb-[10px]">
            <Badge variant="orange" style={{ padding: '2px 8px', fontSize: '9.5px' }}>
              Qualität eingeschränkt (Degraded Snapshot)
            </Badge>
          </div>
        )}

        {/* Visual Chart / Incomplete State */}
        {isComplete ? (
          <div className="w-full h-[200px] min-w-0 relative" aria-hidden="true">
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
                  formatter={(val: unknown, name: unknown, item: { payload?: { pct?: number } }) => [
                    `${formatEur(Number(val))} (${item.payload?.pct}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Sum Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-[10px] uppercase text-[var(--color-text-dim)]">Summe</div>
              <div className="text-[13px] font-bold text-text font-mono">
                {Math.round(totalArr / 1000)}k €
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-solid border-[rgba(42,74,67,0.4)] rounded-md bg-[rgba(255,255,255,0.02)] my-[12px] mx-0 px-[16px] py-[20px]">
            <div className="text-text text-[12.5px] font-semibold mb-[4px]">
              Live-Mix unvollständig – es fehlen bestätigte Werte
            </div>
            <div className="text-[11px] leading-[1.4] mb-[10px] text-[var(--color-text-dim)]">
              Zur Vermeidung irreführender Prozentanteile wird der Ring erst gezeichnet, wenn alle 4 Akquisitionsquellen vorliegen.
            </div>
            {missingIds.length > 0 && (
              <div className="text-[11px] text-[var(--color-text-muted)]">
                Ausstehend:{' '}
                {missingIds.map((m) => (
                  <span
                    key={m.id}
                    className="inline-block border border-solid border-[rgba(0,217,198,0.2)] rounded bg-[rgba(0,217,198,0.08)] text-text mr-[4px] mb-[4px] px-[7px] py-[2px]"
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
      <div className="mt-[12px] pt-[8px] border-t border-solid border-border-soft text-[11px]">
        <table className="w-full border-collapse text-[var(--color-text-muted)]">
          <thead>
            <tr className="border-b border-solid border-[rgba(42,74,67,0.3)] text-left">
              <th className="font-semibold py-[2px] px-0">Quelle</th>
              <th className="font-semibold text-right py-[2px] px-0">Status / Wert</th>
              {isComplete && <th className="font-semibold text-right py-[2px] px-0">Anteil</th>}
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
                  <tr key={id} className="border-b border-solid border-[rgba(42,74,67,0.15)]">
                    <td className="text-text py-[3px] px-0">{label}</td>
                    <td className={`text-right py-[3px] px-0 ${item.qualityStatus === 'degraded' ? 'text-[#ff7a3d]' : 'text-[#00f2fe]'}`}>
                      {formatEur(item.value)} (bestätigt)
                    </td>
                    {isComplete && <td className="text-right py-[3px] px-0">{pct}%</td>}
                  </tr>
                );
              }

              return (
                <tr key={id} className="border-b border-solid border-[rgba(42,74,67,0.15)]">
                  <td className="py-[3px] px-0">{label}</td>
                  <td className="text-right italic py-[3px] px-0 text-[var(--color-text-dim)]">
                    ausstehend
                  </td>
                  {isComplete && <td className="text-right py-[3px] px-0">—</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </Card>
  );
});
