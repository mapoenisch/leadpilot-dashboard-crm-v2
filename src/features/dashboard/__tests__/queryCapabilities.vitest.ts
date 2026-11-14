import { describe, expect, it } from 'vitest';
import { getActiveEntries } from '../model/dashboardCatalog';
import { getQueryCapabilities } from '../model/queryCapabilities';

describe('queryCapabilities (Auftrag 154 §2.2 & Task T2)', () => {
  const activeEntries = getActiveEntries();

  it('exakt 48 aktive Einträge im Katalog vorhanden', () => {
    expect(activeEntries).toHaveLength(48);
  });

  it('Tabellentest über alle 48 aktiven Einträge: Fähigkeiten deterministisch abgeleitet', () => {
    for (const entry of activeEntries) {
      const caps = getQueryCapabilities(entry);

      expect(caps.metricId).toBe(entry.id);

      // Aggregationsregel: Bestand -> letzter_stand, Fluss -> summe, Verhältnis -> verhaeltnis, keine -> []
      if (entry.aggregation === 'bestand') {
        expect(caps.allowedAggregations).toEqual(['letzter_stand']);
        expect(caps.defaultAggregation).toBe('letzter_stand');
      } else if (entry.aggregation === 'fluss') {
        expect(caps.allowedAggregations).toEqual(['summe']);
        expect(caps.defaultAggregation).toBe('summe');
      } else if (entry.aggregation === 'verhaeltnis') {
        expect(caps.allowedAggregations).toEqual(['verhaeltnis']);
        expect(caps.defaultAggregation).toBe('verhaeltnis');
      } else {
        expect(caps.allowedAggregations).toEqual([]);
        expect(caps.defaultAggregation).toBeUndefined();
      }

      // Filterregel: Nur CRM unterstützt 'pipeline'
      if (entry.source.layer === 'crm') {
        expect(caps.supportsPipelineFilter).toBe(true);
        expect(caps.allowedFilters).toEqual(['pipeline']);
      } else {
        expect(caps.supportsPipelineFilter).toBe(false);
        expect(caps.allowedFilters).toEqual([]);
      }

      // Gruppierungsregel: Nur die 2 CRM-Stufeneinträge unterstützen 'stage'
      if (entry.id === 'crm.pipeline_stufen_volumen' || entry.id === 'crm.pipeline_stufen_anzahl') {
        expect(caps.supportsStageGrouping).toBe(true);
        expect(caps.allowedGroupings).toEqual(['stage']);
      } else {
        expect(caps.supportsStageGrouping).toBe(false);
        expect(caps.allowedGroupings).toEqual([]);
      }

      // Zeitbezug: Immer exakt der timeMode der Kennzahl
      expect(caps.allowedTimeframes).toEqual([entry.timeMode]);

      // Darstellungen: Entspricht entry.views
      expect(caps.allowedPresentations).toEqual(entry.views);
    }
  });

  it('Bestandsgrößen erlauben niemals summe (Fachregel §2.2 Nr. 7)', () => {
    const bestandEntries = activeEntries.filter((e) => e.aggregation === 'bestand');
    expect(bestandEntries.length).toBeGreaterThan(0);
    for (const entry of bestandEntries) {
      const caps = getQueryCapabilities(entry);
      expect(caps.allowedAggregations).not.toContain('summe');
    }
  });
});
