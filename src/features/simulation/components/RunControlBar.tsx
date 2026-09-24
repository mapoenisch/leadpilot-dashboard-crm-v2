import { useEffect, useState } from 'react';
import { useOrganization } from '../../../auth/organizationContext';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { allowedRunCommands, canControlRuns } from '../../../simulation/runControlService';
import { currentRunControlStatus } from '../../../store/slices/runSlice';
import { useRunControl } from '../../../store/hooks';
import type { RunControlCommand } from '../../../types/runControl';

// 067Q / G63: Steuerleiste für den aktiven Run. Angeboten wird nur, was Rolle
// und Zustand erlauben (runControlService); Viewer sehen den Zustand read-only.
// Der Zustand wird nie nur über Farbe vermittelt (Text + role="status").

const STATUS_TEXT: Record<string, string> = {
  queued: 'Run wartet',
  running: 'Run rechnet',
  progress: 'Run rechnet',
  paused: 'Run pausiert',
  cancelled: 'Run abgebrochen',
  failed: 'Run fehlgeschlagen',
};

function useCommandRunner() {
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => unknown) => {
    setError(null);
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.catch((err: unknown) =>
          setError((err instanceof Error ? err.message : '') || 'Befehl fehlgeschlagen.'),
        );
      }
    } catch (err) {
      setError((err instanceof Error ? err.message : '') || 'Befehl fehlgeschlagen.');
    }
  };
  return { error, run };
}

export function RunControlBar() {
  const { session } = useOrganization();
  const role = session?.role ?? null;
  const control = useRunControl();
  const { error, run } = useCommandRunner();
  const status = currentRunControlStatus(control.runProgress, control.interruptedRun);
  if (!status) return null;

  const allowed = new Set<RunControlCommand>(allowedRunCommands(status, role));
  const progress = control.runProgress;
  const shownError = error ?? control.runControlError;

  return (
    <div
      data-testid="run-control-bar"
      className="flex flex-col gap-[8px] rounded-md border border-solid border-border-soft bg-background-deep px-[12px] py-[10px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <div role="status" aria-live="polite" className="text-[12px] text-primary">
          <span data-testid="run-control-status">{STATUS_TEXT[status]}</span>
          {progress && (
            <span data-testid="run-control-units" className="ml-[6px] text-text">
              {progress.processedUnits}/{progress.totalUnits}
            </span>
          )}
          {!canControlRuns(role) && (
            <span className="ml-[8px] text-[var(--color-text-muted)]">(nur Lesezugriff)</span>
          )}
        </div>
        <div className="flex flex-wrap gap-[8px]">
          {allowed.has('pause') && (
            <Button size="sm" variant="secondary" onClick={() => run(() => control.pauseRun(role))}>
              Pausieren
            </Button>
          )}
          {allowed.has('resume') && (
            <Button size="sm" variant="primary" onClick={() => run(() => control.resumeRun(role))}>
              Fortsetzen
            </Button>
          )}
          {allowed.has('cancel') && (
            <Button size="sm" variant="danger" onClick={() => run(() => control.cancelRun(role))}>
              Abbrechen
            </Button>
          )}
          {allowed.has('retry') && (
            <Button size="sm" variant="primary" onClick={() => run(() => control.retryRun(role))}>
              Wiederholen
            </Button>
          )}
        </div>
      </div>
      {!progress && control.interruptedRun && (
        <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
          {control.interruptedRun.message} Wiederholen startet dieselbe Version mit demselben Seed.
        </p>
      )}
      {shownError && (
        <div role="alert">
          <Alert variant="error" title="Run-Steuerung">
            {shownError}
          </Alert>
        </div>
      )}
    </div>
  );
}

/** Gespeicherte Pausen der eigenen Organisation (nach Reload oder in zweiter Sitzung). */
export function PausedRunsPanel() {
  const { session } = useOrganization();
  const role = session?.role ?? null;
  const control = useRunControl();
  const { error, run } = useCommandRunner();
  const { loadPausedRuns } = control;
  const organizationId = session?.organizationId;

  useEffect(() => {
    if (organizationId) void loadPausedRuns(organizationId);
  }, [organizationId, loadPausedRuns]);

  if (control.pausedRuns.length === 0 || control.runProgress) return null;
  const canControl = canControlRuns(role);

  return (
    <section
      aria-label="Pausierte Runs"
      data-testid="paused-runs"
      className="flex flex-col gap-[8px] rounded-md border border-solid border-border-soft bg-background-deep px-[12px] py-[10px]"
    >
      <h2 className="m-0 text-[13px] font-semibold text-text">Pausierte Runs</h2>
      <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
        {control.pausedRuns.map((p) => (
          <li
            key={p.runId}
            className="flex flex-wrap items-center justify-between gap-[8px] text-[12px] text-text"
          >
            <span>
              {p.runId} · Tick {p.tick}/{p.targetTicks}
            </span>
            {canControl ? (
              <span className="flex gap-[8px]">
                <Button
                  size="sm"
                  variant="primary"
                  aria-label={`Run ${p.runId} fortsetzen`}
                  onClick={() => run(() => control.resumePausedRun(p.runId, role))}
                >
                  Fortsetzen
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Run ${p.runId} verwerfen`}
                  onClick={() => run(() => control.discardPausedRun(p.runId, role))}
                >
                  Verwerfen
                </Button>
              </span>
            ) : (
              <span className="text-[var(--color-text-muted)]">nur Lesezugriff</span>
            )}
          </li>
        ))}
      </ul>
      {(error ?? control.runControlError) && (
        <div role="alert">
          <Alert variant="error" title="Run-Steuerung">
            {error ?? control.runControlError}
          </Alert>
        </div>
      )}
    </section>
  );
}
