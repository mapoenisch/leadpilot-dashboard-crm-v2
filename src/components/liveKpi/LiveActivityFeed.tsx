import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLiveKpiActivity } from '@/hooks/useLiveKpiActivity';
import { getLiveKpiDefinition } from '@/services/liveKpi/liveKpiDefinitions';

export interface LiveActivityFeedProps {
  className?: string;
}

const ACTIVITY_IDS = [
  'arr',
  'mrr',
  'pipeline_coverage',
  'arr_direct',
  'arr_partner',
  'arr_outbound',
  'arr_other',
  'pipeline_leads',
  'pipeline_mql',
  'pipeline_sql',
  'pipeline_offers',
  'pipeline_won',
] as const;

function formatActivityValue(value: number, unit: string, format?: string): string {
  if (format === 'currency' || unit === 'EUR') {
    return `${Math.round(value).toLocaleString('de-DE')} €`;
  }
  if (format === 'ratio' || unit === 'x') {
    return `${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}x`;
  }
  return `${value.toLocaleString('de-DE')}${unit && unit !== 'count' ? ' ' + unit : ''}`;
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

export const LiveActivityFeed = React.memo(function LiveActivityFeed({
  className,
}: LiveActivityFeedProps) {
  const { items, status } = useLiveKpiActivity(ACTIVITY_IDS, 10);

  let statusText = '';
  if (status === 'unconfigured') {
    statusText = 'Supabase nicht konfiguriert – keine Live-Aktivitäten.';
  } else if (status === 'loading') {
    statusText = 'Lade Live-Aktivitäten...';
  } else if (status === 'offline') {
    statusText = 'Warte auf Live-Feed (Offline)...';
  } else if (status === 'error') {
    statusText = 'Verbindungsfehler – Live-Aktivitäten nicht erreichbar.';
  } else if (items.length === 0) {
    statusText = 'Noch keine bestätigten Live-Aktivitäten.';
  }

  return (
    <Card
      data-testid="live-performance-activity"
      variant="glass"
      className={className ? `${className} live-performance-panel` : 'live-performance-panel'}
      role="region"
      aria-label="Live-Aktivitäten Feed"
    >
      {/* G39 Welle 1: Card-Layout per umhüllendem Div (Card hat kein
          className-Prop, nur style-Passthrough — API unverändert). */}
      <div className="flex flex-col justify-between min-h-[360px] relative overflow-hidden min-w-0">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-[8px] mb-[14px]">
            <div>
              <div className="text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-[2px]">
                Ereignis-Stream
              </div>
              <h3 className="m-0 font-display text-[16px] font-semibold text-text">
                Live-Aktivitäten
              </h3>
              <span className="text-[11px] text-[var(--color-text-dim)]">
                Letzte Updates (max. 10) · Ebene C
              </span>
            </div>
            <Badge variant={status === 'live' ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
              {items.length > 0 ? `${items.length} Events` : status}
            </Badge>
          </div>

          {/* Feed Liste mit aria-live="polite" */}
          <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-[8px]">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const def = getLiveKpiDefinition(item.kpiId);
                const label = def?.label || item.kpiId;
                const formattedVal = formatActivityValue(item.value, item.unit, def?.format);
                const timeLabel = formatTime(item.occurredAt);

                return (
                  <div
                    key={`${item.kpiId}-${item.occurredAt}-${idx}`}
                    className="flex items-center justify-between gap-[8px] border border-solid border-[rgba(0,242,254,0.15)] rounded-[8px] bg-[rgba(255,255,255,0.03)] px-[12px] py-[8px]"
                  >
                    <div className="flex items-center gap-[8px] min-w-0">
                      <span
                        className={`w-[6px] h-[6px] rounded-full shrink-0 ${item.qualityStatus === 'degraded' ? 'bg-[#ff7a3d] shadow-[0_0_6px_#ff7a3d]' : 'bg-[#00f2fe] shadow-[0_0_6px_#00f2fe]'}`}
                      />
                      <div className="flex flex-col gap-[1px] min-w-0">
                        <span className="text-text text-[12px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {label}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-text-dim)]">
                          {timeLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-[6px] shrink-0">
                      <span
                        className={`font-mono text-[12.5px] font-bold ${item.qualityStatus === 'degraded' ? 'text-[#ff7a3d]' : 'text-[#00f2fe]'}`}
                      >
                        {formattedVal}
                      </span>
                      {item.qualityStatus === 'degraded' && (
                        <Badge variant="orange" style={{ padding: '1px 5px', fontSize: '8.5px' }}>
                          Degraded
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center border border-solid border-[rgba(42,74,67,0.4)] rounded-md bg-[rgba(255,255,255,0.02)] my-[8px] mx-0 px-[16px] py-[28px]">
                {/* G39 Welle 1 (Auftrag 054, Block C): Listen-Platzhalter im
                  Ladezustand ergänzen — Status-Text bleibt erhalten. */}
                {status === 'loading' && (
                  <div aria-hidden="true" className="flex flex-col gap-[8px] mb-[12px] text-left">
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="75%" />
                    <Skeleton variant="text" width="82%" />
                  </div>
                )}
                <div className="text-[12px] italic text-[var(--color-text-muted)]">
                  {statusText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-0 flex justify-between mt-[12px] pt-[8px] border-t border-solid border-border-soft text-[10.5px] text-[var(--color-text-dim)]">
          <span>Bestätigte Live-Snapshots</span>
          <span>Reihenfolge: Zeit (absteigend)</span>
        </div>
      </div>
    </Card>
  );
});
