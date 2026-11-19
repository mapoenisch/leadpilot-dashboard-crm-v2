import { describe, it, expect } from 'vitest';
import { ALARM_CAPABILITIES } from '../model/alarmCapability';
import parityCases from '../../../../supabase/tests/fixtures/alarm_parity/alarm_parity_cases.json';
import alarmKpis from '../../../../supabase/tests/fixtures/alarm_parity/alarm_kpis.json';

describe('Alarm-Parität Client/Server (Auftrag 167 / P13b)', () => {
  it('alarm_kpis.json enthaelt genau 16 Kennzahlen', () => {
    expect(alarmKpis.length).toBe(16);
  });

  it('jede in alarm_kpis.json aufgefuehrte Kennzahl existiert in ALARM_CAPABILITIES', () => {
    for (const kpi of alarmKpis) {
      const cap = ALARM_CAPABILITIES[kpi.id];
      expect(cap, `Kennzahl ${kpi.id} nicht in ALARM_CAPABILITIES`).toBeDefined();
    }
  });

  it('jede alarmfaehige Kennzahl hat mindestens einen Paritaetsfall', () => {
    const parityKpiIds = new Set(parityCases.map((c) => c.catalogId));
    const alarmfaehigeIds = Object.entries(ALARM_CAPABILITIES)
      .filter(([_, cap]) => (cap.status as string) === 'alarmfaehig')
      .map(([id]) => id);

    for (const id of alarmfaehigeIds) {
      expect(parityKpiIds.has(id), `Kein Paritaetsfall fuer alarmfaehige Kennzahl ${id}`).toBe(
        true,
      );
    }
  });

  it('alle Paritaetsfaelle haben gueltige erwartete Werte', () => {
    for (const c of parityCases) {
      expect(c.id).toBeDefined();
      expect(c.catalogId).toBeDefined();
      expect(typeof c.erwartet.wert).toBe('number');
      expect(c.erwartet.einheit).toBeDefined();
      expect(c.erwartet.zustand).toBe('ok');
    }
  });
});
