// 067Q / G63 — Persistenz der Run-Steuerung: RPC-Aufrufe mit Organisation,
// fail-closed ohne Client und bei RPC-Fehlern, Laden nur des eigenen Mandanten.
import { describe, expect, it, vi } from 'vitest';
import {
  discardRunPause,
  loadRunPauses,
  persistRunPause,
  recordRunControl,
} from '../runPersistenceService';
import type { RunResumeSnapshot } from '@/types/runControl';

function client(data: unknown = null, error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, from, select, eq };
}

const snapshot = {
  runId: 'run-1',
  organizationId: 'org-a',
  snapshotHash: 'a'.repeat(64),
} as RunResumeSnapshot;

describe('runPersistenceService — Run-Steuerung (G63)', () => {
  it('persistRunPause ruft save_run_pause mit Organisation, Run und Hash', async () => {
    const c = client();
    await persistRunPause(snapshot, c);
    expect(c.rpc).toHaveBeenCalledWith('save_run_pause', {
      p_organization_id: 'org-a',
      p_run_id: 'run-1',
      p_snapshot: snapshot,
      p_snapshot_hash: 'a'.repeat(64),
    });
  });

  it('ohne Organisation oder ohne Client: fail-closed', async () => {
    await expect(
      persistRunPause({ ...snapshot, organizationId: undefined }, client()),
    ).rejects.toMatchObject({ code: 'INVALID_BUNDLE' });
    await expect(persistRunPause(snapshot, null)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    await expect(loadRunPauses('', client())).rejects.toMatchObject({ code: 'INVALID_BUNDLE' });
  });

  it('RPC-Fehler (z. B. Viewer 42501) propagiert als RPC_FAILED', async () => {
    const c = client(null, { message: 'FORBIDDEN' });
    await expect(persistRunPause(snapshot, c)).rejects.toMatchObject({ code: 'RPC_FAILED' });
    await expect(discardRunPause('org-a', 'run-1', c)).rejects.toMatchObject({
      code: 'RPC_FAILED',
    });
    await expect(recordRunControl('org-a', 'run-1', 'resumed', 'corr', c)).rejects.toMatchObject({
      code: 'RPC_FAILED',
    });
  });

  it('discardRunPause und recordRunControl rufen die RPCs', async () => {
    const c = client(true);
    await expect(discardRunPause('org-a', 'run-1', c)).resolves.toBe(true);
    await recordRunControl('org-a', 'run-1', 'retried', 'corr-1', c);
    expect(c.rpc).toHaveBeenLastCalledWith('record_run_control', {
      p_organization_id: 'org-a',
      p_run_id: 'run-1',
      p_action: 'retried',
      p_correlation_id: 'corr-1',
    });
  });

  it('loadRunPauses liest nur die eigene Organisation', async () => {
    const c = client([{ snapshot }]);
    await expect(loadRunPauses('org-a', c)).resolves.toEqual([snapshot]);
    expect(c.from).toHaveBeenCalledWith('simulation_run_pauses');
    expect(c.eq).toHaveBeenCalledWith('organization_id', 'org-a');
    const failing = client(null, { message: 'boom' });
    await expect(loadRunPauses('org-a', failing)).rejects.toMatchObject({
      code: 'WORKSPACE_FAILED',
    });
    await expect(loadRunPauses('org-a', client(null))).resolves.toEqual([]);
  });
});
