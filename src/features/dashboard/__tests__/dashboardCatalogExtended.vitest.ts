// Auftrag 078 (Dashboard Teilauftrag 8a): Katalogausbau. Jede neue Kachel löst über denselben
// Datenweg wie die Kachel auf; Summen werden gegen die bereits aktiven Einzelwerte geprüft.
import { describe, expect, it } from 'vitest';
import { CHART_QUARTAL } from '@/domain/execData';
import { REGIONEN } from '@/domain/kundenData';
import { HISTORIE } from '@/domain/unternehmenData';
import { FUNNEL } from '@/domain/vertriebData';
import {
  isDatasetPath,
  parseFormattedBaselineNumber,
  readDatasetSeries,
  readTableSeries,
} from '../data/baselineSources';
import type { ResolvedTileData } from '../data/dashboardData';
import { resolveBaseline } from '../data/resolveBaseline';
import { blockedPartnersFor } from '../model/dashboardCombinations';
import { DASHBOARD_CATALOG, PIE_VIEWS, getCatalogEntry } from '../model/dashboardCatalog';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import { resolveEffectiveFilter } from '../model/dashboardFilters';
import { EXTENDED_ENTRIES } from '../model/catalog/extendedEntries';

const resolve = (id: string): ResolvedTileData => {
  const entry = getCatalogEntry(id) as ActiveCatalogEntry;
  const tile = {
    tileId: 't',
    catalogId: id,
    view: entry.defaultView,
    size: entry.minSize,
    filterMode: 'fester_stand' as const,
  };
  return resolveBaseline(entry, resolveEffectiveFilter(tile, entry));
};
const values = (id: string) => (resolve(id).series ?? []).map((point) => point.value);
const sum = (id: string) => values(id).reduce((total, value) => total + value, 0);
const scalar = (id: string) => resolve(id).value;
/** Ganzzahlige Zehntel, damit Prozentsummen nicht an Gleitkommarundung scheitern. */
const tenths = (id: string) =>
  values(id).reduce((total, value) => total + Math.round(value * 10), 0);

describe('Katalogausbau (Auftrag 078)', () => {
  it('löst jede neue Kachel ohne Fehler auf', () => {
    for (const entry of EXTENDED_ENTRIES) {
      const result = resolve(entry.id);
      expect(result.state, entry.id).toBe('bereit');
      if (entry.kind === 'kpi') expect(result.series?.length, entry.id).toBeGreaterThan(1);
    }
  });

  it('hält die Aufteilungen konsistent mit den aktiven Einzelwerten', () => {
    expect(sum('baseline.erloesmix')).toBe(scalar('baseline.umsatz'));
    expect(sum('baseline.arr_nach_segment')).toBe(scalar('baseline.arr'));
    expect(sum('baseline.kunden_nach_region')).toBe(scalar('baseline.kunden_aktiv'));
    expect(sum('baseline.kunden_nach_region')).toBe(REGIONEN.total);
    expect(tenths('baseline.kanal_mix')).toBe(1000);
    expect(tenths('baseline.gesellschafter')).toBe(1000);
  });

  it('hält die Quartalsreihen konsistent mit der FY-Spalte und dem Stichtag', () => {
    const fy = (stage: string) =>
      parseFormattedBaselineNumber(FUNNEL.rows.find((row) => row[0] === stage)?.[5] ?? '');
    expect(sum('baseline.leads_quartal')).toBe(fy('Leads gesamt'));
    expect(sum('baseline.neukunden_quartal')).toBe(fy('Neukunden'));
    expect(values('baseline.neukunden_quartal')).toEqual(CHART_QUARTAL.datasets[0]!.data);
    const headcount = values('baseline.headcount_verlauf');
    expect(headcount[headcount.length - 1]).toBe(scalar('baseline.headcount'));
  });

  it('liest Zeilentabellen mit Beschriftung und ohne Summenzeile', () => {
    expect(resolve('baseline.kunden_nach_region').series).toEqual([
      { label: 'Deutschland', value: 61 },
      { label: 'Österreich', value: 3 },
      { label: 'Schweiz', value: 2 },
    ]);
    const owners = resolve('baseline.gesellschafter').series ?? [];
    expect(owners).toHaveLength(5);
    expect(owners.map((point) => point.label)).not.toContain('Gesamt');
    expect(owners[0]).toEqual({ label: 'Marc Pönisch (CEO)', value: 40 });
  });

  it('löst die Meilensteine als Übersicht in Quellreihenfolge auf', () => {
    expect(resolve('uebersicht.meilensteine').overview).toEqual({
      kind: 'meilensteine',
      data: HISTORIE.events,
    });
  });

  it('bietet Kreis und Ring nur für Anteile einer Gesamtheit an', () => {
    for (const entry of EXTENDED_ENTRIES) {
      const pie = entry.views.some((view) => PIE_VIEWS.includes(view));
      expect(pie, entry.id).toBe(entry.shape === 'anteile');
    }
  });

  it('kennzeichnet Quoten und Verhältnisse als nicht aufsummierbar', () => {
    for (const id of [
      'baseline.kanal_cac',
      'baseline.aktivierungsrate',
      'baseline.ki_scoring_nutzung',
    ]) {
      const entry = getCatalogEntry(id) as ActiveCatalogEntry;
      expect(entry.aggregation, id).toBe('verhaeltnis');
      expect(entry.definition, id).toMatch(/nicht aufsummierbar/);
    }
  });

  it('ersetzt die freigeschalteten Inventarkandidaten ohne Doppelung', () => {
    for (const id of ['baseline.produkt_nutzung', 'baseline.funnel_2025']) {
      const entry = getCatalogEntry(id);
      if (id === 'baseline.produkt_nutzung') expect(entry).toBeUndefined();
      else expect(entry?.status).toBe('aufbereiten');
    }
    expect(getCatalogEntry('baseline.quartal_neukunden_kosten')?.status).toBe('aufbereiten');
    const ids = DASHBOARD_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bietet Reihen nie als naheliegenden Kombinationspartner an', () => {
    expect(blockedPartnersFor('baseline.headcount')).toEqual([]);
    expect(blockedPartnersFor('baseline.erloesmix')).toEqual([]);
    const forUmsatz = blockedPartnersFor('baseline.umsatz').map((b) => b.entry.shape);
    expect(forUmsatz.every((shape) => shape === 'einzelwert' || shape === 'verhaeltnis')).toBe(
      true,
    );
  });
});

