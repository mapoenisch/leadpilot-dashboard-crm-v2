import { describe, it, expect } from 'vitest';
import {
  calculateFunnelAnalytics,
  identifyFunnelBottlenecks,
  getEffectiveDealStage,
  calculateDealAgeInDays,
  PLAN_FUNNEL_COUNTS,
} from '../funnelAnalyticsService';
import { ImportedFunnelDeal, Contact } from '@/types/crm';

describe('funnelAnalyticsService', () => {
  const mockDeals: ImportedFunnelDeal[] = [
    {
      id: 'd1',
      dealName: 'Deal 1',
      stage: 'WON',
      amount: 20000,
      closeDate: '2026-06-30',
      pipeline: 'Core Sales',
    },
    {
      id: 'd2',
      dealName: 'Deal 2',
      stage: 'Angebot erstellt',
      amount: 15000,
      closeDate: '2026-06-30',
      pipeline: 'Core Sales',
    },
    {
      id: 'd3',
      dealName: 'Deal 3',
      stage: 'Bedarfsanalyse',
      amount: 10000,
      closeDate: '2026-06-30',
      pipeline: 'Core Sales',
    },
    {
      id: 'd4',
      dealName: 'Deal 4',
      stage: 'LEAD',
      amount: 8000,
      closeDate: '2026-06-30',
      pipeline: 'Core Sales',
    },
  ];

  const mockContacts: Contact[] = [
    { id: 'c1', companyId: 'comp1', email: 'c1@test.de' },
    { id: 'c2', companyId: 'comp2', email: 'c2@test.de' },
    { id: 'c3', companyId: 'comp3', email: 'c3@test.de' },
    { id: 'c4', companyId: 'comp4', email: 'c4@test.de' },
    { id: 'c5', companyId: 'comp5', email: 'c5@test.de' },
  ];

  describe('PLAN_FUNNEL_COUNTS', () => {
    it('enthält die exakten Faktenblatt-Jahreswerte für FY 2025', () => {
      expect(PLAN_FUNNEL_COUNTS.leads).toBe(1776);
      expect(PLAN_FUNNEL_COUNTS.mql).toBe(516);
      expect(PLAN_FUNNEL_COUNTS.sql).toBe(192);
      expect(PLAN_FUNNEL_COUNTS.angebote).toBe(108);
      expect(PLAN_FUNNEL_COUNTS.neukunden).toBe(47);
    });
  });

  describe('getEffectiveDealStage', () => {
    it('normalisiert kanonische englische Identifier auf deutsches Label', () => {
      const deal: ImportedFunnelDeal = { ...mockDeals[0]!, stage: 'WON' };
      expect(getEffectiveDealStage(deal)).toBe('Deal gewonnen');
    });

    it('beachtet lokale Overrides vor deal.stage', () => {
      const deal: ImportedFunnelDeal = { ...mockDeals[1]!, stage: 'Angebot erstellt' };
      const overrides = { d2: 'Deal gewonnen' };
      expect(getEffectiveDealStage(deal, overrides)).toBe('Deal gewonnen');
    });
  });

  describe('calculateFunnelAnalytics', () => {
    it('aggregiert Stufen und berechnet Stufen- und Delta-Quoten korrekt', () => {
      const result = calculateFunnelAnalytics({
        contacts: mockContacts,
        deals: mockDeals,
        mode: 'vergleich',
      });

      expect(result.totalLeadsLive).toBe(5); // 5 Contacts
      expect(result.totalMqlLive).toBe(4); // 4 Deals
      expect(result.totalSqlLive).toBe(3); // WON, Angebot, Bedarfsanalyse
      expect(result.totalAngeboteLive).toBe(2); // WON, Angebot
      expect(result.totalWonLive).toBe(1); // WON

      // Prüfe Stufen
      const leadsStage = result.stages.find((s) => s.key === 'leads')!;
      expect(leadsStage.liveCount).toBe(5);
      expect(leadsStage.planCount).toBe(1776);
      expect(leadsStage.planConversionQuote).toBeNull();
      expect(leadsStage.liveConversionQuote).toBeNull();

      const mqlStage = result.stages.find((s) => s.key === 'mql')!;
      expect(mqlStage.liveCount).toBe(4);
      expect(mqlStage.liveConversionQuote).toBe(80.0); // 4 / 5 * 100 = 80 %
      expect(mqlStage.planConversionQuote).toBe(29.1); // 516 / 1776 = 29.05% -> 29.1%
      expect(mqlStage.deltaQuote).toBe(50.9); // 80.0 - 29.1 = 50.9

      const sqlStage = result.stages.find((s) => s.key === 'sql')!;
      expect(sqlStage.liveCount).toBe(3);
      expect(sqlStage.liveConversionQuote).toBe(75.0); // 3 / 4 * 100 = 75 %
      expect(sqlStage.hebel).toBe('Trial-Conversion Hebel');

      const angeboteStage = result.stages.find((s) => s.key === 'angebote')!;
      expect(angeboteStage.liveCount).toBe(2);
      expect(angeboteStage.liveConversionQuote).toBe(66.7); // 2 / 3 * 100 = 66.66% -> 66.7%

      const wonStage = result.stages.find((s) => s.key === 'neukunden')!;
      expect(wonStage.liveCount).toBe(1);
      expect(wonStage.liveConversionQuote).toBe(50.0); // 1 / 2 * 100 = 50 %
      expect(wonStage.liveAmountEuro).toBe(20000);

      // End-to-End
      expect(result.overallQuotePlan).toBe(2.6); // 47 / 1776 = 2.64% -> 2.6%
      expect(result.overallQuoteLive).toBe(20.0); // 1 / 5 = 20 %
      expect(result.overallDeltaQuote).toBe(17.4);
    });

    it('behandelt leere Listen ohne Absturz oder NaN', () => {
      const result = calculateFunnelAnalytics({
        contacts: [],
        deals: [],
        mode: 'live',
      });

      expect(result.totalLeadsLive).toBe(0);
      expect(result.totalWonLive).toBe(0);
      expect(result.overallQuoteLive).toBeNull();
      expect(result.overallDeltaQuote).toBeNull();

      for (const stage of result.stages) {
        expect(stage.liveCount).toBe(0);
        expect(stage.liveConversionQuote).toBeNull();
      }
    });

    it('bezieht qualifizierte Leads aus qualifiedLeadIds mit ein', () => {
      const result = calculateFunnelAnalytics({
        contacts: mockContacts,
        deals: mockDeals, // 4 Deals
        qualifiedLeadIds: ['c1', 'c2'], // 2 zusätzliche qualifizierte Kontakte
      });

      // liveMql ist capped bei liveLeads (5)
      expect(result.totalMqlLive).toBe(5);
    });
  });

  describe('Bottleneck-Erkennung (identifyFunnelBottlenecks)', () => {
    it('erkennt Engpässe wenn Deals im Schnitt die Schwelle überschreiten', () => {
      const slowDeals: ImportedFunnelDeal[] = [
        {
          id: 'slow-1',
          dealName: 'Verzögerter Deal 1',
          stage: 'Angebot erstellt',
          amount: 25000,
          closeDate: '2026-06-30',
          pipeline: 'Core Sales',
          daysInStage: 32,
        } as ImportedFunnelDeal & { daysInStage: number },
        {
          id: 'slow-2',
          dealName: 'Verzögerter Deal 2',
          stage: 'Angebot erstellt',
          amount: 30000,
          closeDate: '2026-06-30',
          pipeline: 'Core Sales',
          daysInStage: 28,
        } as ImportedFunnelDeal & { daysInStage: number },
      ];

      const bottlenecks = identifyFunnelBottlenecks(slowDeals, undefined, undefined, 25);
      expect(bottlenecks).toHaveLength(1);
      const b0 = bottlenecks[0]!;
      expect(b0.stageName).toBe('Angebot erstellt');
      expect(b0.avgDaysInStage).toBe(30);
      expect(b0.dealCount).toBe(2);
      expect(b0.recommendation).toContain('Engpass identifiziert');
    });

    it('gibt leere Liste zurück, wenn alle Deals unterhalb der Schwelle liegen', () => {
      const fastDeals: ImportedFunnelDeal[] = [
        {
          id: 'fast-1',
          dealName: 'Schneller Deal',
          stage: 'Angebot erstellt',
          amount: 15000,
          closeDate: '2026-06-30',
          pipeline: 'Core Sales',
          daysInStage: 12,
        } as ImportedFunnelDeal & { daysInStage: number },
      ];

      const bottlenecks = identifyFunnelBottlenecks(fastDeals, undefined, undefined, 25);
      expect(bottlenecks).toHaveLength(0);
    });
  });

  describe('calculateDealAgeInDays', () => {
    it('nutzt explizites createdAt wenn vorhanden', () => {
      const refDate = new Date('2026-06-15T12:00:00Z');
      const deal = {
        id: 'deal-created',
        dealName: 'Deal mit Datum',
        stage: 'PROPOSAL',
        amount: 10000,
        closeDate: '2026-06-30',
        pipeline: 'Core',
        createdAt: '2026-06-01T12:00:00Z',
      };

      const days = calculateDealAgeInDays(deal, refDate);
      expect(days).toBe(14);
    });
  });
});
