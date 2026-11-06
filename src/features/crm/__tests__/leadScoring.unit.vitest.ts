import { describe, it, expect } from 'vitest';
import {
  calculateLeadScore,
  estimateDealAmountForLead,
  type LeadScoringInput,
} from '../services/leadScoringService';

describe('leadScoringService', () => {
  it('erkennt perfekten ICP-Fit (DACH, 50 MA, Software, CEO) als Hot Lead mit 100 Punkten', () => {
    const input: LeadScoringInput = {
      countryOrCity: 'Berlin, Deutschland',
      employeeCount: 50,
      industry: 'IT / Software',
      jobTitle: 'Chief Executive Officer (CEO)',
    };

    const res = calculateLeadScore(input);
    expect(res.totalScore).toBe(100);
    expect(res.tier).toBe('hot');
    expect(res.tierLabel).toBe('Hot Lead');
    expect(res.icon).toBe('🔥');
    expect(res.breakdown).toHaveLength(4);

    const region = res.breakdown.find((b) => b.key === 'region');
    expect(region?.points).toBe(30);

    const size = res.breakdown.find((b) => b.key === 'size');
    expect(size?.points).toBe(30);

    const industry = res.breakdown.find((b) => b.key === 'industry');
    expect(industry?.points).toBe(20);

    const persona = res.breakdown.find((b) => b.key === 'persona');
    expect(persona?.points).toBe(20);
  });

  it('klassifiziert typischen Warm Lead (DACH, 15 MA, andere Branche, Teamleiter) im 50-79 Punkte-Bereich', () => {
    const input: LeadScoringInput = {
      countryOrCity: 'Wien',
      employeeCount: 15,
      industry: 'Gesundheitswesen',
      jobTitle: 'Sales Team Lead',
    };

    const res = calculateLeadScore(input);
    // 30 (DACH) + 15 (15 MA) + 10 (andere Branche) + 12 (Management) = 67 Pkt
    expect(res.totalScore).toBe(67);
    expect(res.tier).toBe('warm');
    expect(res.icon).toBe('🟡');
  });

  it('stuft unvollständige oder internationale Leads unter 50 Punkten als Cold Lead ein', () => {
    const input: LeadScoringInput = {
      countryOrCity: 'USA / Remote',
      employeeCount: 5,
      industry: 'Einzelhandel',
      jobTitle: 'Praktikant',
    };

    const res = calculateLeadScore(input);
    // 10 (Nicht DACH) + 10 (< 10 MA) + 10 (Andere) + 5 (Sonstige) = 35 Pkt
    expect(res.totalScore).toBe(35);
    expect(res.tier).toBe('cold');
    expect(res.icon).toBe('❄️');
  });

  it('schätzt Deal-Beträge dynamisch und plausibel anhand der Unternehmensgröße', () => {
    expect(estimateDealAmountForLead(null)).toBe(25000);
    expect(estimateDealAmountForLead(15)).toBe(15000);
    expect(estimateDealAmountForLead(40)).toBe(30000);
    expect(estimateDealAmountForLead(80)).toBe(48000);
    expect(estimateDealAmountForLead(200)).toBe(75000);
    expect(estimateDealAmountForLead(500)).toBe(120000);
  });
});
