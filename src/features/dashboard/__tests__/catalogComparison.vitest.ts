// Auftrag 091: Vorjahreswerte und Klartexte im Katalog sind belegt, nicht erfunden.
import { describe, expect, it } from 'vitest';
import { GUV } from '@/domain/finanzenData';
import { HR } from '@/domain/organisationData';
import { getActiveEntries, getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';

const euro = (text: string) => Number(text.replace(/[^\d−-]/g, '').replace('−', '-'));
const guv = (position: string, column: number) =>
  euro(GUV.rows.find((row) => row[0] === position)![column]!);
const entry = (id: string) => {
  const found = getCatalogEntry(id);
  if (!found || !isActiveEntry(found)) throw new Error(id);
  return found;
};

describe('Katalog: Vorjahr und Klartext (Auftrag 091)', () => {
  it('nimmt das Vorjahr der Umsatzerlöse und des EBITDA aus der GuV (FY 2024)', () => {
    expect(GUV.headers[1]).toBe('FY 2024');
    expect(entry('baseline.umsatz').comparison).toEqual({
      label: 'FY 2024',
      value: guv('Umsatzerlöse (Gesamtumsatz)', 1),
    });
    expect(entry('baseline.ebitda').comparison).toEqual({
      label: 'FY 2024',
      value: guv('EBITDA', 1),
    });
  });

  it('nimmt den Headcount des Vorjahres aus der Organisation (31.12.2024)', () => {
    const metric = HR.metrics.find((row) => row.label.startsWith('Headcount'))!;
    expect(metric.val).toContain('2024: 8 FTE');
    expect(entry('baseline.headcount').comparison).toEqual({ label: '31.12.2024', value: 8 });
  });

  it('vergleicht nur Einträge mit festem Stand und ohne Mischung der Einheit', () => {
    for (const item of getActiveEntries().filter((candidate) => candidate.comparison)) {
      expect(item.timeMode).toBe('fest');
      expect(item.shape).toBe('einzelwert');
    }
  });

  it('nennt in Definitionen keine technischen Katalog-IDs', () => {
    for (const item of getActiveEntries())
      expect(item.definition).not.toMatch(/\b(baseline|live|crm|uebersicht|kombination)\.[a-z_]+/);
  });

  it('führt den Klartext unter dem Kürzel', () => {
    expect(entry('baseline.arr').plainName).toBe('Jährlich wiederkehrender Umsatz');
    expect(entry('baseline.ebitda').plainName).toBe('Ergebnis vor Zinsen, Steuern, Abschreibungen');
  });
});
