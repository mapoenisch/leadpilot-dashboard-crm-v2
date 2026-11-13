import { describe, expect, it } from 'vitest';
import dealsCases from '../../../../supabase/tests/fixtures/dashboard_query_parity/deals_parity_cases.json';
import { getPipelineOverview, type FunnelDealSource } from '@/domain/executiveCockpitData';
import type { ImportedFunnelDeal } from '@/types/crm';

function createDealSource(rawDeals: unknown[]): FunnelDealSource {
  const deals: ImportedFunnelDeal[] = (rawDeals as Record<string, unknown>[]).map((d, idx) => ({
    id: String(d.id || `d-${idx}`),
    dealName: String(d.dealName || `Deal ${idx}`),
    stage: String(d.stage ?? ''),
    amount: d.amount === null ? 0 : Number(d.amount),
    closeDate: '2026-12-31',
    pipeline: String(d.pipeline || 'default'),
  }));

  return {
    getImportedFunnelDeals: async () => deals,
  };
}

describe('Dashboard CRM Query Parity (Auftrag 154 §2.4 Nr. 17)', () => {
  it('Fall "leer": leere Deal-Menge liefert 0 Deals, 0 Volumen und leere Stufenliste', async () => {
    const source = createDealSource(dealsCases.leer);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(0);
    expect(overview.totalVolume).toBe(0);
    expect(overview.wonVolume).toBe(0);
    expect(overview.openVolume).toBe(0);
    expect(overview.stages).toEqual([]);
  });

  it('Fall "eine_pipeline": aggregiert korrekt über alle Stufen', async () => {
    const source = createDealSource(dealsCases.eine_pipeline);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(3);
    expect(overview.totalVolume).toBe(8500);
    expect(overview.wonVolume).toBe(5000); // Gewonnen: 5000
    expect(overview.openVolume).toBe(3500); // Erstkontakt (1000) + Qualifizierung (2500)
    expect(overview.stages).toHaveLength(3);
    // Sortierung nach Volumen absteigend: Gewonnen (5000), Qualifizierung (2500), Erstkontakt (1000)
    expect(overview.stages[0]?.stage).toBe('Gewonnen');
    expect(overview.stages[1]?.stage).toBe('Qualifizierung');
    expect(overview.stages[2]?.stage).toBe('Erstkontakt');
  });

  it('Fall "gleiche_volumen": deterministischer Tie-Break sortiert alphabetisch bei gleichem Volumen und gleicher Anzahl', async () => {
    const source = createDealSource(dealsCases.gleiche_volumen);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(3);
    expect(overview.totalVolume).toBe(1000);
    // A-Stufe (500, Count 1), B-Stufe (500, Count 2)
    // b.volume - a.volume -> Gleichstand 500
    // b.count - a.count -> B-Stufe hat count 2, A-Stufe hat count 1 -> B-Stufe kommt VOR A-Stufe!
    expect(overview.stages[0]?.stage).toBe('B-Stufe');
    expect(overview.stages[0]?.count).toBe(2);
    expect(overview.stages[1]?.stage).toBe('A-Stufe');
    expect(overview.stages[1]?.count).toBe(1);

    // Weiterer Tie-Break-Test: Gleiches Volumen UND gleicher Count -> alphabetisch (A vor Z)
    const tieSource: FunnelDealSource = {
      getImportedFunnelDeals: async () => [
        { id: '1', dealName: 'D1', stage: 'Z-Stufe', amount: 300, closeDate: '', pipeline: 'p' },
        { id: '2', dealName: 'D2', stage: 'A-Stufe', amount: 300, closeDate: '', pipeline: 'p' },
      ],
    };
    const tieOverview = await getPipelineOverview(tieSource);
    expect(tieOverview.stages[0]?.stage).toBe('A-Stufe');
    expect(tieOverview.stages[1]?.stage).toBe('Z-Stufe');
  });

  it('Fall "stufen_formatting": trimmt Leerzeichen und matcht Case-Insensitive', async () => {
    const source = createDealSource(dealsCases.stufen_formatting);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(4);
    expect(overview.totalVolume).toBe(6500);
    expect(overview.wonVolume).toBe(3000); // " GEWONNEN "
    expect(overview.openVolume).toBe(2000); // "  Erstkontakt  " (1200) + "Erstkontakt" (800) = 2000
    // Erstkontakt wurde zusammengefasst auf 2 Deals
    const erstkontakt = overview.stages.find((s) => s.stage === 'Erstkontakt');
    expect(erstkontakt).toBeDefined();
    expect(erstkontakt?.count).toBe(2);
    expect(erstkontakt?.volume).toBe(2000);
  });

  it('Fall "gewonnen_verloren_offen": klassifiziert Status zuverlässig', async () => {
    const source = createDealSource(dealsCases.gewonnen_verloren_offen);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(3);
    expect(overview.wonVolume).toBe(6000);
    expect(overview.openVolume).toBe(4000);
    expect(overview.totalVolume).toBe(12500); // 4000 + 6000 + 2500
  });

  it('Fall "betrag_null": Betrag NULL wird wie 0 behandelt', async () => {
    const source = createDealSource(dealsCases.betrag_null);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(2);
    expect(overview.totalVolume).toBe(1500);
  });

  it('Fall "cent_betraege": summiert Cent-Beträge exakt', async () => {
    const source = createDealSource(dealsCases.cent_betraege);
    const overview = await getPipelineOverview(source);

    expect(overview.totalDeals).toBe(3);
    expect(Math.round(overview.totalVolume * 100) / 100).toBe(4000.5);
  });

  it('Ungültige Deals: wirft Fehler bei Betrag < 0 oder leerer Stufe', async () => {
    const badAmountSource = createDealSource(dealsCases.ungueltig_betrag_negativ);
    await expect(getPipelineOverview(badAmountSource)).rejects.toThrow('Ungültiger Betrag');

    const badStageSource = createDealSource(dealsCases.ungueltig_stufe_leer);
    await expect(getPipelineOverview(badStageSource)).rejects.toThrow('Fehlende Funnel-Stage');
  });

  it('Fall "1.500 Deals": Rot-Nachweis für 1.000er-Kappung des alten Pfads vs. Vollbestand', async () => {
    // 1.500 synthetische Deals
    const all1500Deals: ImportedFunnelDeal[] = Array.from({ length: 1500 }, (_, i) => ({
      id: `deal-${i + 1}`,
      dealName: `Deal ${i + 1}`,
      stage: i % 3 === 0 ? 'Gewonnen' : i % 3 === 1 ? 'Qualifizierung' : 'Erstkontakt',
      amount: 10,
      closeDate: '2026-12-31',
      pipeline: 'Sales',
    }));

    // 1. Alter Pfad (mit 1.000er-Kappung / Limit)
    const oldTruncatedSource: FunnelDealSource = {
      getImportedFunnelDeals: async () => all1500Deals.slice(0, 1000),
    };
    const truncatedOverview = await getPipelineOverview(oldTruncatedSource);
    expect(truncatedOverview.totalDeals).toBe(1000);
    expect(truncatedOverview.totalVolume).toBe(10000); // 1000 * 10 = 10.000 (abgeschnitten!)

    // 2. Neuer Vollbestand-Pfad (ohne 1.000er-Kappung)
    const fullSource: FunnelDealSource = {
      getImportedFunnelDeals: async () => all1500Deals,
    };
    const fullOverview = await getPipelineOverview(fullSource);
    expect(fullOverview.totalDeals).toBe(1500);
    expect(fullOverview.totalVolume).toBe(15000); // 1500 * 10 = 15.000 (vollständig ausgewertet!)
  });
});