describe('baselineSources', () => {
  it('erkennt Datensatzpfade mit beliebigem Präfix', () => {
    expect(isDatasetPath(['datasets', 0, 'data'])).toBe(true);
    expect(isDatasetPath(['chart', 'datasets', 3, 'data'])).toBe(true);
    expect(isDatasetPath(['datasets', '0', 'data'])).toBe(false);
    expect(isDatasetPath([0, 'value'])).toBe(false);
    expect(isDatasetPath(undefined)).toBe(false);
  });

  it('meldet ungleiche Längen, fehlende Datensätze und nicht endliche Werte', () => {
    const path = ['datasets', 0, 'data'];
    expect(readDatasetSeries({ labels: ['a'], datasets: [{ data: [1, 2] }] }, path)).toEqual({
      ok: false,
      message: 'Beschriftungen und Datenpunkte stimmen nicht überein',
    });
    expect(readDatasetSeries({ labels: ['a'], datasets: [] }, path).ok).toBe(false);
    expect(readDatasetSeries({ labels: ['a'], datasets: [{ data: [NaN] }] }, path)).toEqual({
      ok: false,
      message: 'Werte enthalten keine gültige endliche Zahl',
    });
    expect(readDatasetSeries({ labels: [1], datasets: [{ data: [1] }] }, path).ok).toBe(false);
  });

  it('meldet leere Tabellen, fehlende Beschriftungen und ungültige Werte', () => {
    const table = { label: 0, value: 1 } as const;
    expect(readTableSeries([], table).ok).toBe(false);
    expect(readTableSeries('keine Tabelle', table).ok).toBe(false);
    expect(readTableSeries([['', '1']], table).ok).toBe(false);
    expect(readTableSeries([['A', 'viel']], table)).toEqual({
      ok: false,
      message: 'Wert der Zeile "A" ist keine gültige Zahl',
    });
    expect(readTableSeries([['Gesamt', '1']], { ...table, excludeLabels: ['Gesamt'] })).toEqual({
      ok: false,
      message: 'Tabelle ohne auswertbare Zeilen',
    });
    expect(readTableSeries([['A', '12,5 %']], table)).toEqual({
      ok: true,
      series: [{ label: 'A', value: 12.5 }],
    });
  });

  it('löst ein unbekanntes Quellmodul als Fehler auf, nicht als leere Kachel', () => {
    const entry = getCatalogEntry('baseline.erloesmix') as ActiveCatalogEntry;
    const broken = { ...entry, source: { ...entry.source, module: 'src/domain/fehlt.ts' } };
    const tile = {
      tileId: 't',
      catalogId: entry.id,
      view: entry.defaultView,
      size: entry.minSize,
      filterMode: 'fester_stand' as const,
    };
    const result = resolveBaseline(broken, resolveEffectiveFilter(tile, broken));
    expect(result.state).toBe('fehler');
    expect(result.message).toMatch(/nicht gefunden/);
  });
});
