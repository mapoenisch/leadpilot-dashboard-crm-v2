import React from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { Database, Clock, CheckCircle2, AlertTriangle, AlertCircle, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmReadModelEnvelope } from '@/hooks/queries/useCrmQueries';
import {
  deriveProvenanceState,
  type ProvenanceState,
} from '@/services/data/sourceFreshness';
import type { CrmReadModelEnvelope } from '@/types/dataSource';

export interface DataSourceStatusProps {
  /** Darstellungsvariante: 'compact' (Header-Badges) oder 'banner' (ausführlicher Meldekasten). Standard: 'compact'. */
  variant?: 'compact' | 'banner';
  /** Optionaler manueller Envelope. Falls ausgelassen, wird useCrmReadModelEnvelope() verwendet. */
  envelope?: CrmReadModelEnvelope | null;
  /** Optionaler externer Fehler. */
  error?: unknown;
  /** Optionaler Ladezustand. */
  isLoading?: boolean;
  /** Optionale CSS-Klassen. */
  className?: string;
  /** Test-ID für automatisierte Tests. */
  testId?: string;
}

function renderHealthBadge(state: ProvenanceState) {
  switch (state.status) {
    case 'healthy':
      return (
        <Badge variant="mint" size="sm" icon={<CheckCircle2 size={12} aria-hidden="true" />}>
          Status: {state.statusLabel}
        </Badge>
      );
    case 'empty':
      return (
        <Badge variant="neutral" size="sm" icon={<Layers size={12} aria-hidden="true" />}>
          Status: {state.statusLabel}
        </Badge>
      );
    case 'degraded':
      return (
        <Badge variant="orange" size="sm" icon={<AlertTriangle size={12} aria-hidden="true" />}>
          Status: {state.statusLabel}
        </Badge>
      );
    case 'unavailable':
      return (
        <Badge variant="red" size="sm" icon={<AlertCircle size={12} aria-hidden="true" />}>
          Status: {state.statusLabel}
        </Badge>
      );
  }
}

function renderFreshnessBadge(state: ProvenanceState) {
  if (state.status === 'unavailable') {
    return (
      <Badge variant="red" size="sm" icon={<AlertCircle size={12} aria-hidden="true" />}>
        Frische: Keine Daten ({state.errorCode ?? 'Fehler'})
      </Badge>
    );
  }

  switch (state.freshness) {
    case 'fresh':
      return (
        <Badge variant="mint" size="sm" icon={<Clock size={12} aria-hidden="true" />}>
          Frische: {state.freshnessLabel} ({state.ageText})
        </Badge>
      );
    case 'stale':
      return (
        <Badge variant="orange" size="sm" icon={<Clock size={12} aria-hidden="true" />}>
          Frische: {state.freshnessLabel} ({state.ageText})
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="red" size="sm" icon={<Clock size={12} aria-hidden="true" />}>
          Frische: {state.freshnessLabel} ({state.ageText})
        </Badge>
      );
  }
}

