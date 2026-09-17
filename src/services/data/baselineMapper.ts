import { SimulationEventRules } from '../../simulation/eventRules';
import type { HistoricalSimulationMetrics, SimulationBaselineInput } from '../../types/simulation';
import type { BaselineDataset } from './baselineSnapshotService';
import { DataSourceError } from '../../types/dataSource';

// 067E / G48 — Abbildung Baseline → Engine-Einstieg (Design §7.2).
//
// `DEFAULT_HISTORICAL_METRICS` ist der versionierte historische Anker des
// LeadPilot-Demo-Unternehmens (Marktstand Dezember 2025: 66 Kunden,
// 411.840 € ARR, davon 34.320 € MRR — vgl. Facelift-Spec). Marc-Entscheid
// zu 067E: Diese bewährten Werte bleiben erhalten; der Mapper bezieht sie
// von genau dieser einen Stelle, niemals aus verstreuten Literalen im
// Run-Pfad. Eine Baseline kann eigene `historicalMetrics` tragen — diese
// gewinnen immer (damit ist „andere Baseline → fachlich anderes Ergebnis"
// beweisbar, ohne die Ankerwerte zu verändern).
export const DEFAULT_HISTORICAL_METRICS: HistoricalSimulationMetrics = Object.freeze({
  baseCustomers: 66,
  baseMRR: 34320,
  baseARR: 411840,
});

function isValidMetrics(value: unknown): value is HistoricalSimulationMetrics {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.baseCustomers === 'number' &&
    Number.isFinite(m.baseCustomers) &&
    m.baseCustomers >= 0 &&
    typeof m.baseMRR === 'number' &&
    Number.isFinite(m.baseMRR) &&
    m.baseMRR >= 0 &&
    typeof m.baseARR === 'number' &&
    Number.isFinite(m.baseARR) &&
    m.baseARR >= 0
  );
}

export function resolveHistoricalMetrics(baseline: {
  historicalMetrics?: HistoricalSimulationMetrics;
}): HistoricalSimulationMetrics {
  const own = baseline.historicalMetrics;
  if (own === undefined) return { ...DEFAULT_HISTORICAL_METRICS };
  if (!isValidMetrics(own)) {
    throw new DataSourceError('INTEGRITY', 'Baseline trägt ungültige historicalMetrics.');
  }
  return { ...own };
}

export interface BaselineMapperOptions {
  seed: number;
  simulatedDate: string;
}

/**
 * Transformiert einen eingefrorenen Baseline-Datensatz in den initialen
 * Simulationszustand. Startkollektionen sind leer (wie bisher); die
 * historischen Kennzahlen stammen aus der Baseline (Anker oder Override).
 */
export function mapBaselineToSimulationInput(
  baseline: BaselineDataset,
  opts: BaselineMapperOptions,
): SimulationBaselineInput {
  const historicalMetrics = resolveHistoricalMetrics(baseline);
  const initialMetrics = SimulationEventRules.recalculateMetrics(
    [],
    [],
    [],
    undefined,
    undefined,
    undefined,
    historicalMetrics.baseCustomers,
    historicalMetrics.baseMRR,
    historicalMetrics.baseARR,
  );
  return {
    baselineId: baseline.version,
    baselineHash: baseline.baselineHash,
    organizationId: baseline.organizationId,
    initialState: {
      isRunning: true,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate: opts.simulatedDate,
      seed: opts.seed,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: `${opts.simulatedDate} (Tick #0)`,
      simulatedAt: opts.simulatedDate,
      metrics: initialMetrics,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: initialMetrics.liveARR,
    },
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
    historicalMetrics,
  };
}
