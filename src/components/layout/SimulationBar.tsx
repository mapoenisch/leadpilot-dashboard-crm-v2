import React from 'react';
import { simulationService } from '../../simulation/simulationService';
import { SimulationEvent, SimulationSpeed, SimulationState } from '../../types/simulation';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { StatusChip } from '../ui/StatusChip';

export function SimulationBar() {
  const [simState, setSimState] = React.useState<SimulationState>(simulationService.getState());
  const [lastEvent, setLastEvent] = React.useState<SimulationEvent | null>(null);

  React.useEffect(() => {
    const unsubscribe = simulationService.subscribe((event, newState) => {
      setSimState(newState);
      setLastEvent(event);
    });
    return unsubscribe;
  }, []);

  const toggleRun = () => {
    if (simState.isRunning) {
      simulationService.pause();
    } else {
      simulationService.start();
    }
  };

  const handleSpeed = (speed: SimulationSpeed) => {
    simulationService.setSpeed(speed);
  };

  const metrics = simState.metrics ?? {
    liveLeads: simState.totalLeadsGenerated ?? 0,
    liveWonDeals: simState.totalDealsWon ?? 0,
    liveARR: simState.currentARR ?? 411840,
  };

  return (
    <div
      role="region"
      aria-label="Simulation Command Strip"
      className="border-0 simulation-command-strip flex items-center justify-between flex-wrap gap-[var(--space-3)] box-border w-full text-[13px] z-[5] border-b border-solid border-border bg-[rgba(18,51,48,0.75)] backdrop-blur-sm py-[8px] px-[var(--space-4)]"
    >
      {/* 1. Primary Action & State */}
      <div className="flex items-center gap-[var(--space-3)] flex-wrap">
        <StatusChip
          variant={simState.isRunning ? 'cyan' : 'orange'}
          label={simState.isRunning ? 'SIMULATION AKTIV' : 'SIMULATION PAUSIERT'}
          pulse={simState.isRunning}
          size="sm"
        />

        {/* G39 Welle 1: Glow an/aus sind zwei zur Build-Zeit bekannte Werte —
            als Klasse nicht abbildbar, weil Button kein className-Prop hat
            (API bleibt unverändert); Passthrough an Custom-Komponente. */}
        <Button
          size="sm"
          variant="primary"
          onClick={toggleRun}
          iconLeft={<Icon name={simState.isRunning ? 'pause' : 'play'} size={14} />}
          style={{
            boxShadow: simState.isRunning ? 'var(--shadow-glow-cyan)' : 'none',
          }}
        >
          {simState.isRunning ? 'Pausieren' : 'Starten'}
        </Button>

        {/* Speed Selector (Radiogroup) */}
        <div
          role="radiogroup"
          aria-label="Simulationsgeschwindigkeit"
          className="flex items-center gap-[2px] border border-solid border-border-soft rounded-full bg-background-deep py-[2px] px-[4px]"
        >
          <span className="text-[11px] text-[var(--color-text-muted)] ml-[4px] mr-[2px]">
            Tempo:
          </span>
          {([1, 2, 5, 10] as SimulationSpeed[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={simState.speed === s}
              onClick={() => handleSpeed(s)}
              className={`border-0 rounded-full cursor-pointer outline-none text-[11px] font-semibold py-[2px] px-[7px] ${simState.speed === s ? 'bg-primary-soft text-primary' : 'bg-transparent text-[var(--color-text-muted)]'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 2. Middle Event Info Stream (hidden on very small viewports if necessary or truncated) */}
      <div className="flex items-center gap-[var(--space-2)] flex-[1_1_auto] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[var(--color-text-muted)] min-w-0">
        <span className="text-[11px] font-bold text-primary bg-primary-soft rounded px-[6px] py-[2px] shrink-0">
          Tick #{simState.tickCount}
        </span>
        {lastEvent ? (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            <strong className="text-text">{lastEvent.title}:</strong> {lastEvent.details}
          </span>
        ) : (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            Unternehmenssimulation bereit (Ebene B).
          </span>
        )}
      </div>

      {/* 3. Live Metrics Summary */}
      <div className="simulation-bar-metrics flex items-center gap-[var(--space-3)] flex-wrap text-[12px] text-[var(--color-text-muted)] shrink-0 min-w-0">
        <div>
          Leads: <strong className="text-text">{metrics.liveLeads}</strong>
        </div>
        <div>
          Won: <strong className="text-primary">{metrics.liveWonDeals}</strong>
        </div>
        <div>
          ARR: <strong className="text-accent">{metrics.liveARR.toLocaleString('de-DE')} €</strong>
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .simulation-command-strip {
            padding: 6px 8px !important;
            gap: 6px !important;
          }
          .simulation-bar-metrics {
            gap: 8px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
    </div>
  );
}

