import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const flags = { configured: true };

vi.mock('@/services/db/supabaseClient', () => ({
  get supabase() {
    return flags.configured ? { rpc } : null;
  },
  get isSupabaseConfigured() {
    return flags.configured;
  },
}));

import {
  copyDashboardV2,
  deleteTeamDashboardV2,
  listAccessibleDashboardsV2,
  loadDashboardV2,
} from '../services/dashboardSharingV2';

beforeEach(() => {
  vi.clearAllMocks();
  flags.configured = true;
});

describe('dashboardSharingV2Branches', () => {
  it('covers server_funktion_fehlt in failTechnically for all RPCs', async () => {
    rpc.mockRejectedValue({ code: 'PGRST202', message: 'function missing' });

    const res1 = await listAccessibleDashboardsV2();
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.kind).toBe('server_funktion_fehlt');

    const res2 = await loadDashboardV2('d1');
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.kind).toBe('server_funktion_fehlt');

    const res3 = await deleteTeamDashboardV2('d1', 1);
    expect(res3.ok).toBe(false);
    if (!res3.ok) expect(res3.error.kind).toBe('server_funktion_fehlt');

    const res4 = await copyDashboardV2({
      sourceId: 's1',
      targetScope: 'personal',
      title: 'Kopie',
    });
    expect(res4.ok).toBe(false);
    if (!res4.ok) expect(res4.error.kind).toBe('server_funktion_fehlt');
  });

  it('covers non-throwing error object returning technisch', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '50000', message: 'Unknown DB error' } });
    const res = await listAccessibleDashboardsV2();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('technisch');
  });

  it('covers loadDashboardV2 when row is missing or config is invalid', async () => {
    rpc.mockResolvedValueOnce({ data: [] });
    const resMissing = await loadDashboardV2('d-not-found');
    expect(resMissing.ok).toBe(false);
    if (!resMissing.ok) expect(resMissing.error.kind).toBe('nicht_gefunden');

    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'd1',
          title: 'T',
          scope: 'personal',
          revision: 1,
          config: null,
          updated_at: '',
          can_write: true,
        },
      ],
    });
    const resInvalid = await loadDashboardV2('d1');
    expect(resInvalid.ok).toBe(false);
    if (!resInvalid.ok) expect(resInvalid.error.kind).toBe('ungueltig');
  });
});
