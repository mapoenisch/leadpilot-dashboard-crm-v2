import { describe, it, expect } from 'vitest';
import { checkAlarmTogglePermitted } from '../model/dashboardAlarmPermitted';

describe('Auftrag 168 - T1(a) Rot-Nachweis: Schalter gesperrt für Viewer mit Grund', () => {
  it('sperrt den Schalter für Viewer mit dem Grund "Alarme verwalten nur Manager und Admins."', () => {
    const result = checkAlarmTogglePermitted({
      userRole: 'viewer',
      canWriteDashboard: false,
      isDashboardSaved: true,
      isTileDraft: false,
      hasValidV2Rule: true,
      isAlarmCapable: true,
      hasSupportedFiltersOnly: true,
    });

    expect(result.permitted).toBe(false);
    expect(result.reason).toBe('Alarme verwalten nur Manager und Admins.');
  });

  it('sperrt den Schalter, wenn das Dashboard noch nicht gespeichert ist', () => {
    const result = checkAlarmTogglePermitted({
      userRole: 'manager',
      canWriteDashboard: true,
      isDashboardSaved: false,
      isTileDraft: false,
      hasValidV2Rule: true,
      isAlarmCapable: true,
      hasSupportedFiltersOnly: true,
    });

    expect(result.permitted).toBe(false);
    expect(result.reason).toBe('Speichere das Dashboard zuerst.');
  });

  it('sperrt den Schalter, wenn die Kennzahl nicht alarmfähig ist', () => {
    const result = checkAlarmTogglePermitted({
      userRole: 'admin',
      canWriteDashboard: true,
      isDashboardSaved: true,
      isTileDraft: false,
      hasValidV2Rule: true,
      isAlarmCapable: false,
      hasSupportedFiltersOnly: true,
    });

    expect(result.permitted).toBe(false);
    expect(result.reason).toBe('Für diese Kennzahl gibt es noch keinen Server-Alarm.');
  });

  it('erlaubt den Schalter, wenn alle Bedingungen erfüllt sind', () => {
    const result = checkAlarmTogglePermitted({
      userRole: 'manager',
      canWriteDashboard: true,
      isDashboardSaved: true,
      isTileDraft: false,
      hasValidV2Rule: true,
      isAlarmCapable: true,
      hasSupportedFiltersOnly: true,
    });

    expect(result.permitted).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
