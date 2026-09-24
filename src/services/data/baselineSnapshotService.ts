import { CrmReadModel, DataSourceError } from '../../types/dataSource';
import type { HistoricalSimulationMetrics } from '../../types/simulation';
import { dataSourceRegistry } from './dataSourceRegistry';
import { canonicalSha256, deepClone, deepFreeze } from './canonicalHash';
import { resolveHistoricalMetrics } from './baselineMapper';

export interface BaselineDataset extends CrmReadModel {
  version: string; // z. B. 'baseline-simulated-crm-2026-08-31-v1'
  sourceId: string;
  capturedAt: string; // aus systemContext.now() — KEIN Hash-Bestandteil
  periodStart: string; // '2026-01-01' (BASELINE_PERIOD_START)
  counts: { companies: number; contacts: number; deals: number; activities: number };
  // 067E / G48: kanonischer Hash (ohne capturedAt), historische Kennzahlen
  // und Mandantenzuordnung. `capturedAt` bleibt absichtlich außerhalb des
  // Hashs: Gleicher Inhalt zur anderen Zeit ist dieselbe Baseline.
  baselineHash: string;
  historicalMetrics: HistoricalSimulationMetrics;
  organizationId: string;
}

/** Sentinel für Läufe ohne Mandantenkontext (Golden Run, Legacy). */
export const UNKNOWN_ORGANIZATION_ID = 'unknown';

export interface CaptureOptions {
  organizationId?: string;
  historicalMetrics?: HistoricalSimulationMetrics;
}

export class BaselineSnapshotService {
  private static frozen = new Map<string, BaselineDataset>();

  /**
   * Pull der Quelle, Integritätsprüfung, Tiefen-Klon, kanonischer Hash und
   * Tiefen-Freeze unter versionierter ID. Aufrufer erhalten keine
   * veränderbare Referenz auf den gespeicherten Zustand.
   */
  static async capture(
    sourceId: string,
    version: string,
    periodStart: string,
    now: string,
    opts: CaptureOptions = {},
  ): Promise<BaselineDataset> {
    const fetched = await dataSourceRegistry.get(sourceId).fetchSnapshot();
    this.assertIntegrity(fetched, periodStart);
    const model = deepClone(fetched);
    const organizationId = opts.organizationId ?? UNKNOWN_ORGANIZATION_ID;
    const historicalMetrics = resolveHistoricalMetrics({
      historicalMetrics: opts.historicalMetrics,
    });
    const counts = {
      companies: model.companies.length,
      contacts: model.contacts.length,
      deals: model.deals.length,
      activities: model.activities.length,
    };
    const baselineHash = await canonicalSha256({
      version,
      sourceId,
      periodStart,
      organizationId,
      historicalMetrics,
      counts,
      companies: model.companies,
      contacts: model.contacts,
      deals: model.deals,
      activities: model.activities,
      audit: model.audit,
    });
    const ds: BaselineDataset = deepFreeze({
      ...model,
      version,
      sourceId,
      capturedAt: now,
      periodStart,
      counts,
      baselineHash,
      historicalMetrics,
      organizationId,
    });
    this.frozen.set(version, ds);
    return ds;
  }

  static get(version: string): BaselineDataset {
    const ds = this.frozen.get(version);
    if (!ds) {
      throw new DataSourceError(
        'UNKNOWN_SOURCE',
        `Baseline-Version "${version}" nicht eingefroren.`,
      );
    }
    return ds;
  }

  static has(version: string): boolean {
    return this.frozen.has(version);
  }

  static listFrozen(): string[] {
    return [...this.frozen.keys()];
  }

  static clear(): void {
    this.frozen.clear();
  }

  private static assertIntegrity(m: CrmReadModel, periodStart: string): void {
    const companyIds = new Set(m.companies.map((c) => c.id));
    for (const ct of m.contacts) {
      if (!companyIds.has(ct.companyId)) {
        throw new DataSourceError(
          'INTEGRITY',
          `Contact ${ct.id} → unbekannte Company ${ct.companyId}.`,
        );
      }
    }
    for (const d of m.deals) {
      const companyId: unknown = (d as { companyId?: unknown }).companyId;
      const dealId: unknown = (d as { id?: unknown }).id;
      if (companyId && !companyIds.has(companyId as string)) {
        throw new DataSourceError('INTEGRITY', `Deal ${String(dealId)} → unbekannte Company.`);
      }
    }
    const start = Date.parse(periodStart);
    const end = start + 365 * 864e5;
    for (const a of m.activities) {
      const t = Date.parse(a.timestamp);
      if (t < start || t > end) {
        throw new DataSourceError('INTEGRITY', `Activity ${a.id} außerhalb der Periode.`);
      }
    }
  }
}
