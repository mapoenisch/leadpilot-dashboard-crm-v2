/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classifyMoveDealStageError, moveDealStage, MoveDealStageError } from '../dealStageService';

const dbMock = vi.hoisted(() => ({
  configured: true,
  rpc: vi.fn(),
}));

vi.mock('@/services/db/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return dbMock.configured;
  },
  get supabase() {
    return dbMock.configured ? { rpc: dbMock.rpc } : null;
  },
}));

const INPUT = {
  dealId: 'deal-1',
  expectedStage: 'PROPOSAL',
  newStage: 'Verhandlung',
};

describe('dealStageService', () => {
  beforeEach(() => {
    dbMock.configured = true;
    dbMock.rpc.mockReset();
    dbMock.rpc.mockResolvedValue({
      data: [
        {
          deal_id: 'deal-1',
          stage: 'Verhandlung',
          stage_entered_at: '2026-11-09T10:00:00.000Z',
        },
      ],
      error: null,
    });
  });

  it('ruft move_deal_stage mit dem Rohwert als erwarteter Phase auf', async () => {
    const result = await moveDealStage(INPUT);

    expect(dbMock.rpc).toHaveBeenCalledWith('move_deal_stage', {
      p_deal_id: 'deal-1',
      p_expected_stage: 'PROPOSAL',
      p_new_stage: 'Verhandlung',
    });
    expect(result).toEqual({
      dealId: 'deal-1',
      stage: 'Verhandlung',
      stageEnteredAt: '2026-11-09T10:00:00.000Z',
    });
  });

  it.each([
    ['LP403', 'forbidden'],
    ['LP404', 'not_found'],
    ['LP409', 'conflict'],
    ['LP422', 'invalid_stage'],
  ])('bildet SQLSTATE %s auf %s ab', async (sqlstate, expected) => {
    dbMock.rpc.mockResolvedValue({
      data: null,
      error: { code: sqlstate, message: 'Datenbankmeldung' },
    });

    await expect(moveDealStage(INPUT)).rejects.toMatchObject({
      name: 'MoveDealStageError',
      code: expected,
    });
  });

  it('akzeptiert den nullable Phasenzeitpunkt einer erfolgreichen No-op-Antwort', async () => {
    dbMock.rpc.mockResolvedValueOnce({
      data: [{ deal_id: 'deal-1', stage: 'PROPOSAL', stage_entered_at: null }],
      error: null,
    });
    await expect(moveDealStage({ ...INPUT, newStage: 'Angebot erstellt' })).resolves.toEqual({
      dealId: 'deal-1',
      stage: 'PROPOSAL',
      stageEnteredAt: null,
    });
  });

  it('erkennt das Meldungspräfix, wenn kein SQLSTATE geliefert wird', () => {
    expect(classifyMoveDealStageError({ message: 'CONFLICT: Deal wurde geändert' })).toBe(
      'conflict',
    );
    expect(classifyMoveDealStageError({ message: 'FORBIDDEN: Rolle' })).toBe('forbidden');
    expect(classifyMoveDealStageError({ message: 'irgendwas anderes' })).toBe('network');
    expect(classifyMoveDealStageError(null)).toBe('network');
  });

  it('meldet Verbindungsfehler als network', async () => {
    dbMock.rpc.mockRejectedValueOnce(new Error('offline'));

    const error = await moveDealStage(INPUT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MoveDealStageError);
    expect(error).toMatchObject({ code: 'network' });
  });

  it('meldet unerwartete Antworten als network', async () => {
    dbMock.rpc.mockResolvedValueOnce({ data: [{ deal_id: 'deal-1' }], error: null });

    await expect(moveDealStage(INPUT)).rejects.toMatchObject({ code: 'network' });
  });

  it('meldet ohne konfigurierte Datenbank keinen Erfolg', async () => {
    dbMock.configured = false;

    await expect(moveDealStage(INPUT)).rejects.toMatchObject({ code: 'network' });
    expect(dbMock.rpc).not.toHaveBeenCalled();
  });
});
