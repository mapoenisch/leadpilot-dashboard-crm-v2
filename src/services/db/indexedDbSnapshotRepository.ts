import { ISnapshotRepository } from './ISnapshotRepository';
import { SnapshotMapper } from './snapshotMapper';
import {
  AnalyticsProjection,
  SimulationSnapshot,
  SnapshotError,
  SnapshotPersistenceRecord,
} from '../../types/snapshot';

const DB_NAME = 'LeadPilot_Snapshot_DB';
const DB_VERSION = 1;
const STORE_SNAPSHOTS = 'snapshots';
const STORE_PROJECTIONS = 'projections';

/**
 * Real IndexedDB Snapshot Repository for Browser environments.
 */
export class IndexedDbSnapshotRepository implements ISnapshotRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            'IndexedDB API in dieser Umgebung nicht vorhanden.',
          ),
        );
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (_evt: IDBVersionChangeEvent) => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'snapshotId' });
          snapshotStore.createIndex('by_runId', 'runId', { unique: false });
          snapshotStore.createIndex('by_scenarioVersionId', 'scenarioVersionId', { unique: false });
          snapshotStore.createIndex('by_run_tick', ['runId', 'tickId'], { unique: true });
        }

        if (!db.objectStoreNames.contains(STORE_PROJECTIONS)) {
          const projectionStore = db.createObjectStore(STORE_PROJECTIONS, {
            keyPath: 'snapshotId',
          });
          projectionStore.createIndex('by_runId', 'runId', { unique: false });
          projectionStore.createIndex('by_scenarioVersionId', 'scenarioVersionId', {
            unique: false,
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `IndexedDB Fehler beim Öffnen: ${request.error?.message}`,
          ),
        );
    });

    return this.dbPromise;
  }

  public async saveSnapshot(snapshot: SimulationSnapshot): Promise<void> {
    const db = await this.getDB();
    const record = SnapshotMapper.toPersistenceRecord(snapshot);

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS, STORE_PROJECTIONS], 'readwrite');
      const snapshotStore = tx.objectStore(STORE_SNAPSHOTS);
      const projectionStore = tx.objectStore(STORE_PROJECTIONS);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `Fehler beim atomaren Speichern des Snapshots: ${tx.error?.message}`,
          ),
        );

      snapshotStore.put(record);
      projectionStore.put(record.projection);
    });
  }

  public async getSnapshot(snapshotId: string): Promise<SimulationSnapshot | null> {
    const db = await this.getDB();

    return new Promise<SimulationSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.get(snapshotId);

      req.onsuccess = () => {
        if (!req.result) resolve(null);
        else resolve(SnapshotMapper.fromPersistenceRecord(req.result));
      };
      req.onerror = () =>
        reject(
          new SnapshotError('PERSISTENCE_ERROR', `Fehler beim Lesen von Snapshot "${snapshotId}".`),
        );
    });
  }

  public async getByRun(runId: string): Promise<SimulationSnapshot[]> {
    const db = await this.getDB();

    return new Promise<SimulationSnapshot[]>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const index = store.index('by_runId');
      const req = index.getAll(runId);

      req.onsuccess = () => {
        const records: SnapshotPersistenceRecord[] = req.result || [];
        const snapshots = records
          .map((r) => SnapshotMapper.fromPersistenceRecord(r))
          .sort((a, b) => a.tickId - b.tickId);
        resolve(snapshots);
      };
      req.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `Fehler beim Laden aller Snapshots für Run "${runId}".`,
          ),
        );
    });
  }

  public async getByRunAndTick(runId: string, tickId: number): Promise<SimulationSnapshot | null> {
    const db = await this.getDB();

    return new Promise<SimulationSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const index = store.index('by_run_tick');
      const req = index.get([runId, tickId]);

      req.onsuccess = () => {
        if (!req.result) resolve(null);
        else resolve(SnapshotMapper.fromPersistenceRecord(req.result));
      };
      req.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `Fehler beim Laden von Snapshot für Run "${runId}" Tick #${tickId}.`,
          ),
        );
    });
  }

  public async getLatestByRun(runId: string): Promise<SimulationSnapshot | null> {
    const snapshots = await this.getByRun(runId);
    if (snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1];
  }

  public async listProjectionsByRun(runId: string): Promise<AnalyticsProjection[]> {
    const db = await this.getDB();

    return new Promise<AnalyticsProjection[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTIONS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTIONS);
      const index = store.index('by_runId');
      const req = index.getAll(runId);

      req.onsuccess = () => {
        const projections: AnalyticsProjection[] = req.result || [];
        projections.sort((a, b) => a.tickId - b.tickId);
        resolve(projections);
      };
      req.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `Fehler beim Laden aller Projektionen für Run "${runId}".`,
          ),
        );
    });
  }

  public async deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.delete(snapshotId);

      req.onsuccess = () => resolve();
      req.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `Fehler beim Löschen des Snapshots "${snapshotId}".`,
          ),
        );
    });
  }

  public async deleteByRun(runId: string): Promise<void> {
    const snapshots = await this.getByRun(runId);
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS, STORE_PROJECTIONS], 'readwrite');
      const snapStore = tx.objectStore(STORE_SNAPSHOTS);
      const projStore = tx.objectStore(STORE_PROJECTIONS);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new SnapshotError(
            'PERSISTENCE_ERROR',
            `Fehler beim vollständigen Löschen des Runs "${runId}".`,
          ),
        );

      for (const s of snapshots) {
        snapStore.delete(s.snapshotId);
        projStore.delete(s.snapshotId);
      }
    });
  }

  public async pruneSnapshotsForRun(
    runId: string,
    keepTickIds: number[],
  ): Promise<{ prunedCount: number; remainingCount: number }> {
    const snapshots = await this.getByRun(runId);
    const keepSet = new Set(keepTickIds);
    const toPrune = snapshots.filter((s) => !keepSet.has(s.tickId));

    if (toPrune.length === 0) {
      return { prunedCount: 0, remainingCount: snapshots.length };
    }

    const db = await this.getDB();
    return new Promise<{ prunedCount: number; remainingCount: number }>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);

      tx.oncomplete = () =>
        resolve({ prunedCount: toPrune.length, remainingCount: snapshots.length - toPrune.length });
      tx.onerror = () =>
        reject(new SnapshotError('PERSISTENCE_ERROR', `Fehler beim Pruning für Run "${runId}".`));

      for (const s of toPrune) {
        store.delete(s.snapshotId);
      }
    });
  }

  public async getStorageMetrics(): Promise<{
    totalSnapshots: number;
    totalProjections: number;
    estimatedBytes: number;
  }> {
    const db = await this.getDB();

    return new Promise<{
      totalSnapshots: number;
      totalProjections: number;
      estimatedBytes: number;
    }>((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS, STORE_PROJECTIONS], 'readonly');
      const snapStore = tx.objectStore(STORE_SNAPSHOTS);
      const projStore = tx.objectStore(STORE_PROJECTIONS);

      const snapReq = snapStore.count();
      const projReq = projStore.count();

      tx.oncomplete = () => {
        const totalSnapshots = snapReq.result || 0;
        const totalProjections = projReq.result || 0;
        const estimatedBytes = totalSnapshots * 20480 + totalProjections * 256;
        resolve({ totalSnapshots, totalProjections, estimatedBytes });
      };
      tx.onerror = () =>
        reject(new SnapshotError('PERSISTENCE_ERROR', 'Fehler beim Laden der Storage Metrics.'));
    });
  }
}

