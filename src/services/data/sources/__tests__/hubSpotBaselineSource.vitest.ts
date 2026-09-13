import { describe, it, expect } from 'vitest';
import { makeHubSpotBaselineSource, listHubSpotBaselineVersions } from '../hubSpotBaselineSource';
import { DataSourceError } from '@/types/dataSource';

describe('hubSpotBaselineSource', () => {
  it('listet verfügbare Baseline-Versionen', () => {
    const versions = listHubSpotBaselineVersions();
    expect(versions).toContain('fixture');
    expect(versions).toContain('2026-09-01');
  });

  it('erzeugt DataSource mit korrekten Metadaten', () => {
    const src = makeHubSpotBaselineSource('2026-09-01');
    expect(src.info.id).toBe('hubspot-baseline:2026-09-01');
    expect(src.info.kind).toBe('external');
    expect(src.info.supportsLiveFeed).toBe(false);
  });

  it('lädt Baseline-Snapshot erfolgreich', async () => {
    const src = makeHubSpotBaselineSource('2026-09-01');
    const snapshot = await src.fetchSnapshot();

    expect(snapshot.companies.length).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.contacts)).toBe(true);
    expect(snapshot.deals.length).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.activities)).toBe(true);
    expect(snapshot.audit).toBeDefined();
  });

  it('lädt Fixture-Snapshot erfolgreich', async () => {
    const src = makeHubSpotBaselineSource('fixture');
    const snapshot = await src.fetchSnapshot();
    expect(snapshot.companies.length).toBeGreaterThan(0);
  });

  it('wirft DataSourceError für unbekannte Version', async () => {
    const src = makeHubSpotBaselineSource('unknown-hubspot-version');
    await expect(src.fetchSnapshot()).rejects.toThrow(DataSourceError);
  });
});
