// 067Q / G63 — Hilfen für die Run-Steuerung im Store (ausgelagert aus
// runSlice.ts wegen max-lines): Fehlerklassifikation, Lauf-Bindung für einen
// deterministischen Retry und eine serielle Warteschlange für Server-Befehle.
import type { Measure } from '../../types/measure';
import type { RunManifest, RunOptions } from '../../types/scenario';

export function errorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

export function errorMessage(err: unknown, fallback: string): string {
  return (err instanceof Error ? err.message : '') || fallback;
}

/**
 * Alles, was ein Retry braucht, um exakt dieselbe Ausführung zu wiederholen:
 * Maßnahmen und Datenquelle vom Start, Baseline-Bindung aus dem Manifest,
 * sobald der Lauf sie kennt. Spätere Änderungen im Store wirken nicht mehr.
 */
export interface RunBinding {
  measures: Measure[];
  dataSourceId?: string;
  baselineVersion?: string;
  expectedBaselineHash?: string;
}

export function bindingWithManifest(binding: RunBinding, manifest: RunManifest | null): RunBinding {
  if (!manifest) return binding;
  return {
    measures: structuredClone([...(manifest.measures ?? binding.measures)]) as Measure[],
    dataSourceId: manifest.dataSourceId ?? binding.dataSourceId,
    baselineVersion: manifest.baselineVersion,
    expectedBaselineHash: manifest.baselineHash,
  };
}

export function bindingOptions(binding: RunBinding): RunOptions {
  return {
    measures: structuredClone(binding.measures),
    ...(binding.dataSourceId ? { dataSourceId: binding.dataSourceId } : {}),
    ...(binding.baselineVersion ? { baselineVersion: binding.baselineVersion } : {}),
    ...(binding.expectedBaselineHash ? { expectedBaselineHash: binding.expectedBaselineHash } : {}),
  };
}

/**
 * Serielle Warteschlange: Pause speichern, Fortsetzen protokollieren und Pause
 * verwerfen laufen strikt nacheinander — ein Verwerfen kann nie vor dem
 * zugehörigen Speichern ankommen und einen veralteten Snapshot zurücklassen.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = tail.then(task, task);
    tail = next.catch(() => undefined);
    return next;
  };
}
