/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { crmKeys } from '@/services/query/queryKeys';
import { LEAD_QUALIFICATIONS_KEY } from '../leadQualificationService';
import {
  parseDealAmount,
  classifyConvertLeadError,
  convertLeadToDeal,
  ConvertLeadError,
  type ConvertedDealPayload,
} from '../leadConversionService';

const dbMock = vi.hoisted(() => ({
  configured: true,
  rpc: vi.fn(),
}));

vi.mock('@/services/db/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return dbMock.configured;
  },
  get supabase() {
    return dbMock.configured ? { rpc: dbMock.rpc } : null;
  },
}));

const PAYLOAD: ConvertedDealPayload = {
  dealName: 'Acme – Enterprise Deal',
  stage: 'Erstgespräch geführt',
  amount: 45000,
  closeDate: '2026-12-31',
  companyName: 'Acme Cloud',
  leadId: 'lead-42',
  leadName: 'Max Mustermann',
};

const RPC_ROW = {
  id: 'd-conv-123',
  deal_name: 'Acme – Enterprise Deal',
  stage: 'Erstgespräch geführt',
  amount: 45000,
  close_date: '2026-12-31',
  pipeline: 'Enterprise SaaS',
  organization_id: 'org-1',
  source_contact_id: 'lead-42',
  created_at: '2026-11-09T12:00:00Z',
};

describe('leadConversionService', () => {
  beforeEach(() => {
    dbMock.configured = true;
    dbMock.rpc.mockReset();
    dbMock.rpc.mockResolvedValue({ data: RPC_ROW, error: null });
  });

  describe('parseDealAmount', () => {
    it('parst Ganzzahlen und Float-Werte korrekt', () => {
      expect(parseDealAmount(25000)).toBe(25000);
      expect(parseDealAmount('35000')).toBe(35000);
      expect(parseDealAmount('1250.50')).toBe(1250.5);
      expect(parseDealAmount('1250,50')).toBe(1250.5);
      expect(parseDealAmount('1e4')).toBe(10000);
    });

    it('behandelt ungültige oder negative Eingaben als 0', () => {
      expect(parseDealAmount('-500')).toBe(0);
      expect(parseDealAmount('ungültig')).toBe(0);
      expect(parseDealAmount(NaN)).toBe(0);
      expect(parseDealAmount(Infinity)).toBe(0);
    });
  });

  describe('classifyConvertLeadError', () => {
    it('bildet die RPC-Fehlercodes ab', () => {
      expect(classifyConvertLeadError({ code: 'LP403' })).toBe('forbidden');
      expect(classifyConvertLeadError({ code: 'LP404' })).toBe('not_found');
      expect(classifyConvertLeadError({ code: 'LP409' })).toBe('conflict');
      expect(classifyConvertLeadError({ code: 'LP422' })).toBe('invalid_stage');
      expect(classifyConvertLeadError({ code: 'XX000' })).toBe('network');
      expect(
        classifyConvertLeadError({ message: 'CONFLICT: Lead wurde bereits konvertiert' }),
      ).toBe('conflict');
      expect(classifyConvertLeadError(null)).toBe('network');
    });
  });

  describe('convertLeadToDeal', () => {
    it('ruft die RPC ohne ID und Organisation auf und liefert den Deal', async () => {
      const deal = await convertLeadToDeal(PAYLOAD);

      expect(dbMock.rpc).toHaveBeenCalledWith('convert_lead_to_deal', {
        p_contact_id: 'lead-42',
        p_deal_name: 'Acme – Enterprise Deal',
        p_stage: 'Erstgespräch geführt',
        p_amount: 45000,
        p_close_date: '2026-12-31',
        p_pipeline: 'Enterprise SaaS',
      });
      const rpcArgs = dbMock.rpc.mock.calls[0]![1] as Record<string, unknown>;
      expect(rpcArgs).not.toHaveProperty('p_organization_id');
      expect(rpcArgs).not.toHaveProperty('p_deal_id');

      expect(deal.id).toBe('d-conv-123');
      expect(deal.organizationId).toBe('org-1');
      expect(deal.leadId).toBe('lead-42');
    });

    it('keine lokale Speicherung: keine Storage-Keys werden geschrieben', async () => {
      await convertLeadToDeal(PAYLOAD);

      const keys = [...Object.keys(sessionStorage), ...Object.keys(localStorage)];
      expect(keys.filter((k) => k.includes('leadpilot_crm_'))).toEqual([]);
    });

    it('meldet einen RPC-Fehler als ConvertLeadError mit Code', async () => {
      dbMock.rpc.mockResolvedValue({ data: null, error: { code: 'LP409', message: 'CONFLICT' } });

      await expect(convertLeadToDeal(PAYLOAD)).rejects.toMatchObject({
        name: 'ConvertLeadError',
        code: 'conflict',
      });
    });

    it('meldet ohne Datenbank keinen Erfolg', async () => {
      dbMock.configured = false;

      await expect(convertLeadToDeal(PAYLOAD)).rejects.toBeInstanceOf(ConvertLeadError);
      expect(dbMock.rpc).not.toHaveBeenCalled();
    });

    it('lehnt unzulässige Beträge und fehlende Lead-IDs ab', async () => {
      await expect(convertLeadToDeal({ ...PAYLOAD, amount: 0 })).rejects.toMatchObject({
        code: 'invalid_stage',
      });
      await expect(convertLeadToDeal({ ...PAYLOAD, leadId: '' })).rejects.toMatchObject({
        code: 'invalid_stage',
      });
      expect(dbMock.rpc).not.toHaveBeenCalled();
    });

    it('invalidiert Deals, Kontakte, Pipeline und Qualifizierungen', async () => {
      const queryClient = new QueryClient();
      const seed = (key: readonly unknown[]) => {
        queryClient.setQueryData(key, { items: [] });
        return () => queryClient.getQueryState(key)?.isInvalidated;
      };
      const dealsList = seed(crmKeys.list('deals', { resource: 'deals', page: 2 }));
      const contactsList = seed(crmKeys.list('contacts', { resource: 'contacts' }));
      const companiesList = seed(crmKeys.list('companies', { resource: 'companies' }));
      const pipeline = seed(crmKeys.pipelineOverview());
      const qualifications = seed(LEAD_QUALIFICATIONS_KEY);

      await convertLeadToDeal(PAYLOAD, queryClient);

      expect(dealsList()).toBe(true);
      expect(contactsList()).toBe(true);
      expect(pipeline()).toBe(true);
      expect(qualifications()).toBe(true);
      expect(companiesList()).toBe(false);
    });
  });
});