/**
 * In-Memory Snapshot Repository for Node.js / tsx headless test runner environments.
 */
export class InMemorySnapshotRepository implements ISnapshotRepository {
  private snapshotsMap = new Map<string, SnapshotPersistenceRecord>();
  private projectionsMap = new Map<string, AnalyticsProjection>();

  public async saveSnapshot(snapshot: SimulationSnapshot): Promise<void> {
    const record = SnapshotMapper.toPersistenceRecord(snapshot);
    this.snapshotsMap.set(record.snapshotId, record);
    this.projectionsMap.set(record.projection.snapshotId, record.projection);
  }

  public async getSnapshot(snapshotId: string): Promise<SimulationSnapshot | null> {
    const record = this.snapshotsMap.get(snapshotId);
    if (!record) return null;
    return SnapshotMapper.fromPersistenceRecord(record);
  }

  public async getByRun(runId: string): Promise<SimulationSnapshot[]> {
    const results: SimulationSnapshot[] = [];
    for (const record of this.snapshotsMap.values()) {
      if (record.runId === runId) {
        results.push(SnapshotMapper.fromPersistenceRecord(record));
      }
    }
    results.sort((a, b) => a.tickId - b.tickId);
    return results;
  }

  public async getByRunAndTick(runId: string, tickId: number): Promise<SimulationSnapshot | null> {
    const snapshotId = `${runId}_tick_${tickId}`;
    return this.getSnapshot(snapshotId);
  }

  public async getLatestByRun(runId: string): Promise<SimulationSnapshot | null> {
    const snapshots = await this.getByRun(runId);
    if (snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1];
  }

  public async listProjectionsByRun(runId: string): Promise<AnalyticsProjection[]> {
    const results: AnalyticsProjection[] = [];
    for (const proj of this.projectionsMap.values()) {
      if (proj.runId === runId) {
        results.push({ ...proj });
      }
    }
    results.sort((a, b) => a.tickId - b.tickId);
    return results;
  }

  public async deleteSnapshot(snapshotId: string): Promise<void> {
    this.snapshotsMap.delete(snapshotId);
  }

  public async deleteByRun(runId: string): Promise<void> {
    for (const [key, record] of Array.from(this.snapshotsMap.entries())) {
      if (record.runId === runId) {
        this.snapshotsMap.delete(key);
      }
    }
    for (const [key, proj] of Array.from(this.projectionsMap.entries())) {
      if (proj.runId === runId) {
        this.projectionsMap.delete(key);
      }
    }
  }

  public async pruneSnapshotsForRun(
    runId: string,
    keepTickIds: number[],
  ): Promise<{ prunedCount: number; remainingCount: number }> {
    const keepSet = new Set(keepTickIds);
    let prunedCount = 0;
    let remainingCount = 0;

    for (const [key, record] of Array.from(this.snapshotsMap.entries())) {
      if (record.runId === runId) {
        if (!keepSet.has(record.tickId)) {
          this.snapshotsMap.delete(key);
          prunedCount++;
        } else {
          remainingCount++;
        }
      }
    }

    return { prunedCount, remainingCount };
  }

  public async getStorageMetrics(): Promise<{
    totalSnapshots: number;
    totalProjections: number;
    estimatedBytes: number;
  }> {
    const totalSnapshots = this.snapshotsMap.size;
    const totalProjections = this.projectionsMap.size;
    const estimatedBytes = totalSnapshots * 20480 + totalProjections * 256;

    return { totalSnapshots, totalProjections, estimatedBytes };
  }
}

/**
 * Factory creating the appropriate Snapshot Repository based on runtime environment.
 */
export function createSnapshotRepository(): ISnapshotRepository {
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    return new IndexedDbSnapshotRepository();
  }
  return new InMemorySnapshotRepository();
}
