import { describe, it, expect } from 'vitest';
import { DASHBOARD_CATALOG } from '../model/dashboardCatalog';
import { ALARM_CAPABILITIES, getAlarmCapability } from '../model/alarmCapability';

describe('Alarmfähigkeitsmatrix (Auftrag 166 / P13a)', () => {
  const activeEntries = DASHBOARD_CATALOG.filter((c) => c.status === 'aktiv');
  const activeIds = activeEntries.map((c) => c.id);
  const matrixIds = Object.keys(ALARM_CAPABILITIES);

  it('jede aktive Katalog-ID hat genau einen Eintrag in ALARM_CAPABILITIES', () => {
    for (const id of activeIds) {
      const cap = getAlarmCapability(id);
      expect(cap, `Katalog-ID ${id} fehlt in ALARM_CAPABILITIES`).toBeDefined();
      expect(['alarmfaehig', 'pruefbar', 'ausgeschlossen', 'nicht_einzelwert']).toContain(
        cap?.status,
      );
      expect(cap?.grund.trim().length).toBeGreaterThan(5);
      if (cap?.status === 'alarmfaehig' || cap?.status === 'pruefbar') {
        expect(cap.serverquelle).toBeDefined();
      }
    }
  });

  it('keine inaktive oder fremde Katalog-ID ist in ALARM_CAPABILITIES erfasst', () => {
    const activeSet = new Set(activeIds);
    for (const id of matrixIds) {
      expect(activeSet.has(id), `Überzählige ID ${id} in ALARM_CAPABILITIES`).toBe(true);
    }
  });

  it('statische Baseline-Referenzwerte sind ausgeschlossen', () => {
    expect(getAlarmCapability('baseline.arr')?.status).toBe('ausgeschlossen');
    expect(getAlarmCapability('baseline.umsatz')?.status).toBe('ausgeschlossen');
    expect(getAlarmCapability('kombination.ebitda_marge')?.status).toBe('ausgeschlossen');
  });

  it('Zeitreihen und Kategorien sind als nicht_einzelwert klassifiziert', () => {
    expect(getAlarmCapability('baseline.arr_verlauf')?.status).toBe('nicht_einzelwert');
    expect(getAlarmCapability('crm.pipeline_stufen_volumen')?.status).toBe('nicht_einzelwert');
    expect(getAlarmCapability('baseline.mrr_paketmix')?.status).toBe('nicht_einzelwert');
  });

  it('CRM- und Live-Einzelwerte sind als alarmfaehig markiert (Auftrag 167)', () => {
    expect(getAlarmCapability('crm.pipeline_deals')?.status).toBe('alarmfaehig');
    expect(getAlarmCapability('live.arr')?.status).toBe('alarmfaehig');
  });

  it('Gesamtzählungen stimmen exakt mit den Spezifikationen überein', () => {
    let alarmfaehig = 0;
    let pruefbar = 0;
    let ausgeschlossen = 0;
    let nichtEinzelwert = 0;

    for (const id of matrixIds) {
      const s = ALARM_CAPABILITIES[id]!.status;
      if (s === 'alarmfaehig') alarmfaehig++;
      else if (s === 'pruefbar') pruefbar++;
      else if (s === 'ausgeschlossen') ausgeschlossen++;
      else if (s === 'nicht_einzelwert') nichtEinzelwert++;
    }

    expect(alarmfaehig).toBe(16);
    expect(pruefbar).toBe(0);
    expect(ausgeschlossen).toBe(13);
    expect(nichtEinzelwert).toBe(33);
    expect(matrixIds.length).toBe(62);
  });
});
