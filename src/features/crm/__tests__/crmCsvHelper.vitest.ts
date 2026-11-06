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

  it('schützt überschriebene Phasen und Werte mit Formelpräfixen vor CSV-Injection', () => {
    const csv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,Normaler Deal,Lead eingegangen,25000,2026-12-31,Enterprise\r\n';

    // Überschreibe Phase mit potenzieller Formel (=1+1, @cmd, +diff, -calc)
    const updated = applyStageOverridesToCsv(csv, { 'd-1': '=1+1' });
    expect(updated).toContain("'=1+1");

    const parsed = parseCsv(updated);
    expect(parsed[1]![2]).toBe("'=1+1");
  });

  it('behandelt native (bereits geschützte) und lokal verschobene Deals bei Phasenfiltern konsistent', () => {
    // d-1 wurde serverseitig bereits als '+Partner geschützt geliefert
    // d-2 ist in "Lead eingegangen" und wird per Override nach "+Partner" verschoben
    // d-3 ist in "Angebot erstellt" und bleibt dort
    const csv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,Nativer Partner Deal,"\'+Partner",30000,2026-12-31,Partner\r\n' +
      'd-2,Verschobener Deal,Lead eingegangen,20000,2026-11-30,Enterprise\r\n' +
      'd-3,Anderer Deal,Angebot erstellt,15000,2026-10-31,Data\r\n';

    const updated = applyStageOverridesToCsv(
      csv,
      { 'd-2': '+Partner' },
      '+Partner', // Filter auf die Phase "+Partner"
    );

    const parsed = parseCsv(updated);
    // Header + d-1 + d-2 = 3 Zeilen (d-3 darf nicht enthalten sein)
    expect(parsed).toHaveLength(3);
    expect(parsed[1]![0]).toBe('d-1');
    expect(parsed[1]![2]).toBe("'+Partner"); // Formelschutz für d-1 erhalten

    expect(parsed[2]![0]).toBe('d-2');
    expect(parsed[2]![2]).toBe("'+Partner"); // Formelschutz auch für verschobenen Deal d-2
  });

  it('sortiert nach wirksamer Phase bei sortField=stage und berücksichtigt sortOrder', () => {
    const csv =
      '\uFEFFID,Deal Name,Stage,Betrag,Abschlussdatum,Pipeline\r\n' +
      'd-1,Deal 1,Z-Phase,10000,2026-12-31,Standard\r\n' +
      'd-2,Deal 2,A-Phase,20000,2026-12-31,Standard\r\n';

    // Aufsteigend nach wirksamer Phase sortieren -> d-1 (jetzt A-Phase) vor d-2 (jetzt Z-Phase)
    const ascCsv = applyStageOverridesToCsv(
      csv,
      { 'd-1': 'A-Phase', 'd-2': 'Z-Phase' },
      undefined,
      'stage',
      'asc',
    );
    const parsedAsc = parseCsv(ascCsv);
    expect(parsedAsc[1]![0]).toBe('d-1');
    expect(parsedAsc[1]![2]).toBe('A-Phase');
    expect(parsedAsc[2]![0]).toBe('d-2');
    expect(parsedAsc[2]![2]).toBe('Z-Phase');

    // Absteigend nach wirksamer Phase sortieren -> d-2 (jetzt Z-Phase) vor d-1 (jetzt A-Phase)
    const descCsv = applyStageOverridesToCsv(
      csv,
      { 'd-1': 'A-Phase', 'd-2': 'Z-Phase' },
      undefined,
      'stage',
      'desc',
    );
    const parsedDesc = parseCsv(descCsv);
    expect(parsedDesc[1]![0]).toBe('d-2');
    expect(parsedDesc[1]![2]).toBe('Z-Phase');
    expect(parsedDesc[2]![0]).toBe('d-1');
    expect(parsedDesc[2]![2]).toBe('A-Phase');
  });
});
