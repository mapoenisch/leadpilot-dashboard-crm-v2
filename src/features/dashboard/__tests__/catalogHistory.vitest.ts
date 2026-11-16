// Auftrag 159 (P10a): Integrität der Historienmatrix.
// Der Test ist die Sperre gegen neue Katalogeinträge ohne geprüfte Historienart.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getActiveEntries,
  getCatalogEntry,
  type ActiveCatalogEntry,
} from '../model/dashboardCatalog';
import { COMBINATION_RULES } from '../model/catalog/combinationRules';
import { deriveCombinationHistory, HISTORY_KIND_TEXT } from '../model/historyCapability';

const snapshot = JSON.parse(
  readFileSync(new URL('./fixtures/catalogHistory.snapshot.json', import.meta.url), 'utf8'),
) as { counts: Record<string, number>; entries: Record<string, string> };

function activeEntries(): ActiveCatalogEntry[] {
  return getActiveEntries();
}

describe('Historienmatrix im Katalog', () => {
  it('gibt jedem aktiven Eintrag eine vollständige Historienangabe', () => {
    for (const entry of activeEntries()) {
      expect(entry.history, `${entry.id} ohne history`).toBeTruthy();
      expect(HISTORY_KIND_TEXT[entry.history.kind], `${entry.id} unbekannte Art`).toBeTruthy();
      expect(entry.history.note.trim().length, `${entry.id} ohne Begründung`).toBeGreaterThan(0);
    }
  });

  it('setzt source nur bei belegten Ereignissen und rekonstruiert nie einen Bestand', () => {
    for (const entry of activeEntries()) {
      if (entry.history.kind !== 'ereignisse') {
        expect(entry.history.source, `${entry.id}: source ohne ereignisse`).toBeUndefined();
        expect(
          entry.history.defaultWindow,
          `${entry.id}: defaultWindow ohne ereignisse`,
        ).toBeUndefined();
      } else {
        expect(entry.history.source, `${entry.id}: ereignisse ohne source`).toBeTruthy();
        expect(
          entry.history.defaultWindow,
          `${entry.id}: ereignisse ohne defaultWindow`,
        ).toBeTruthy();
        expect(entry.history.defaultWindow!.count, `${entry.id}: count <= 400`).toBeLessThanOrEqual(
          400,
        );
        expect(entry.history.defaultWindow!.count, `${entry.id}: count > 0`).toBeGreaterThan(0);
        expect(['stunde', 'tag', 'woche', 'monat'], `${entry.id}: ungültige Auflösung`).toContain(
          entry.history.defaultWindow!.resolution,
        );
        expect(entry.aggregation, `${entry.id}: kein ereignisse mit aggregation bestand`).not.toBe(
          'bestand',
        );
        if (entry.source.layer === 'crm') {
          expect(entry.aggregation, `${entry.id}: CRM-Ereignisse müssen Fluss sein`).toBe('fluss');
        }
      }
      if (entry.aggregation === 'bestand') {
        expect(entry.history.reconstructable, `${entry.id}: Bestand als Fluss`).toBe('nein');
      }
    }
  });

  it('leitet Kombinationen nur aus festen Operanden als fest ab', () => {
    for (const entry of activeEntries().filter((item) => item.source.layer === 'kombination')) {
      const rule = COMBINATION_RULES.find((item) => item.id === entry.id);
      expect(rule, `${entry.id} ohne Regel`).toBeTruthy();
      const parts = [rule!.numerator.catalogId, rule!.denominator.catalogId].map((id) => {
        const operand = getCatalogEntry(id);
        expect(operand?.status, `${id} nicht aktiv`).toBe('aktiv');
        return (operand as ActiveCatalogEntry).history;
      });
      expect(entry.history.kind).toBe(deriveCombinationHistory(parts).kind);
    }
  });

  it('erkennt eine neue Art ohne Zuordnung (reine Funktion)', () => {
    const fest = getCatalogEntry('baseline.arr') as ActiveCatalogEntry;
    const live = getCatalogEntry('live.arr') as ActiveCatalogEntry;
    expect(deriveCombinationHistory([fest.history, fest.history]).kind).toBe('fest');
    expect(deriveCombinationHistory([fest.history, live.history]).kind).toBe('keine');
    expect(deriveCombinationHistory([]).kind).toBe('keine');
  });

  it('stimmt mit der erzeugten Zuordnung überein (Snapshot)', () => {
    const actual: Record<string, string> = {};
    const counts: Record<string, number> = {};
    for (const entry of activeEntries()) {
      actual[entry.id] = entry.history.kind;
      counts[entry.history.kind] = (counts[entry.history.kind] ?? 0) + 1;
    }
    const sorted = Object.fromEntries(
      Object.entries(actual).sort(([a], [b]) => a.localeCompare(b)),
    );
    expect(sorted).toEqual(snapshot.entries);
    expect(
      Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
    ).toEqual(
      Object.fromEntries(Object.entries(snapshot.counts).sort(([a], [b]) => a.localeCompare(b))),
    );
  });
});
