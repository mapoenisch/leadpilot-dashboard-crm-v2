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
  addDashboardTeamMemberV2,
  createDashboardTeamV2,
  deleteDashboardTeamV2,
  listDashboardTeamMembersV2,
  listDashboardTeamsV2,
  removeDashboardTeamMemberV2,
  updateDashboardTeamV2,
} from '../services/dashboardTeamsV2';

beforeEach(() => {
  vi.clearAllMocks();
  flags.configured = true;
});

describe('dashboardTeamsV2Branches', () => {
  it('covers server_funktion_fehlt in failTechnically for all RPCs', async () => {
    rpc.mockRejectedValue({ code: 'PGRST202', message: 'function missing' });

    const res1 = await listDashboardTeamsV2();
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.kind).toBe('server_funktion_fehlt');

    const res2 = await createDashboardTeamV2('Team');
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.kind).toBe('server_funktion_fehlt');

    const res3 = await updateDashboardTeamV2('t1', 'Team');
    expect(res3.ok).toBe(false);
    if (!res3.ok) expect(res3.error.kind).toBe('server_funktion_fehlt');

    const res4 = await deleteDashboardTeamV2('t1');
    expect(res4.ok).toBe(false);
    if (!res4.ok) expect(res4.error.kind).toBe('server_funktion_fehlt');

    const res5 = await listDashboardTeamMembersV2('t1');
    expect(res5.ok).toBe(false);
    if (!res5.ok) expect(res5.error.kind).toBe('server_funktion_fehlt');

    const res6 = await addDashboardTeamMemberV2('t1', 'u1');
    expect(res6.ok).toBe(false);
    if (!res6.ok) expect(res6.error.kind).toBe('server_funktion_fehlt');

    const res7 = await removeDashboardTeamMemberV2('t1', 'u1');
    expect(res7.ok).toBe(false);
    if (!res7.ok) expect(res7.error.kind).toBe('server_funktion_fehlt');
  });

  it('covers fallback shape branches in return values', async () => {
    // createDashboardTeamV2 with row.team_id instead of row.id
    rpc.mockResolvedValueOnce({
      data: [{ team_id: 't-fallback-1', created_at: '2026-11-20T10:00:00Z' }],
    });
    const cRes = await createDashboardTeamV2('Team Fallback');
    expect(cRes.ok).toBe(true);
    if (cRes.ok) expect(cRes.value.teamId).toBe('t-fallback-1');

    // updateDashboardTeamV2 with row.team_id
    rpc.mockResolvedValueOnce({
      data: [{ team_id: 't-fallback-2', updated_at: '2026-11-20T10:00:00Z' }],
    });
    const uRes = await updateDashboardTeamV2('t-fallback-2', 'Team Fallback 2');
    expect(uRes.ok).toBe(true);
    if (uRes.ok) expect(uRes.value.teamId).toBe('t-fallback-2');

    // deleteDashboardTeamV2 with non-object boolean
    rpc.mockResolvedValueOnce({ data: true });
    const dRes = await deleteDashboardTeamV2('t-del');
    expect(dRes.ok).toBe(true);
    if (dRes.ok) expect(dRes.value.deletedTeamId).toBe('t-del');

    // removeDashboardTeamMemberV2 with boolean true
    rpc.mockResolvedValueOnce({ data: true });
    const rRes = await removeDashboardTeamMemberV2('t1', 'u1');
    expect(rRes.ok).toBe(true);
    if (rRes.ok) expect(rRes.value.removed).toBe(true);

    // removeDashboardTeamMemberV2 with object { removed: false }
    rpc.mockResolvedValueOnce({ data: [{ removed: false }] });
    const rRes2 = await removeDashboardTeamMemberV2('t1', 'u1');
    expect(rRes2.ok).toBe(true);
    if (rRes2.ok) expect(rRes2.value.removed).toBe(false);

    // addDashboardTeamMemberV2 with boolean data
    rpc.mockResolvedValueOnce({ data: true });
    const aRes = await addDashboardTeamMemberV2('t1', 'u1');
    expect(aRes.ok).toBe(true);
    if (aRes.ok) expect(aRes.value.createdAt).toBeUndefined();
  });

  it('covers technical error with non-throwing error object', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '50000', message: 'Unknown DB error' } });
    const res = await listDashboardTeamsV2();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('technisch');
  });
});
