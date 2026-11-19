import { describe, it, expect } from 'vitest';
import { formatUnreadAlarmCount, shouldPollAlarmCount } from '../model/dashboardAlarmPermitted';

describe('Auftrag 168 - T1(b) Rot-Nachweis: Zähler nach neuem Ereignis und Tab-Sichtbarkeit', () => {
  it('formatiert Zähler korrekt (0 -> "", 1 -> "1", 99 -> "99", 100 -> "99+") und liefert barrierefreien Namen', () => {
    expect(formatUnreadAlarmCount(0)).toEqual({ display: '', ariaLabel: 'Keine ungelesenen Alarme', hasUnread: false });
    expect(formatUnreadAlarmCount(1)).toEqual({ display: '1', ariaLabel: '1 ungelesener Alarm', hasUnread: true });
    expect(formatUnreadAlarmCount(3)).toEqual({ display: '3', ariaLabel: '3 ungelesene Alarme', hasUnread: true });
    expect(formatUnreadAlarmCount(99)).toEqual({ display: '99', ariaLabel: '99 ungelesene Alarme', hasUnread: true });
    expect(formatUnreadAlarmCount(120)).toEqual({ display: '99+', ariaLabel: 'Mehr als 99 ungelesene Alarme', hasUnread: true });
  });

  it('pausiert die Aktualisierung bei verstecktem Tab und ohne Anmeldung', () => {
    expect(shouldPollAlarmCount({ isTabVisible: true, isAuthenticated: true })).toBe(true);
    expect(shouldPollAlarmCount({ isTabVisible: false, isAuthenticated: true })).toBe(false);
    expect(shouldPollAlarmCount({ isTabVisible: true, isAuthenticated: false })).toBe(false);
    expect(shouldPollAlarmCount({ isTabVisible: false, isAuthenticated: false })).toBe(false);
  });
});
