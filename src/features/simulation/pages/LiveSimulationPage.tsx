import React from 'react';
import { LiveDashboardView } from '@/features/simulation/LiveDashboardView';
import { useSimulationStore } from '@/store/simulationStore';
import { scenarioService } from '@/simulation/scenarioService';
import { PausedRunsPanel, RunControlBar } from '@/features/simulation/components/RunControlBar';

// 067G / G50: Sichtbarer Live-Fortschritt aus echten Berechnungseinheiten
// (null wenn kein Run aktiv) plus Worker-Abbruch bei Unmount/Routewechsel —
// kein Worker überlebt die Navigation.
function WorkerProgressBadge() {
  const runProgress = useSimulationStore((s) => s.runProgress);
  if (!runProgress) return null;
  return (
    <div
      data-testid="worker-progress"
      role="status"
      aria-live="polite"
      className="px-[12px] py-[6px] text-[12px] text-primary"
    >
      {runProgress.status === 'queued'
        ? 'Run wartet'
        : runProgress.status === 'paused'
          ? 'Run pausiert'
          : 'Run rechnet'}
      :{' '}
      <span data-testid="worker-progress-units">
        {runProgress.processedUnits}/{runProgress.totalUnits}
      </span>
    </div>
  );
}

export function LiveSimulationPage() {
  React.useEffect(() => {
    return () => {
      scenarioService.cancelActiveRun();
    };
  }, []);
  return (
    <>
      <WorkerProgressBadge />
      {/* 067Q / G63: Steuerung und gespeicherte Pausen (Resume nach Reload). */}
      <div className="flex flex-col gap-[8px] px-[12px]">
        <RunControlBar />
        <PausedRunsPanel />
      </div>
      <LiveDashboardView />
    </>
  );
}
