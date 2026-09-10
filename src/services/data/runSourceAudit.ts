import { BaselineSnapshotService } from './baselineSnapshotService';
import { dataSourceRegistry } from './index';
import { SimulationRun } from '../../types/scenario';

export interface RunSourceAuditInfo {
  baselineVersion: string;
  dataSourceId: string;
  sourceLabel: string;
  sourceKind: 'simulated' | 'file' | 'external';
  sourceDesc: string;
  capturedAt?: string;
  periodStart?: string;
  counts?: { companies: number; contacts: number; deals: number; activities: number };
  isFrozen: boolean;
}

export function resolveRunSourceAudit(run: SimulationRun): RunSourceAuditInfo {
  const baselineVersion = run.manifest.baselineVersion;
  let dataSourceId = run.manifest.dataSourceId;
  let capturedAt: string | undefined;
  let periodStart: string | undefined;
  let counts: { companies: number; contacts: number; deals: number; activities: number } | undefined;
  let isFrozen = false;

  if (BaselineSnapshotService.has(baselineVersion)) {
    const ds = BaselineSnapshotService.get(baselineVersion);
    isFrozen = true;
    dataSourceId = dataSourceId || ds.sourceId;
    capturedAt = ds.capturedAt;
    periodStart = ds.periodStart;
    counts = ds.counts;
  }

  if (!dataSourceId) {
    if (baselineVersion.startsWith('baseline-file:')) {
      dataSourceId = baselineVersion;
    } else if (baselineVersion.startsWith('baseline-')) {
      const parts = baselineVersion.split('-');
      dataSourceId = parts[1] || 'simulated-crm';
    } else {
      dataSourceId = 'simulated-crm';
    }
  }

  let sourceLabel = dataSourceId;
  let sourceKind: 'simulated' | 'file' | 'external' = 'simulated';
  let sourceDesc = '';

  try {
    const info = dataSourceRegistry.get(dataSourceId).info;
    sourceLabel = info.label;
    sourceKind = info.kind;
    sourceDesc = info.description;
  } catch {
    if (dataSourceId.startsWith('baseline-file:')) {
      sourceKind = 'file';
      sourceLabel = `Baseline-Datei (${dataSourceId.replace('baseline-file:', '')})`;
      sourceDesc = 'Eingefrorener Dateidatensatz';
    } else if (dataSourceId.startsWith('hubspot-baseline:')) {
      sourceKind = 'external';
      sourceLabel = `HubSpot-Baseline (${dataSourceId.replace('hubspot-baseline:', '')})`;
      sourceDesc = 'Offline per n8n gezogener HubSpot-Snapshot';
    }
  }

  return {
    baselineVersion,
    dataSourceId,
    sourceLabel,
    sourceKind,
    sourceDesc,
    capturedAt,
    periodStart,
    counts,
    isFrozen,
  };
}
