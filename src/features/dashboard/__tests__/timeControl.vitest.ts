// Auftrag 159 (P10a): Zustandsübergänge der gemeinsamen Zeitsteuerung.
import { describe, expect, it } from 'vitest';
import {
  INITIAL_TIME_CONTROL_STATE,
  pauseTimeControl,
  resumeTimeControl,
  timeControlReducer,
  type TimeControlState,
} from '../time/timeControl';

const PAUSE_AT = '2026-11-15T14:32:00.000Z';

describe('timeControl', () => {
  it('startet live und ohne Analysezeitpunkt', () => {
    expect(INITIAL_TIME_CONTROL_STATE).toEqual({
      mode: 'live',
      analysisAt: null,
      resumeToken: 0,
    });
  });

  it('friert beim ersten Pausieren auf den übergebenen Zeitpunkt ein', () => {
    const paused = pauseTimeControl(INITIAL_TIME_CONTROL_STATE, PAUSE_AT);
    expect(paused.mode).toBe('pausiert');
    expect(paused.analysisAt).toBe(PAUSE_AT);
    expect(paused.resumeToken).toBe(0);
  });

  it('ändert den Analysezeitpunkt bei doppeltem Pausieren nicht', () => {
    const paused = pauseTimeControl(INITIAL_TIME_CONTROL_STATE, PAUSE_AT);
    const again = pauseTimeControl(paused, '2026-11-15T15:00:00.000Z');
    expect(again).toBe(paused);
    expect(again.analysisAt).toBe(PAUSE_AT);
  });

  it('räumt beim Fortsetzen den Analysezeitpunkt und erhöht den Fortsetzungszähler', () => {
    const paused = pauseTimeControl(INITIAL_TIME_CONTROL_STATE, PAUSE_AT);
    const resumed = resumeTimeControl(paused);
    expect(resumed).toEqual({ mode: 'live', analysisAt: null, resumeToken: 1 });
    const second = resumeTimeControl(pauseTimeControl(resumed, PAUSE_AT));
    expect(second.resumeToken).toBe(2);
  });

  it('lässt Fortsetzen im Live-Modus folgenlos', () => {
    expect(resumeTimeControl(INITIAL_TIME_CONTROL_STATE)).toBe(INITIAL_TIME_CONTROL_STATE);
  });

  it('führt dieselben Übergänge über den Reducer aus', () => {
    const paused = timeControlReducer(INITIAL_TIME_CONTROL_STATE, {
      type: 'pause',
      now: PAUSE_AT,
    });
    const resumed = timeControlReducer(paused, { type: 'resume' });
    const state: TimeControlState = timeControlReducer(resumed, { type: 'reset' });
    expect(state).toEqual(INITIAL_TIME_CONTROL_STATE);
  });

  it('unterstützt Date-Instanzen und Default-Parameter beim Pausieren', () => {
    const withDate = pauseTimeControl(INITIAL_TIME_CONTROL_STATE, new Date(PAUSE_AT));
    expect(withDate.analysisAt).toBe(PAUSE_AT);

    const withDefault = pauseTimeControl(INITIAL_TIME_CONTROL_STATE);
    expect(typeof withDefault.analysisAt).toBe('string');
  });

  describe('Modus zeitpunkt (Auftrag 161)', () => {
    it('wechselt von live in den Modus zeitpunkt und setzt analysisAt', () => {
      const next = timeControlReducer(INITIAL_TIME_CONTROL_STATE, {
        type: 'zeitpunkt',
        at: '2026-10-31T23:00:00.000Z',
        now: '2026-11-15T14:32:00.000Z',
      });
      expect(next.mode).toBe('zeitpunkt');
      expect(next.analysisAt).toBe('2026-10-31T23:00:00.000Z');
      expect(next.resumeToken).toBe(0);
    });

    it('ersetzt analysisAt beim Wechsel von zeitpunkt auf einen neuen Zeitpunkt', () => {
      const state1 = {
        mode: 'zeitpunkt' as const,
        analysisAt: '2026-10-31T23:00:00.000Z',
        resumeToken: 0,
      };
      const state2 = timeControlReducer(state1, {
        type: 'zeitpunkt',
        at: '2026-10-15T12:00:00.000Z',
        now: '2026-11-15T14:32:00.000Z',
      });
      expect(state2.mode).toBe('zeitpunkt');
      expect(state2.analysisAt).toBe('2026-10-15T12:00:00.000Z');
      expect(state2.resumeToken).toBe(0);
    });

    it('kehrt mit resume aus dem Modus zeitpunkt zu live zurück und inkrementiert resumeToken', () => {
      const state1 = {
        mode: 'zeitpunkt' as const,
        analysisAt: '2026-10-31T23:00:00.000Z',
        resumeToken: 3,
      };
      const resumed = timeControlReducer(state1, { type: 'resume' });
      expect(resumed).toEqual({
        mode: 'live',
        analysisAt: null,
        resumeToken: 4,
      });
    });

    it('lässt pause im Modus zeitpunkt folgenlos', () => {
      const state1 = {
        mode: 'zeitpunkt' as const,
        analysisAt: '2026-10-31T23:00:00.000Z',
        resumeToken: 0,
      };
      const paused = timeControlReducer(state1, { type: 'pause', now: '2026-11-16T10:00:00.000Z' });
      expect(paused).toBe(state1);
    });

    it('verwirft ungültige Zeitpunkte (Zukunft oder kein ISO) und behält Zustand unverändert', () => {
      const future = timeControlReducer(INITIAL_TIME_CONTROL_STATE, {
        type: 'zeitpunkt',
        at: '2026-11-20T00:00:00.000Z',
        now: '2026-11-15T14:32:00.000Z',
      });
      expect(future).toBe(INITIAL_TIME_CONTROL_STATE);

      const invalid = timeControlReducer(INITIAL_TIME_CONTROL_STATE, {
        type: 'zeitpunkt',
        at: 'ungueltiges-datum',
        now: '2026-11-15T14:32:00.000Z',
      });
      expect(invalid).toBe(INITIAL_TIME_CONTROL_STATE);
    });
  });
});
