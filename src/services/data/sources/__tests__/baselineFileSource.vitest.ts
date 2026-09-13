import { describe, it, expect } from 'vitest';
import { makeBaselineFileSource, listBaselineFileVersions } from '../baselineFileSource';
import { DataSourceError } from '@/types/dataSource';

describe('baselineFileSource', () => {
  it('listet verfügbare Baseline-Dateiversionen', () => {
    const versions = listBaselineFileVersions();
    expect(versions).toContain('2026-08-31-v1');
    expect(versions).toContain('2026-09-15-v2');
  });

  it('erzeugt DataSource mit korrekten Metadaten', () => {
    const src = makeBaselineFileSource('2026-08-31-v1');
    expect(src.info.id).toBe('baseline-file:2026-08-31-v1');
    expect(src.info.kind).toBe('file');
    expect(src.info.supportsLiveFeed).toBe(false);
  });

  it('lädt Baseline-Dateidatensätze erfolgreich und mappt Aktivitäten', async () => {
    const src1 = makeBaselineFileSource('2026-08-31-v1');
    const snapshot1 = await src1.fetchSnapshot();
    expect(snapshot1.companies.length).toBeGreaterThan(0);
    expect(snapshot1.contacts.length).toBeGreaterThan(0);
    expect(snapshot1.deals.length).toBeGreaterThan(0);
    expect(Array.isArray(snapshot1.activities)).toBe(true);
    expect(snapshot1.audit).toBeDefined();

    const src2 = makeBaselineFileSource('2026-09-15-v2');
    const snapshot2 = await src2.fetchSnapshot();
    expect(snapshot2.companies.length).toBeGreaterThan(0);
  });

  it('wirft DataSourceError für unbekannte Baseline-Version', async () => {
    const src = makeBaselineFileSource('unknown-file-version');
    await expect(src.fetchSnapshot()).rejects.toThrow(DataSourceError);
  });
});
