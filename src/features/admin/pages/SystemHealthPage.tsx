// G62 (Auftrag 067P, Step 4b): Systemdiagnose-Seite fuer Administratoren.
// Zeigt 5 Subsystem-Status-Karten (Auth, Database, Ingress, Sync, Worker)
// ohne Secrets, Tokens oder PII. Diagnosedaten werden bei Bedarf neu abgerufen.
import { useState, useCallback } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import {
  systemHealthService,
  type SystemHealthSnapshot,
  type SubsystemHealth,
  type HealthStatus,
} from '@/services/health/systemHealthService';

// ---------------------------------------------------------------- Forbidden-Guard
function ForbiddenView() {
  return (
    <section aria-label="Systemdiagnose" className="p-[var(--space-6)]">
      <div
        role="alert"
        className="rounded-lg border border-red-800/40 bg-red-900/20 p-[var(--space-4)] text-sm text-red-300"
      >
        <strong>Zugriff verweigert.</strong> Diese Seite ist nur für Administratoren zugänglich.
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Status-Badge
interface StatusBadgeProps {
  status: HealthStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<HealthStatus, string> = {
    ok: 'OK',
    degraded: 'Eingeschränkt',
    error: 'Fehler',
    unknown: 'Unbekannt',
  };
  const colors: Record<HealthStatus, string> = {
    ok: 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400',
    degraded: 'bg-yellow-900/30 border-yellow-700/40 text-yellow-400',
    error: 'bg-red-900/30 border-red-800/40 text-red-400',
    unknown: 'bg-[var(--color-surface)] border-border text-[var(--color-text-muted)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[status]}`}
      data-testid={`status-badge-${status}`}
    >
      <span aria-hidden="true">
        {status === 'ok' ? '●' : status === 'error' ? '✕' : status === 'degraded' ? '▲' : '?'}
      </span>
      {labels[status]}
    </span>
  );
}

// ---------------------------------------------------------------- Subsystem-Karte
interface SubsystemCardProps {
  subsystem: SubsystemHealth;
}

function SubsystemCard({ subsystem }: SubsystemCardProps) {
  return (
    <div
      className="rounded-lg border border-border bg-background-deep p-[var(--space-4)] flex flex-col gap-2"
      data-testid={`subsystem-card-${subsystem.name}`}
      aria-label={`Subsystem ${subsystem.name}: ${subsystem.status}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text capitalize">{subsystem.name}</span>
        <StatusBadge status={subsystem.status} />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">{subsystem.message}</p>
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
        {subsystem.latencyMs !== null && (
          <span>
            Latenz: <span className="font-mono">{subsystem.latencyMs} ms</span>
          </span>
        )}
        <span>Geprüft: {new Date(subsystem.checkedAt).toLocaleTimeString('de-DE')}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Overall-Banner
interface OverallBannerProps {
  status: HealthStatus;
  snapshotAt: string;
}

function OverallBanner({ status, snapshotAt }: OverallBannerProps) {
  const bannerColors: Record<HealthStatus, string> = {
    ok: 'border-emerald-700/40 bg-emerald-900/20 text-emerald-300',
    degraded: 'border-yellow-700/40 bg-yellow-900/20 text-yellow-300',
    error: 'border-red-800/40 bg-red-900/20 text-red-300',
    unknown: 'border-border bg-surface text-[var(--color-text-muted)]',
  };
  const labels: Record<HealthStatus, string> = {
    ok: 'Alle Systeme betriebsbereit.',
    degraded: 'Mindestens ein Subsystem ist eingeschränkt.',
    error: 'Mindestens ein Subsystem meldet einen Fehler.',
    unknown: 'Systemstatus unbekannt.',
  };

  return (
    <div
      role="status"
      className={`mb-[var(--space-5)] flex items-center justify-between rounded-lg border p-[var(--space-4)] ${bannerColors[status]}`}
      data-testid="overall-status-banner"
    >
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <span className="text-sm font-medium">{labels[status]}</span>
      </div>
      <span className="text-xs text-[var(--color-text-dim)]">
        Stand: {new Date(snapshotAt).toLocaleString('de-DE')}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Hauptseite
export function SystemHealthPage() {
  const { session, isLoading: isOrgLoading } = useOrganization();

  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runDiagnosis = useCallback(async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const result = await systemHealthService.getSystemHealth();
      setSnapshot(result);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Diagnose fehlgeschlagen.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  if (isOrgLoading) {
    return (
      <section aria-label="Systemdiagnose" className="p-[var(--space-6)]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Lade Organisationsdaten...
        </div>
      </section>
    );
  }

  if (!session || session.role !== 'admin') {
    return <ForbiddenView />;
  }

  const subsystemOrder = ['auth', 'database', 'ingress', 'sync', 'worker'] as const;

  return (
    <section aria-label="Systemdiagnose" className="p-[var(--space-6)]">
      <div className="mb-[var(--space-6)] flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-text">Systemdiagnose</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Statusprüfung der 5 Kernsysteme — ohne Secrets oder PII.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runDiagnosis()}
          disabled={isChecking}
          aria-busy={isChecking}
          data-testid="run-diagnosis-btn"
          className="shrink-0 rounded border-0 bg-primary px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90 disabled:opacity-50"
        >
          {isChecking ? 'Prüfe...' : 'Diagnose starten'}
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {!snapshot && !isChecking && (
        <div className="rounded-lg border border-border bg-surface p-[var(--space-8)] text-center text-sm text-[var(--color-text-muted)]">
          Klicke auf „Diagnose starten", um den Systemstatus zu prüfen.
        </div>
      )}

      {snapshot && (
        <>
          <OverallBanner status={snapshot.overallStatus} snapshotAt={snapshot.snapshotAt} />
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Subsystem-Statusübersicht"
            data-testid="subsystem-grid"
          >
            {subsystemOrder.map((key) => {
              const sub = snapshot.subsystems[key];
              return sub ? <SubsystemCard key={key} subsystem={sub} /> : null;
            })}
          </div>
        </>
      )}
    </section>
  );
}
