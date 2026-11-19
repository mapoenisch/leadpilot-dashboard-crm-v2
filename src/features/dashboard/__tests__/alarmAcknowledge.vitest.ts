import { describe, it, expect } from 'vitest';
import {
  canAcknowledgeAlarmEvent,
  validateAcknowledgementComment,
} from '../model/dashboardAlarmPermitted';

describe('Auftrag 168 - T1(c) Rot-Nachweis: Quittieren bei normal-Wechsel nicht möglich & Kommentar <= 280', () => {
  it('erlaubt Quittierung nur für warnung oder kritisch, nicht für normal oder entwarnung', () => {
    expect(canAcknowledgeAlarmEvent('warnung')).toBe(true);
    expect(canAcknowledgeAlarmEvent('kritisch')).toBe(true);
    expect(canAcknowledgeAlarmEvent('normal')).toBe(false);
    expect(canAcknowledgeAlarmEvent('keine_daten')).toBe(false);
    expect(canAcknowledgeAlarmEvent('fortgesetzt')).toBe(false);
  });

  it('validiert Kommentare auf maximal 280 Zeichen', () => {
    expect(validateAcknowledgementComment('Gesehen und kümmere mich.').ok).toBe(true);
    expect(validateAcknowledgementComment('').ok).toBe(true);
    expect(validateAcknowledgementComment(undefined).ok).toBe(true);

    const tooLong = 'a'.repeat(281);
    const result = validateAcknowledgementComment(tooLong);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Der Kommentar darf maximal 280 Zeichen lang sein.');
  });
});
