import { SimulationSnapshot, SnapshotError } from '../types/snapshot';
import { SimulationState } from '../types/simulation';

export class SnapshotIntegrityService {
  /**
   * Compares a stored snapshot against a reconstructed SimulationState.
   * Returns verification status or throws INTEGRITY_ERROR if divergences are found.
   */
  public static verifySnapshotIntegrity(
    storedSnapshot: SimulationSnapshot,
    reconstructedState: SimulationState,
    throwOnError = false
  ): { valid: boolean; differences: string[] } {
    const differences: string[] = [];
    const state = storedSnapshot.state;

    if (state.tickCount !== reconstructedState.tickCount) {
      differences.push(
        `tickCount mismatch: stored ${state.tickCount} vs reconstructed ${reconstructedState.tickCount}`
      );
    }

    if (state.dayIndex !== reconstructedState.dayIndex) {
      differences.push(
        `dayIndex mismatch: stored ${state.dayIndex} vs reconstructed ${reconstructedState.dayIndex}`
      );
    }

    if (state.seed !== reconstructedState.seed) {
      differences.push(
        `seed mismatch: stored ${state.seed} vs reconstructed ${reconstructedState.seed}`
      );
    }

    if (state.simulatedDate !== reconstructedState.simulatedDate) {
      differences.push(
        `simulatedDate mismatch: stored "${state.simulatedDate}" vs reconstructed "${reconstructedState.simulatedDate}"`
      );
    }

    if (state.metrics && reconstructedState.metrics) {
      if (state.metrics.liveARR !== reconstructedState.metrics.liveARR) {
        differences.push(
          `metrics.liveARR mismatch: stored ${state.metrics.liveARR} vs reconstructed ${reconstructedState.metrics.liveARR}`
        );
      }
      if (state.metrics.liveMRR !== reconstructedState.metrics.liveMRR) {
        differences.push(
          `metrics.liveMRR mismatch: stored ${state.metrics.liveMRR} vs reconstructed ${reconstructedState.metrics.liveMRR}`
        );
      }
      if (state.metrics.liveCustomers !== reconstructedState.metrics.liveCustomers) {
        differences.push(
          `metrics.liveCustomers mismatch: stored ${state.metrics.liveCustomers} vs reconstructed ${reconstructedState.metrics.liveCustomers}`
        );
      }
      if (state.metrics.liveWonDeals !== reconstructedState.metrics.liveWonDeals) {
        differences.push(
          `metrics.liveWonDeals mismatch: stored ${state.metrics.liveWonDeals} vs reconstructed ${reconstructedState.metrics.liveWonDeals}`
        );
      }
    }

    const isValid = differences.length === 0;

    if (!isValid && throwOnError) {
      throw new SnapshotError(
        'INTEGRITY_ERROR',
        `Integritätsprüfung fehlgeschlagen für Snapshot "${storedSnapshot.snapshotId}": ${differences.join('; ')}`
      );
    }

    return { valid: isValid, differences };
  }
}
