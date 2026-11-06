import { memo } from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { FunnelBottleneck } from '../services/funnelAnalyticsService';
import { cn } from '@/lib/utils';

export interface FunnelBottleneckAlertProps {
  bottlenecks: FunnelBottleneck[];
  className?: string;
  showAllClear?: boolean;
}

export const FunnelBottleneckAlert = memo(function FunnelBottleneckAlert({
  bottlenecks,
  className,
  showAllClear = false,
}: FunnelBottleneckAlertProps) {
  if (bottlenecks.length === 0) {
    if (!showAllClear) return null;
    return (
      <aside
        aria-label="Pipeline-Status"
        className={cn(
          'flex items-center gap-3 rounded-xl border border-solid border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-text shadow-sm',
          className,
        )}
      >
        <ShieldCheck className="shrink-0 text-emerald-400" size={18} aria-hidden="true" />
        <div>
          <strong className="block font-semibold text-emerald-400">
            Keine kritischen Vertriebs-Engpässe identifiziert
          </strong>
          <span className="text-text-muted">
            Alle Deals verweilen innerhalb der geplanten Zykluszeiten (unter 25 Tage Liegedauer).
          </span>
        </div>
      </aside>
    );
  }

  const primaryBottleneck = bottlenecks[0];
  if (!primaryBottleneck) return null;

  return (
    <aside
      role="alert"
      aria-label="Vertriebs-Engpass identifiziert"
      data-testid="funnel-bottleneck-alert"
      className={cn(
        'relative overflow-hidden rounded-xl border border-solid border-[#FF7A3D]/40 bg-[#FF7A3D]/10 p-4 shadow-sm md:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF7A3D]/20 text-[#FF7A3D]">
          <AlertTriangle size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-text">
              Engpass identifiziert:{' '}
              <span className="text-[#FF7A3D]">
                {primaryBottleneck.dealCount} Deals verweilen über{' '}
                {primaryBottleneck.avgDaysInStage.toLocaleString('de-DE')} Tage in Phase „
                {primaryBottleneck.stageName}“
              </span>
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-solid border-[#FF7A3D]/30 bg-[#FF7A3D]/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#FF7A3D]">
              <Clock size={11} aria-hidden="true" />
              Plan: {primaryBottleneck.planDays} Tage (Schwelle: {primaryBottleneck.thresholdDays}{' '}
              d)
            </span>
          </div>

          <p className="mt-1.5 text-xs text-text/90 leading-relaxed">
            {primaryBottleneck.recommendation}
          </p>

          {bottlenecks.length > 1 && (
            <div className="mt-3 border-t border-solid border-[#FF7A3D]/20 pt-2.5">
              <span className="text-[11px] font-semibold text-text-muted">
                Weitere erkannte Verzögerungen ({bottlenecks.length - 1}):
              </span>
              <ul className="mt-1 list-none space-y-1 p-0 text-xs text-text-muted">
                {bottlenecks.slice(1).map((b) => (
                  <li key={b.stageKey} className="flex items-center gap-2">
                    <ArrowRight size={12} className="text-[#FF7A3D]" aria-hidden="true" />
                    <span>
                      <strong className="text-text">{b.stageName}:</strong> {b.dealCount} Deals mit
                      Ø {b.avgDaysInStage.toLocaleString('de-DE')} Tagen (Plan: {b.planDays} d)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});
