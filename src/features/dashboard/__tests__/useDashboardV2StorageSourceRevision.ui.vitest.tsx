// Auftrag 173 (P16a §2.1): Die Kopiermigration hält die tatsächliche V1-Quellrevision fest,
// damit der Abgleich V1 <-> V2 erkennt, ob der alte Stand nach dem Kopieren weiter bearbeitet
// wurde. Vor 173 stand dort immer 1.
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardV2Storage } from '../hooks/useDashboardV2Storage';
import { resetInMemoryDashboardV2Storage } from '../services/dashboardInMemoryStoreV2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { organizationId: 'test-org', userId: 'test-user' },
    isLoading: false,
  }),
}));

const prefs: { state: unknown } = { state: null };
vi.mock('../hooks/useDashboardPreferences', () => ({
  useDashboardPreferences: () => ({ state: prefs.state, isLoading: false }),
}));

beforeEach(() => {
  resetInMemoryDashboardV2Storage();
});

async function copiedSourceRevision() {
  const { result } = renderHook(() => useDashboardV2Storage());
  await waitFor(() => expect(result.current.status).toBe('bereit'));
  return result.current.dashboard?.config.metadata?.last_migrated_revision;
}

describe('Kopiermigration: Quellrevision', () => {
  it('übernimmt die Revision des gespeicherten alten Stands', async () => {
    prefs.state = {
      kind: 'gespeichert',
      config: DEFAULT_DASHBOARD_CONFIG,
      revision: 7,
      unavailable: [],
      canSave: true,
    };
    expect(await copiedSourceRevision()).toBe(7);
  });

  it('kein alter Stand geladen: 0 (Kopie vom Standardstand)', async () => {
    prefs.state = null;
    expect(await copiedSourceRevision()).toBe(0);
  });

  it('nicht lesbarer alter Stand: 0, obwohl eine Revision existiert', async () => {
    prefs.state = {
      kind: 'ungueltig',
      issues: [],
      config: DEFAULT_DASHBOARD_CONFIG,
      revision: 4,
      canSave: true,
    };
    expect(await copiedSourceRevision()).toBe(0);
  });
});
