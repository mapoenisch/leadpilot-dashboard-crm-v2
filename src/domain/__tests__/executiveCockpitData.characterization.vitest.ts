// Charakterisierung: executiveCockpitData + organisationData (reine Ableitungen).
import { describe, it, expect } from 'vitest';
import {
  getExecutiveCockpitKpis,
  getArrTrendData,
  getMrrTierData,
  getTeamHrSnapshot,
  getRoadmapSnapshot,
  getPipelineOverview,
} from '../executiveCockpitData';
import { getOrganisationStructure, HEADCOUNT, HR, TEAM } from '../organisationData';
import { EXEC_KPIS_1, CHART_ARR, CHART_MRR } from '../execData';
import type { ImportedFunnelDeal } from '@/types/crm';

function deal(id: string, stage: string, amount: number): ImportedFunnelDeal {
  return { id, stage, amount } as ImportedFunnelDeal;
}

describe('getExecutiveCockpitKpis', () => {
  it('liefert 4 KPIs deckungsgleich zu EXEC_KPIS_1', () => {
    const kpis = getExecutiveCockpitKpis();
    expect(kpis).toHaveLength(4);
    expect(kpis.map((k) => k.label)).toEqual(EXEC_KPIS_1.map((k) => k.label));
    expect(kpis[0]).toMatchObject({ id: 'arr', deltaType: 'positive' });
    expect(kpis[2]).toMatchObject({ id: 'ebitda', isNegativeAlert: true });
  });

  it('ARR-Rohwert und YoY-Delta sind exakt hergeleitet', () => {
    const arr = getExecutiveCockpitKpis()[0];
    expect(arr?.rawValue).toBe(411840);
    const q4_24 = CHART_ARR.datasets[0]?.data[3] as number;
    const q4_25 = CHART_ARR.datasets[0]?.data[7] as number;
    const expected = `+${(((q4_25 - q4_24) / q4_24) * 100).toFixed(1).replace('.', ',')} % YoY`;
    expect(arr?.delta).toBe(expected);
    // Negatives EBITDA wird exakt negativ geparst
    expect(getExecutiveCockpitKpis()[2]?.rawValue).toBe(-309000);
  });
});

describe('getArrTrendData / getMrrTierData', () => {
  it('ARR-Trend folgt 1:1 den Chart-Labels und -Werten', () => {
    const trend = getArrTrendData();
    expect(trend).toHaveLength(CHART_ARR.labels.length);
    expect(trend[0]).toMatchObject({ period: 'Q1 24', arr: 120000 });
    expect(trend[7]?.label).toContain('k€');
  });

  it('MRR-Anteile summieren sich auf 100 %', () => {
    const tiers = getMrrTierData();
    expect(tiers).toHaveLength(CHART_MRR.labels.length);
    const total = (CHART_MRR.datasets[0]?.data as number[]).reduce((a, v) => a + v, 0);
    expect(tiers[0]?.sharePercent).toBe(
      Math.round(((CHART_MRR.datasets[0]?.data[0] as number) / total) * 100),
    );
    expect(tiers.reduce((a, t) => a + t.sharePercent, 0)).toBe(100);
  });
});

describe('getTeamHrSnapshot / getRoadmapSnapshot / getOrganisationStructure', () => {
  it('Team-Snapshot spiegelt Stammdaten ohne Kopie-Fehler', () => {
    const snap = getTeamHrSnapshot();
    expect(snap.metrics).toBe(HR.metrics);
    expect(snap.bottlenecks).toBe(TEAM.bottlenecks);
    expect(snap.structure.root.isRoot).toBe(true);
  });

  it('Organigramm leitet Root, Units und Total aus HEADCOUNT.rows ab', () => {
    const s = getOrganisationStructure();
    expect(s.root.role).toBe(HEADCOUNT.rows[0]?.[0]);
    expect(s.units).toHaveLength(4);
    expect(s.total.role).toContain('Gesamtbestand');
  });

  it('Roadmap-Snapshot enthält Releases', () => {
    expect(getRoadmapSnapshot().releases.length).toBeGreaterThan(0);
  });
});

describe('getPipelineOverview', () => {
  it('aggregiert Stages, sortiert nach Volumen, trennt won/offen', async () => {
    const source = {
      getImportedFunnelDeals: async () => [
        deal('d1', 'Qualifizierung', 10000),
        deal('d2', 'Gewonnen – Vertrag', 30000),
        deal('d3', 'Qualifizierung', 5000),
        deal('d4', 'Verloren – Abbruch', 7000),
      ],
    };
    const over = await getPipelineOverview(source);
    expect(over).toMatchObject({ totalDeals: 4, totalVolume: 52000, wonVolume: 30000 });
    expect(over.openVolume).toBe(15000);
    expect(over.stages[0]?.volume).toBeGreaterThanOrEqual(over.stages[1]?.volume ?? 0);
    expect(over.stages.find((s) => s.stage === 'Qualifizierung')).toMatchObject({
      count: 2,
      volume: 15000,
    });
  });

  it('leere Pipeline liefert Null-Übersicht statt Fehler', async () => {
    const over = await getPipelineOverview({ getImportedFunnelDeals: async () => [] });
    expect(over).toEqual({
      totalDeals: 0,
      totalVolume: 0,
      wonVolume: 0,
      openVolume: 0,
      stages: [],
    });
  });

  it('ungültige Deals werfen explizite Fehler', async () => {
    await expect(
      getPipelineOverview({ getImportedFunnelDeals: async () => [deal('x', 'Offen', -5)] }),
    ).rejects.toThrow('Ungültiger Betrag');
    await expect(
      getPipelineOverview({ getImportedFunnelDeals: async () => [deal('y', '   ', 100)] }),
    ).rejects.toThrow('Fehlende Funnel-Stage');
    await expect(
      getPipelineOverview({ getImportedFunnelDeals: async () => [deal('z', 'Offen', Number.NaN)] }),
    ).rejects.toThrow('Ungültiger Betrag');
  });
});
