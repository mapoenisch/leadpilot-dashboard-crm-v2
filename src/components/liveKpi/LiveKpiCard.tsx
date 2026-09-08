import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLiveKpi } from '@/hooks/useLiveKpi';
import { AnimatedKpiValue } from './AnimatedKpiValue';

export interface LiveKpiCardProps {
  kpiId: string;
  title: string;
  description?: string;
  fallbackUnit?: string;
  className?: string;
}

/**
 * Formatierungshelfer für den Zeitstempel (ISO-8601 -> lokalisierte Zeitanzeige).
 */
function formatTimestamp(isoString: string): string {
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

/**
 * Errechnet eine kompakte relative Zeitangabe für die Observability-Frischeanzeige.
 */
function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 5) return 'gerade eben';
    if (diffSec < 60) return `vor ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `vor ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    return formatTimestamp(isoString);
  } catch {
    return '';
  }
}

/**
 * Isolierte V2-Kennzahlkarte für Ebene C (Live-Ist).
 *
 * Durch React.memo vollständig vom Renderzyklus übergeordneter Dashboards
 * entkoppelt: Nur diese Karte re-rendert bei eintreffenden Realtime-Events.
 */
export const LiveKpiCard = React.memo(function LiveKpiCard({
  kpiId,
  title,
  description,
  fallbackUnit = '',
  className,
}: LiveKpiCardProps) {
  const { snapshot, status, error } = useLiveKpi(kpiId);

  // Status-Tracking für Animation: Nur bei echtem Live-Snapshotwechsel animieren
  const prevKpiIdRef = useRef(kpiId);
  const prevValueRef = useRef<number | null>(null);

  // Reset bei KPI-Wechsel, fehlendem Snapshot, Offline-, Lade-, Fehler- oder unkonfiguriertem Zustand
  if (prevKpiIdRef.current !== kpiId || status !== 'live' || !snapshot) {
    prevKpiIdRef.current = kpiId;
    prevValueRef.current = null;
  }

  const framerReducedMotion = useReducedMotion();
  const shouldReduceMotion =
    Boolean(framerReducedMotion) ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const currentValue = snapshot?.value;
  const shouldAnimate = Boolean(
    status === 'live' &&
    snapshot &&
    prevValueRef.current !== null &&
    typeof currentValue === 'number' &&
    prevValueRef.current !== currentValue
  );

  useEffect(() => {
    if (status === 'live' && snapshot && typeof snapshot.value === 'number') {
      prevValueRef.current = snapshot.value;
    }
  });

  // Status-Badge Konfiguration
  let statusBadgeVariant: 'mint' | 'orange' | 'neutral' | 'red' = 'neutral';
  let statusBadgeLabel = 'Initialisiere';

  switch (status) {
    case 'live':
      statusBadgeVariant = 'mint';
      statusBadgeLabel = 'Live Realtime';
      break;
    case 'loading':
      statusBadgeVariant = 'neutral';
      statusBadgeLabel = 'Lädt...';
      break;
    case 'offline':
      statusBadgeVariant = 'orange';
      statusBadgeLabel = 'Warte auf Feed';
      break;
    case 'error':
      statusBadgeVariant = 'red';
      statusBadgeLabel = 'Verbindungsfehler';
      break;
    case 'unconfigured':
      statusBadgeVariant = 'neutral';
      statusBadgeLabel = 'Offline (Lokal)';
      break;
  }

  return (
    <Card
      data-testid="live-kpi-card"
      data-kpi-id={kpiId}
      variant="glass"
      className={className ? `${className} live-performance-panel` : 'live-performance-panel'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Rein dekoratives Data-Pulse-Overlay (1.2s, Cyan #00f2fe, key-gebunden) */}
      {shouldAnimate && !shouldReduceMotion && snapshot && (
        <div
          key={snapshot.id || snapshot.occurredAt}
          className="live-kpi-pulse"
          aria-hidden="true"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Header-Zeile: Titel, Ebene-C-Kennzeichnung und Verbindungs-Badge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', fontWeight: 600 }}>
              {title}
            </span>
            <Badge variant="mint" style={{ padding: '2px 8px', fontSize: '9.5px' }}>
              Ebene C
            </Badge>
          </div>
          <Badge variant={statusBadgeVariant} style={{ padding: '2px 8px', fontSize: '9.5px' }}>
            {statusBadgeLabel}
          </Badge>
        </div>

        {/* Beschreibung falls übergeben */}
        {description && (
          <div style={{ color: 'var(--color-text-dim)', fontSize: '11px', marginBottom: '8px' }}>
            {description}
          </div>
        )}

        {/* Hauptwertanzeige je nach Status */}
        {status === 'unconfigured' ? (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 22, 19, 0.55)',
              border: '1px solid rgba(0, 242, 254, 0.18)',
              margin: '8px 0',
            }}
          >
            <div style={{ color: 'var(--color-text)', fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>
              Supabase nicht konfiguriert
            </div>
            <div style={{ color: 'var(--color-text-dim)', fontSize: '11px', lineHeight: 1.4 }}>
              Ebene C Live-Ist inaktiv. Keine synthetischen Fake-Werte erfunden.
            </div>
          </div>
        ) : status === 'error' ? (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid var(--color-error)',
              margin: '8px 0',
            }}
          >
            <div style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>
              Realtime-Verbindung unterbrochen
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '2px' }}>
              Live-Feed vorübergehend nicht erreichbar. Verbindung wird automatisch wiederhergestellt.
            </div>
          </div>
        ) : snapshot ? (
          <div>
            <div
              style={{
                color: snapshot.qualityStatus === 'degraded' ? 'var(--color-accent)' : 'var(--color-success)',
                fontFamily: 'var(--font-display)',
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: '8px 0 4px',
              }}
            >
              <AnimatedKpiValue
                value={snapshot.value}
                unit={snapshot.unit}
                fallbackUnit={fallbackUnit}
                shouldAnimate={shouldAnimate}
              />
            </div>

            {snapshot.qualityStatus === 'degraded' && (
              <div style={{ display: 'inline-block', marginBottom: '4px' }}>
                <Badge variant="orange" style={{ padding: '1px 6px', fontSize: '9px' }}>
                  Qualität eingeschränkt (Degraded)
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '13px',
              fontStyle: 'italic',
              margin: '16px 0 10px',
            }}
          >
            {status === 'loading' ? 'Lade aktuellen Snapshot...' : 'Warte auf Live-Events (Ebene C)...'}
          </div>
        )}
      </div>

      {/* Footer-Zeile: Metadaten & Observability */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '11px',
          lineHeight: 1.4,
          borderTop: '1px solid var(--color-border-soft)',
          paddingTop: '6px',
          marginTop: '6px',
        }}
      >
        <span>
          {snapshot ? `Quelle: ${snapshot.sourceSystem}` : 'Quelle: n8n / Live-Feed'}
        </span>
        <span
          title={snapshot ? `Exakter Zeitstempel: ${snapshot.occurredAt}` : undefined}
          style={{ cursor: snapshot ? 'help' : 'default' }}
        >
          {snapshot
            ? `Aktualisiert: ${formatRelativeTime(snapshot.occurredAt) || formatTimestamp(snapshot.occurredAt)}`
            : 'Stand: Ausstehend'}
        </span>
      </div>
    </Card>
  );
});
