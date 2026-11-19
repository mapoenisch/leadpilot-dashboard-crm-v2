import { describe, it, expect } from 'vitest';
import { getRevisionRetentionNotice } from '../model/dashboardAlarmPermitted';

describe('Auftrag 168 - T1(e) Rot-Nachweis: Versionslisten-Hinweis nach Aufräumen', () => {
  it('liefert den Hinweis, wenn ältere Versionen entfernt wurden', () => {
    const notice = getRevisionRetentionNotice({ entfernt: true, letzteBereinigung: '2026-11-25T10:00:00Z' });
    expect(notice).toBe('Ältere Versionen wurden nach der Aufbewahrungsregel entfernt.');
  });

  it('liefert null, wenn keine Versionen entfernt wurden', () => {
    const notice = getRevisionRetentionNotice({ entfernt: false, letzteBereinigung: null });
    expect(notice).toBeNull();
  });
});
