// Gate G37 (Auftrag 052, Block A): Selektor-Granularität (jsdom).
// Beweist, dass useShallow-Selektoren bei Fremd-Updates nicht neu rendern.
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulationStore } from '../simulationStore';
import { useScenarioVersions, useSimulationState } from '../hooks';

describe('simulationStore-Selektoren (Block A)', () => {
  it('versions-Hook rendert bei Fremd-Update nicht neu, state-Hook schon', () => {
    let versionsRenders = 0;
    let stateRenders = 0;
    const { result: versionsResult } = renderHook(() => {
      versionsRenders += 1;
      return useScenarioVersions();
    });
    const { result: stateResult } = renderHook(() => {
      stateRenders += 1;
      return useSimulationState();
    });
    expect(versionsRenders).toBe(1);
    expect(stateRenders).toBe(1);

    // Fremd-Update (Run-Slice): kein Re-Render in beiden Hooks.
    const runsBefore = useSimulationStore.getState().runs;
    act(() => {
      useSimulationStore.setState({ workerProgress: { completedRuns: 0, totalRuns: 1 } });
    });
    expect(useSimulationStore.getState().runs).toBe(runsBefore);
    expect(versionsRenders).toBe(1);
    expect(stateRenders).toBe(1);

    // Eigenes Slice-Update: nur der state-Hook rendert neu.
    const stateBefore = stateResult.current;
    act(() => {
      useSimulationStore.setState({ state: { ...stateBefore } });
    });
    expect(stateRenders).toBe(2);
    expect(versionsRenders).toBe(1);
    expect(versionsResult.current).toBe(useSimulationStore.getState().versions);
  });
});
