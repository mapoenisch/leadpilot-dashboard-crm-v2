import { describe, it, expect } from 'vitest';
import { mapDealStage } from '../hubSpotStageMapper';

describe('067H G51 hubSpotStageMapper', () => {
  it('mappt bekannte HubSpot- und Label-Stages', () => {
    expect(mapDealStage('closedwon')).toEqual({ kind: 'known', stage: 'WON' });
    expect(mapDealStage('ClosedWon')).toEqual({ kind: 'known', stage: 'WON' });
    expect(mapDealStage('Abgeschlossen und gewonnen')).toEqual({ kind: 'known', stage: 'WON' });
    expect(mapDealStage('appointmentscheduled')).toEqual({ kind: 'known', stage: 'LEAD' });
    expect(mapDealStage('closedlost')).toEqual({ kind: 'known', stage: 'LOST' });
  });

  it('bereits gemappte Stages sind idempotent (kein Quarantänefall)', () => {
    for (const stage of [
      'LEAD',
      'QUALIFIED_LEAD',
      'PITCH_DEMO',
      'PROPOSAL',
      'CLOSING',
      'WON',
      'LOST',
    ] as const) {
      expect(mapDealStage(stage)).toEqual({ kind: 'known', stage });
    }
  });

  it('unbekannte Stages landen in Quarantäne statt LOST', () => {
    expect(mapDealStage('some-future-stage')).toEqual({
      kind: 'quarantined',
      rawStage: 'some-future-stage',
    });
    expect(mapDealStage('decisionmakerboughtin2')).toEqual({
      kind: 'quarantined',
      rawStage: 'decisionmakerboughtin2',
    });
  });

  it('leere und fehlende Stages landen in Quarantäne', () => {
    expect(mapDealStage('')).toEqual({ kind: 'quarantined', rawStage: '' });
    expect(mapDealStage('   ')).toEqual({ kind: 'quarantined', rawStage: '' });
    expect(mapDealStage(undefined)).toEqual({ kind: 'quarantined', rawStage: '' });
  });
});
