import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
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
  const { snapshot, status } = useLiveKpi(kpiId);

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
    prevValueRef.current !== currentValue,
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
    >
      {/* G39 Welle 1: Card-Layout per umhüllendem Div (Card hat kein
          className-Prop, nur style-Passthrough — API unverändert). */}
      <div className="flex flex-col justify-between min-h-[140px] relative overflow-hidden">
        {/* Rein dekoratives Data-Pulse-Overlay (1.2s, Cyan #00f2fe, key-gebunden) */}
        {shouldAnimate && !shouldReduceMotion && snapshot && (
          <div
            key={snapshot.id || snapshot.occurredAt}
            className="live-kpi-pulse pointer-events-none"
            aria-hidden="true"
          />
        )}
        {/* Header-Zeile: Titel, Ebene-C-Kennzeichnung und Verbindungs-Badge */}
        <div>
          <div className="flex items-center justify-between gap-[8px] mb-[6px]">
            <div className="flex items-center gap-[6px]">
              <span className="text-[12.5px] font-semibold text-[var(--color-text-muted)]">
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
            <div className="text-[11px] mb-[8px] text-[var(--color-text-dim)]">{description}</div>
          )}

          {/* Hauptwertanzeige je nach Status */}
          {status === 'unconfigured' ? (
            <div className="border border-solid border-[rgba(0,242,254,0.18)] rounded-md bg-[rgba(6,22,19,0.55)] my-[8px] mx-0 p-[12px]">
              <div className="text-text text-[12px] font-medium mb-[2px]">
                Supabase nicht konfiguriert
              </div>
              <div className="text-[11px] leading-[1.4] text-[var(--color-text-dim)]">
                Ebene C Live-Ist inaktiv. Keine synthetischen Fake-Werte erfunden.
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="border border-solid border-error rounded-md bg-[rgba(239,68,68,0.05)] my-[8px] mx-0 p-[12px]">
              <div className="text-error text-[12px] font-medium">
                Realtime-Verbindung unterbrochen
              </div>
              <div className="text-[11px] mt-[2px] text-[var(--color-text-muted)]">
                Live-Feed vorübergehend nicht erreichbar. Verbindung wird automatisch
                wiederhergestellt.
              </div>
            </div>
          ) : snapshot ? (
            <div>
              <div
                className={`font-display text-[32px] font-bold tracking-[-0.02em] leading-[1.15] my-[8px] mx-0 mb-[4px] ${snapshot.qualityStatus === 'degraded' ? 'text-accent' : 'text-success'}`}
              >
                <AnimatedKpiValue
                  value={snapshot.value}
                  unit={snapshot.unit}
                  fallbackUnit={fallbackUnit}
                  shouldAnimate={shouldAnimate}
                />
              </div>

              {snapshot.qualityStatus === 'degraded' && (
                <div className="inline-block mb-[4px]">
                  <Badge variant="orange" style={{ padding: '1px 6px', fontSize: '9px' }}>
                    Qualität eingeschränkt (Degraded)
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[13px] italic my-[16px] mx-0 mb-[10px] text-[var(--color-text-muted)]">
              {/* G39 Welle 1 (Auftrag 054, Block C): Skeleton-Platzhalter im
                Layout der eigentlichen Inhalte (Wert + Meta-Zeile) ergänzen —
                der Status-Text bleibt als zugängliche Auskunft erhalten. */}
              {status === 'loading' && (
                <div aria-hidden="true" className="flex flex-col gap-[6px] mb-[10px]">
                  <Skeleton variant="rect" width="55%" height={32} />
                  <Skeleton variant="text" width="80%" />
                </div>
              )}
              {status === 'loading'
                ? 'Lade aktuellen Snapshot...'
                : 'Warte auf Live-Events (Ebene C)...'}
            </div>
          )}
        </div>

        {/* Footer-Zeile: Metadaten & Observability */}
        <div className="border-0 flex justify-between items-center text-[11px] leading-[1.4] border-t border-solid border-border-soft mt-[6px] pt-[6px] text-[var(--color-text-muted)]">
          <span>{snapshot ? `Quelle: ${snapshot.sourceSystem}` : 'Quelle: n8n / Live-Feed'}</span>
          <span
            title={snapshot ? `Exakter Zeitstempel: ${snapshot.occurredAt}` : undefined}
            className={snapshot ? 'cursor-help' : 'cursor-default'}
          >
            {snapshot
              ? `Aktualisiert: ${formatRelativeTime(snapshot.occurredAt) || formatTimestamp(snapshot.occurredAt)}`
              : 'Stand: Ausstehend'}
          </span>
        </div>
      </div>
    </Card>
  );
});
