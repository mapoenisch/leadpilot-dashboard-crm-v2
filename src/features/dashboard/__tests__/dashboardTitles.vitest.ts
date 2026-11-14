import { describe, expect, it } from 'vitest';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';

describe('Auftrag 158: buildDerivedDashboardTitle', () => {
  it('übernimmt kurze Titel unverändert mit Suffix', () => {
    expect(buildDerivedDashboardTitle('Vertrieb', ' (Kopie)')).toBe('Vertrieb (Kopie)');
    expect(buildDerivedDashboardTitle('Finanzen', ' 2')).toBe('Finanzen 2');
    expect(buildDerivedDashboardTitle('X', ' (Kopie)')).toBe('X (Kopie)');
  });

  it('trimmt führende und nachlaufende Leerzeichen der Basis', () => {
    expect(buildDerivedDashboardTitle('  Mein Dashboard   ', ' (Kopie)')).toBe('Mein Dashboard (Kopie)');
  });

  it('hält exakt 80 Zeichen bei 72 Zeichen Basis mit " (Kopie)" (8 Zeichen)', () => {
    const base72 = 'A'.repeat(72);
    const result = buildDerivedDashboardTitle(base72, ' (Kopie)');
    expect(result).toBe(base72 + ' (Kopie)');
    expect(result.length).toBe(80);
  });

  it('kürzt Basis bei 73 Zeichen um 1 Zeichen für " (Kopie)"', () => {
    const base73 = 'B'.repeat(73);
    const result = buildDerivedDashboardTitle(base73, ' (Kopie)');
    expect(result).toBe('B'.repeat(72) + ' (Kopie)');
    expect(result.length).toBe(80);
  });

  it('kürzt Basis bei 80 Zeichen auf 72 Zeichen für " (Kopie)"', () => {
    const base80 = 'C'.repeat(80);
    const result = buildDerivedDashboardTitle(base80, ' (Kopie)');
    expect(result).toBe('C'.repeat(72) + ' (Kopie)');
    expect(result.length).toBe(80);
  });

  it('kürzt Basis bei 80 Zeichen für " 2" (2 Zeichen) auf 78 Zeichen', () => {
    const base80 = 'D'.repeat(80);
    const result = buildDerivedDashboardTitle(base80, ' 2');
    expect(result).toBe('D'.repeat(78) + ' 2');
    expect(result.length).toBe(80);
  });

  it('entfernt angeschnittenes Leerzeichen an der Schnittstelle', () => {
    // Wenn Zeichen 72 ein Leerzeichen wäre
    const base = 'E'.repeat(71) + ' ' + 'F'.repeat(8); // 80 Zeichen
    const result = buildDerivedDashboardTitle(base, ' (Kopie)');
    expect(result).toBe('E'.repeat(71) + ' (Kopie)');
    expect(result.length).toBe(79); // 71 + 8 = 79, kein Doppel-Leerzeichen vor (Kopie)
  });

  it('behandelt Emojis und Umlaute als ganze Codepoints', () => {
    // 🚀 ist ein 2-Byte surrogate in UTF-16, aber 1 Codepoint
    const emojiBase = '🚀'.repeat(75);
    const result = buildDerivedDashboardTitle(emojiBase, ' (Kopie)');
    expect(Array.from(result).length).toBe(80);
    expect(result.endsWith(' (Kopie)')).toBe(true);
    expect(Array.from(result).slice(0, 72).join('')).toBe('🚀'.repeat(72));

    const umlautBase = 'Äöüß'.repeat(21); // 84 Zeichen
    const resUmlaut = buildDerivedDashboardTitle(umlautBase, ' 2');
    expect(Array.from(resUmlaut).length).toBe(80);
    expect(resUmlaut.endsWith(' 2')).toBe(true);
  });
});
