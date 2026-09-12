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
              Ereignis-Stream
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
              Live-Aktivitäten
            </h3>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '11px' }}>
              Letzte Updates (max. 10) · Ebene C
            </span>
          </div>
          <Badge variant={status === 'live' ? 'mint' : 'neutral'} style={{ fontSize: '9.5px' }}>
            {items.length > 0 ? `${items.length} Events` : status}
          </Badge>
        </div>

        {/* Feed Liste mit aria-live="polite" */}
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {items.length > 0 ? (
            items.map((item, idx) => {
              const def = getLiveKpiDefinition(item.kpiId);
              const label = def?.label || item.kpiId;
              const formattedVal = formatActivityValue(item.value, item.unit, def?.format);
              const timeLabel = formatTime(item.occurredAt);

              return (
                <div
                  key={`${item.kpiId}-${item.occurredAt}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(0, 242, 254, 0.15)',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: item.qualityStatus === 'degraded' ? '#ff7a3d' : '#00f2fe',
                        boxShadow: item.qualityStatus === 'degraded' ? '0 0 6px #ff7a3d' : '0 0 6px #00f2fe',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                      <span
                        style={{
                          color: 'var(--color-text)',
                          fontSize: '12px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {label}
                      </span>
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>
                        {timeLabel}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        color: item.qualityStatus === 'degraded' ? '#ff7a3d' : '#00f2fe',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                      }}
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
            <div
              style={{
                padding: '28px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(42, 74, 67, 0.4)',
                margin: '8px 0',
                textAlign: 'center',
              }}
            >
              {/* G39 Welle 1 (Auftrag 054, Block C): Listen-Platzhalter im
                  Ladezustand ergänzen — Status-Text bleibt erhalten. */}
              {status === 'loading' && (
                <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', textAlign: 'left' }}>
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="75%" />
                  <Skeleton variant="text" width="82%" />
                </div>
              )}
              <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                {statusText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border-soft)',
          fontSize: '10.5px',
          color: 'var(--color-text-dim)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Bestätigte Live-Snapshots</span>
        <span>Reihenfolge: Zeit (absteigend)</span>
      </div>
    </Card>
  );
});
