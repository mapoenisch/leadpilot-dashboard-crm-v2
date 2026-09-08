import { CrmReadModel, DataSourceError } from '../../types/dataSource';
import { dataSourceRegistry } from './dataSourceRegistry';

export interface BaselineDataset extends CrmReadModel {
  version: string; // z. B. 'baseline-simulated-crm-2026-08-31-v1'
  sourceId: string;
  capturedAt: string; // aus systemContext.now()
  periodStart: string; // '2026-01-01' (BASELINE_PERIOD_START)
  counts: { companies: number; contacts: number; deals: number; activities: number };
}

export class BaselineSnapshotService {
  private static frozen = new Map<string, BaselineDataset>();

  /**
   * Pull der Quelle, Integritätsprüfung, Einfrieren unter versionierter ID.
   */
  static async capture(sourceId: string, version: string, periodStart: string, now: string): Promise<BaselineDataset> {
    const model = await dataSourceRegistry.get(sourceId).fetchSnapshot();
    this.assertIntegrity(model, periodStart);
    const ds: BaselineDataset = {
      ...model,
      version,
      sourceId,
      capturedAt: now,
      periodStart,
      counts: {
        companies: model.companies.length,
        contacts: model.contacts.length,
        deals: model.deals.length,
        activities: model.activities.length,
      },
    };
    this.frozen.set(version, Object.freeze(ds));
    return ds;
  }

  static get(version: string): BaselineDataset {
    const ds = this.frozen.get(version);
    if (!ds) {
      throw new DataSourceError('UNKNOWN_SOURCE', `Baseline-Version "${version}" nicht eingefroren.`);
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
        throw new DataSourceError('INTEGRITY', `Contact ${ct.id} → unbekannte Company ${ct.companyId}.`);
      }
    }
    for (const d of m.deals) {
      if ((d as any).companyId && !companyIds.has((d as any).companyId)) {
        throw new DataSourceError('INTEGRITY', `Deal ${(d as any).id} → unbekannte Company.`);
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
