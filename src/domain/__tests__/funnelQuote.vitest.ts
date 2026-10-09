// Auftrag 085 / F08: Quoten aus Zähler/Nenner, eine Nachkommastelle, keine ∞/NaN.
import { describe, it, expect } from 'vitest';
import { berechneQuote, formatQuote, NICHT_BERECHENBAR } from '../funnelQuote';
import { FUNNEL, FUNNEL_QUARTALE } from '../vertriebData';

describe('formatQuote', () => {
  it('ohne Nenner → „Nicht berechenbar“', () => {
    expect(formatQuote(108, undefined)).toBe(NICHT_BERECHENBAR);
    expect(formatQuote(108, null)).toBe(NICHT_BERECHENBAR);
    expect(berechneQuote(108, undefined)).toBeNull();
  });

  it('Nenner 0 → keine Unendlich-/NaN-Anzeige', () => {
    expect(formatQuote(108, 0)).toBe(NICHT_BERECHENBAR);
    expect(formatQuote(0, 0)).toBe(NICHT_BERECHENBAR);
    expect(formatQuote(Number.NaN, 192)).toBe(NICHT_BERECHENBAR);
    expect(formatQuote(108, Number.POSITIVE_INFINITY)).toBe(NICHT_BERECHENBAR);
  });

  it('108 / 192 → 56,3 % (eine Nachkommastelle)', () => {
    expect(formatQuote(108, 192)).toBe('56,3 %');
    expect(formatQuote(192, 516)).toBe('37,2 %');
    expect(formatQuote(47, 108)).toBe('43,5 %');
    expect(formatQuote(0, 192)).toBe('0,0 %');
  });
});

describe('FUNNEL – eine Quelle für Jahreswert, Schnitt und Conversion', () => {
  const zahl = (text: string | undefined) =>
    Number((text ?? '').replace(/\./g, '').replace(',', '.'));
  const zeile = (stufe: string) => FUNNEL.rows.find((row) => row[0] === stufe) ?? [];

  it('Summe der Quartale entspricht dem Jahreswert', () => {
    for (const row of FUNNEL.rows) {
      const quartale = row.slice(1, 5).map(zahl);
      expect(quartale.reduce((a, b) => a + b, 0)).toBe(zahl(row[5]));
    }
    expect(zahl(zeile('Leads gesamt')[5])).toBe(1776);
    expect(zahl(zeile('Neukunden')[5])).toBe(47);
  });

  it('Diagrammreihen entsprechen den Tabellenzeilen', () => {
    const tabelle = (stufe: string) => zeile(stufe).slice(1, 5).map(zahl);
    const reihe = (label: string) => FUNNEL.chart.datasets.find((d) => d.label === label)?.data;
    expect(reihe('Leads')).toEqual(tabelle('Leads gesamt'));
    expect(reihe('MQLs')).toEqual(tabelle('Marketing Qualified Leads (MQL)'));
    expect(reihe('SQLs')).toEqual(tabelle('Sales Qualified Leads (SQL)'));
    expect(reihe('Neukunden')).toEqual(tabelle('Neukunden'));
    expect([...FUNNEL_QUARTALE.angebote]).toEqual(tabelle('Angebote'));
  });

  it('Conversion je Stufe = Jahreswert / Jahreswert der Vorstufe (Entscheidung 09.10.2026)', () => {
    expect(zeile('Marketing Qualified Leads (MQL)')[7]).toBe('29,1 % der Leads');
    expect(zeile('Sales Qualified Leads (SQL)')[7]).toBe('37,2 % der MQL');
    expect(zeile('Angebote')[7]).toBe('56,3 % der SQL');
    expect(zeile('Neukunden')[7]).toBe('Win Rate 43,5 %');
    expect(zeile('Neukunden')[6]).toBe('3,9');
  });
});
