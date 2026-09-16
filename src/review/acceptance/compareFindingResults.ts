// G44 (Auftrag 067A, Block A): Reine Soll-/Ist-Vergleichslogik für den
// v2.3.0-Finding-Baseline-Verifier. Keine Runner-, Datei- oder Prozesslogik —
// nur der exakte Abgleich registrierter Verträge gegen gemessene Ergebnisse.
import type { V23FindingContract } from './findingContract';

export type V23FindingContractLike = Pick<
  V23FindingContract,
  'id' | 'title' | 'severity' | 'targetGate' | 'runner' | 'expected'
>;

export interface FindingRunResult {
  id: string;
  runner: 'vitest' | 'playwright';
  actual: 'failing' | 'passing';
}

export interface FindingComparison {
  ok: boolean;
  mismatches: string[];
}

export function compareFindingResults(
  contracts: readonly V23FindingContractLike[],
  results: readonly FindingRunResult[],
): FindingComparison {
  const mismatches: string[] = [];
  const byId = new Map<string, FindingRunResult>();
  for (const runResult of results) {
    const previous = byId.get(runResult.id);
    if (previous === undefined || previous.actual !== 'failing') {
      byId.set(runResult.id, runResult);
    }
  }

  for (const contract of contracts) {
    const measured = byId.get(contract.id);
    if (!measured) {
      mismatches.push(
        `missing:${contract.id} (erwartet ${contract.expected}, kein Ergebnis gemessen)`,
      );
    } else if (measured.actual !== contract.expected) {
      mismatches.push(
        `unexpected:${contract.id} (erwartet ${contract.expected}, gemessen ${measured.actual})`,
      );
    }
  }

  for (const runResult of byId.values()) {
    const contract = contracts.find((candidate) => candidate.id === runResult.id);
    if (runResult.actual === 'failing' && (!contract || contract.expected !== 'failing')) {
      mismatches.push(`unregistered-failing:${runResult.id} (zusätzlicher roter Befund)`);
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}
