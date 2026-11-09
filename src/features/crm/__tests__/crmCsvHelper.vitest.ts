import { describe, it, expect } from 'vitest';
import { parseCsv, sanitizeCsvCell, serializeCsv } from '../utils/crmCsvHelper';

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

  it('schützt Zellen mit Formelpräfixen vor CSV-Injection', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('@cmd')).toBe("'@cmd");
    expect(sanitizeCsvCell('+diff')).toBe("'+diff");
    expect(sanitizeCsvCell('-calc')).toBe("'-calc");
  });
});
