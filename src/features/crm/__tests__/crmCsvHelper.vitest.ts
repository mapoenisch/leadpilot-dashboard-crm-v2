import { describe, it, expect } from 'vitest';
import { parseCsv, serializeCsv, applyStageOverridesToCsv } from '../utils/crmCsvHelper';

describe('crmCsvHelper', () => {
  it('parst und serialisiert RFC 4180 CSV mit Kommas, Quotes und Zeilenumbrüchen', () => {
    const csv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,"Beratung, Implementierung & Rollout",Lead eingegangen,25000,2026-12-31,Enterprise\r\n' +
      'd-2,"Projekt mit ""Spezial""-Anforderung\r\nMehrzeilig",Angebot erstellt,15000,2026-11-30,Data\r\n';

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['ID', 'Deal Name', 'Stage', 'Betrag', 'Abschlussdatum', 'Pipeline']);
    expect(rows[1]![1]).toBe('Beratung, Implementierung & Rollout');
    expect(rows[2]![1]).toBe('Projekt mit "Spezial"-Anforderung\r\nMehrzeilig');

    const serialized = serializeCsv(rows);
    expect(serialized).toContain('Beratung, Implementierung & Rollout');
    expect(serialized.startsWith('\uFEFF')).toBe(true);
  });

  it('überschreibt Stage-Werte exakt ohne Beschädigung von Namen mit Kommas', () => {
    const csv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,"Beratung, Implementierung",Lead eingegangen,25000,2026-12-31,Enterprise\r\n' +
      'd-2,Einfacher Deal,Lead eingegangen,10000,2026-10-31,SaaS\r\n';

    const updated = applyStageOverridesToCsv(csv, { 'd-1': 'Verhandlung' });
    const parsed = parseCsv(updated);

    expect(parsed[1]![0]).toBe('d-1');
    expect(parsed[1]![1]).toBe('Beratung, Implementierung');
    expect(parsed[1]![2]).toBe('Verhandlung'); // Stage aktualisiert
    expect(parsed[2]![2]).toBe('Lead eingegangen'); // Unberührt
  });

  it('filtert bei angegebenem targetStageFilter ausschließlich die passende Phase', () => {
    const csv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,"Beratung, Implementierung",Lead eingegangen,25000,2026-12-31,Enterprise\r\n' +
      'd-2,Einfacher Deal,Lead eingegangen,10000,2026-10-31,SaaS\r\n';

    // d-1 wurde verschoben nach "Verhandlung", Filter steht auf "Verhandlung"
    const filteredVerhandlung = applyStageOverridesToCsv(
      csv,
      { 'd-1': 'Verhandlung' },
      'Verhandlung',
    );
    const parsedVerhandlung = parseCsv(filteredVerhandlung);
    expect(parsedVerhandlung).toHaveLength(2); // Header + d-1
    expect(parsedVerhandlung[1]![0]).toBe('d-1');
    expect(parsedVerhandlung[1]![2]).toBe('Verhandlung');

    // Filter steht auf "Lead eingegangen" -> d-1 darf NICHT mehr enthalten sein
    const filteredLead = applyStageOverridesToCsv(
      csv,
      { 'd-1': 'Verhandlung' },
      'Lead eingegangen',
    );
    const parsedLead = parseCsv(filteredLead);
    expect(parsedLead).toHaveLength(2); // Header + d-2
    expect(parsedLead[1]![0]).toBe('d-2');
  });
});