function DataSourceStatusView({
  variant = 'compact',
  envelope,
  error,
  isLoading,
  className = '',
  testId = 'data-source-status',
}: DataSourceStatusProps) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div
        data-testid={testId}
        role="status"
        aria-label="Datenquellenstatus wird geladen"
        className={`flex items-center gap-2 flex-wrap text-[11px] text-[var(--color-text-dim)] ${className}`}
      >
        <Badge variant="neutral" size="sm" icon={<Clock size={12} className="animate-spin" aria-hidden="true" />}>
          Lade Quellenstatus…
        </Badge>
      </div>
    );
  }

  const state = deriveProvenanceState(envelope, error, now);

  if (variant === 'banner') {
    if (state.status === 'unavailable') {
      return (
        <div data-testid={testId} role="alert" className={`w-full ${className}`}>
          <Alert variant="error" title="Datenquelle nicht verfügbar">
            <div className="flex flex-col gap-1 text-[12px]">
              <div>
                <strong>Quelle:</strong> {state.sourceLabel} ({state.isSynthetic ? 'Synthetisch' : 'Real'})
              </div>
              <div>{state.statusDescription}</div>
              <div className="text-[11px] text-[var(--color-text-dim)]">
                Es werden keine Ersatzdaten oder Annahmen angezeigt (Fail-Closed).
              </div>
            </div>
          </Alert>
        </div>
      );
    }

    if (state.status === 'degraded') {
      const audit = envelope?.data?.audit;
      const errorDetails: string[] = [];
      if (audit?.companiesErrors) errorDetails.push(`${audit.companiesErrors} Fehler bei Unternehmen`);
      if (audit?.contactsErrors) errorDetails.push(`${audit.contactsErrors} Fehler bei Kontakten`);
      if (audit?.dealsErrors) errorDetails.push(`${audit.dealsErrors} Fehler bei Deals`);

      return (
        <div data-testid={testId} role="alert" className={`w-full ${className}`}>
          <Alert variant="warning" title="Eingeschränkte Datenqualität (degraded)">
            <div className="flex flex-col gap-1 text-[12px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  <strong>Quelle:</strong> {state.sourceLabel} ({state.isSynthetic ? 'Synthetisch' : 'Real'})
                </span>
                <span>·</span>
                <span>
                  <strong>Abruf:</strong> {state.formattedFetchedAt} ({state.ageText})
                </span>
              </div>
              <div>{state.statusDescription}</div>
              {errorDetails.length > 0 && (
                <ul className="list-disc pl-4 text-[11px] text-[var(--color-text-dim)] mt-1">
                  {errorDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </Alert>
        </div>
      );
    }

    return (
      <div
        data-testid={testId}
        role="status"
        aria-label="Status der Datenquelle"
        className={`border border-solid border-[var(--color-border-soft)] rounded-md p-3 bg-background-deep text-text text-[12px] flex flex-col gap-2 ${className}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="cyan" size="sm" icon={<Database size={12} aria-hidden="true" />}>
              Quelle: {state.sourceLabel}
            </Badge>
            <Badge variant={state.isSynthetic ? 'orange' : 'neutral'} size="sm">
              Modus: {state.isSynthetic ? 'Synthetisch' : 'Real'}
            </Badge>
            {renderHealthBadge(state)}
            {renderFreshnessBadge(state)}
          </div>
          <div className="text-[11px] text-[var(--color-text-dim)] font-mono">
            Stand: {state.formattedFetchedAt}
          </div>
        </div>
      </div>
    );
  }

  // Variant 'compact'
  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Status der Datenquelle"
      className={`flex items-center gap-[6px] flex-wrap text-[11px] ${className}`}
    >
      <Badge variant="cyan" size="sm" icon={<Database size={12} aria-hidden="true" />}>
        {state.sourceLabel}
      </Badge>
      <Badge variant={state.isSynthetic ? 'orange' : 'neutral'} size="sm">
        {state.isSynthetic ? 'Synthetisch' : 'Real'}
      </Badge>
      {renderHealthBadge(state)}
      {renderFreshnessBadge(state)}
    </div>
  );
}

function DataSourceStatusEnvelopeLoader(props: DataSourceStatusProps) {
  const { data: envelope, error, isLoading } = useCrmReadModelEnvelope();
  return (
    <DataSourceStatusView
      {...props}
      envelope={props.envelope !== undefined ? props.envelope : envelope}
      error={props.error !== undefined ? props.error : error}
      isLoading={props.isLoading !== undefined ? props.isLoading : isLoading}
    />
  );
}

function DataSourceStatusConnected(props: DataSourceStatusProps) {
  const org = useOrganization();
  if (!org || typeof org !== 'object') {
    return (
      <DataSourceStatusView
        {...props}
        isLoading={false}
        error={new Error('AUTH_REQUIRED')}
      />
    );
  }
  return <DataSourceStatusEnvelopeLoader {...props} />;
}

/**
 * 067O / Gate G61 — Einheitliche, barrierefreie Datenquellen- und Frischeanzeige.
 * Kommuniziert Zustand niemals nur über Farbe (immer Text + semantische Icons).
 * `degraded` und `unavailable` heben sich optisch unmissverständlich von Live-Zuständen ab.
 */
export function DataSourceStatus(props: DataSourceStatusProps) {
  const queryClient = React.useContext(QueryClientContext);
  if (!queryClient || props.envelope !== undefined) {
    return <DataSourceStatusView {...props} />;
  }
  return <DataSourceStatusConnected {...props} />;
}
