import { DataSource, DataSourceError, DataSourceInfo } from '../../types/dataSource';

class Registry {
  private sources = new Map<string, DataSource>();
  private activeId: string | null = null;

  register(source: DataSource): void {
    this.sources.set(source.info.id, source);
    if (this.activeId === null) this.activeId = source.info.id;
  }

  list(): DataSourceInfo[] {
    return [...this.sources.values()].map((s) => s.info);
  }

  get(id: string): DataSource {
    const s = this.sources.get(id);
    if (!s) {
      throw new DataSourceError('UNKNOWN_SOURCE', `Datenquelle "${id}" ist nicht registriert.`);
    }
    return s;
  }

  getActive(): DataSource {
    if (!this.activeId) {
      throw new DataSourceError('UNKNOWN_SOURCE', 'Keine aktive Datenquelle konfiguriert.');
    }
    return this.get(this.activeId);
  }

  setActive(id: string): void {
    this.get(id);
    this.activeId = id;
  }

  /**
   * Reset registry for tests
   */
  reset(): void {
    this.sources.clear();
    this.activeId = null;
  }
}

export const dataSourceRegistry = new Registry();
