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
      className="simulation-command-strip"
      style={{
        background: 'rgba(18, 51, 48, 0.75)',
        backdropFilter: 'var(--backdrop-blur-sm)',
        WebkitBackdropFilter: 'var(--backdrop-blur-sm)',
        borderBottom: '1px solid var(--color-border)',
        padding: '8px var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        fontSize: '13px',
        boxSizing: 'border-box',
        width: '100%',
        zIndex: 5,
      }}
    >
      {/* 1. Primary Action & State */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <StatusChip
          variant={simState.isRunning ? 'cyan' : 'orange'}
          label={simState.isRunning ? 'SIMULATION AKTIV' : 'SIMULATION PAUSIERT'}
          pulse={simState.isRunning}
          size="sm"
        />

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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 4px',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '4px', marginRight: '2px' }}>
            Tempo:
          </span>
          {([1, 2, 5, 10] as SimulationSpeed[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={simState.speed === s}
              onClick={() => handleSpeed(s)}
              style={{
                background: simState.speed === s ? 'var(--color-primary-soft)' : 'transparent',
                color: simState.speed === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '2px 7px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 2. Middle Event Info Stream (hidden on very small viewports if necessary or truncated) */}
      <div
        style={{
          flex: '1 1 auto',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: '12px',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            background: 'var(--color-primary-soft)',
            padding: '2px 6px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          Tick #{simState.tickCount}
        </span>
        {lastEvent ? (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--color-text)' }}>{lastEvent.title}:</strong> {lastEvent.details}
          </span>
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Unternehmenssimulation bereit (Ebene B).
          </span>
        )}
      </div>

      {/* 3. Live Metrics Summary */}
      <div
        className="simulation-bar-metrics"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <div>
          Leads: <strong style={{ color: 'var(--color-text)' }}>{metrics.liveLeads}</strong>
        </div>
        <div>
          Won: <strong style={{ color: 'var(--color-primary)' }}>{metrics.liveWonDeals}</strong>
        </div>
        <div>
          ARR: <strong style={{ color: 'var(--color-accent)' }}>{metrics.liveARR.toLocaleString('de-DE')} €</strong>
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

