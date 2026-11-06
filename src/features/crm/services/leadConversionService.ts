/**
 * leadConversionService.ts
 * Persistenz und CRM-Statusverwaltung für konvertierte Leads und Funnel-Deals (Auftrag 130).
 * Unterstützt Supabase-Mutationen bei aktiver Verbindung sowie mandantengebundenen
 * Speicherabgleich (sessionStorage/localStorage) für Offline-, Test- und Demo-Modus.
 */
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { type QueryClient } from '@tanstack/react-query';
import { crmKeys } from '@/services/query/queryKeys';

export interface ConvertedDealPayload {
  dealName: string;
  stage: string;
  amount: number;
  closeDate: string;
  companyName: string;
  leadId: string;
  leadName: string;
  pipeline?: string;
}

export interface StoredConvertedDeal extends ConvertedDealPayload {
  id: string;
  organizationId: string;
  createdAt: string;
  pipeline: string;
}

export function parseDealAmount(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }
  const clean = String(raw).trim().replace(',', '.');
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

export function getDealsStorageKey(orgId?: string): string {
  const oid = orgId || '00000000-0000-0000-0000-000000000001';
  return `leadpilot_crm_converted_deals_${oid}`;
}

export function getQualifiedLeadsStorageKey(orgId?: string): string {
  const oid = orgId || '00000000-0000-0000-0000-000000000001';
  return `leadpilot_crm_qualified_leads_${oid}`;
}

export function getStoredConvertedDeals(orgId?: string): StoredConvertedDeal[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getDealsStorageKey(orgId);
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getQualifiedLeadIds(orgId?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = getQualifiedLeadsStorageKey(orgId);
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function markLeadAsQualified(leadId: string, orgId?: string): void {
  if (!leadId || typeof window === 'undefined') return;
  try {
    const key = getQualifiedLeadsStorageKey(orgId);
    const current = getQualifiedLeadIds(orgId);
    current.add(leadId);
    const json = JSON.stringify(Array.from(current));
    sessionStorage.setItem(key, json);
    localStorage.setItem(key, json);
  } catch {
    // Storage nicht verfügbar
  }
}

/**
 * Persistiert einen neu konvertierten Deal in der CRM-Datenbasis und markiert den Lead als qualifiziert.
 */
export async function convertLeadToDeal(
  payload: ConvertedDealPayload,
  organizationId?: string,
  queryClient?: QueryClient,
): Promise<StoredConvertedDeal> {
  const amount = parseDealAmount(payload.amount);
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error('Der Deal-Betrag muss eine positive Zahl sein.');
  }

  const orgId = organizationId || '00000000-0000-0000-0000-000000000001';
  const dealId = `d-conv-${payload.leadId || 'lead'}-${Date.now()}`;
  const now = new Date().toISOString();
  const pipeline = payload.pipeline || 'Enterprise SaaS';

  const newDeal: StoredConvertedDeal = {
    id: dealId,
    dealName: payload.dealName.trim(),
    stage: payload.stage || 'Erstgespräch geführt',
    amount,
    closeDate: payload.closeDate || now.split('T')[0] || '2026-12-31',
    companyName: payload.companyName,
    leadId: payload.leadId,
    leadName: payload.leadName,
    organizationId: orgId,
    createdAt: now,
    pipeline,
  };

  // 1. Wenn Supabase konfiguriert ist, Mutation in imported_funnel_deals ausführen
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('imported_funnel_deals').insert({
      id: newDeal.id,
      deal_name: newDeal.dealName,
      stage: newDeal.stage,
      amount: newDeal.amount,
      close_date: newDeal.closeDate,
      pipeline: newDeal.pipeline,
      organization_id: orgId,
    });
    if (error) {
      throw new Error(`Fehler beim Speichern des Deals in der CRM-Datenbank: ${error.message}`);
    }
  }

  // 2. Lokale Mandanten-Persistenz aktualisieren
  if (typeof window !== 'undefined') {
    try {
      const dealsKey = getDealsStorageKey(orgId);
      const existing = getStoredConvertedDeals(orgId);
      existing.unshift(newDeal);
      const dealsJson = JSON.stringify(existing);
      sessionStorage.setItem(dealsKey, dealsJson);
      localStorage.setItem(dealsKey, dealsJson);

      // Lead als qualifiziert markieren
      if (payload.leadId) {
        markLeadAsQualified(payload.leadId, orgId);
      }
    } catch {
      // Ignoriere Storage-Fehler
    }
  }

  // 3. Query-Caches für Deals & Kontakte invalidieren
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: crmKeys.list('deals') });
    queryClient.invalidateQueries({ queryKey: crmKeys.list('contacts') });
  }

  return newDeal;
}

/**
 * Führt lokal konvertierte Deals und serverseitige Deals zusammen.
 */
export function mergeConvertedDeals<T extends Record<string, unknown>>(
  serverDeals: T[],
  orgId?: string,
): { items: T[]; totalBonus: number } {
  const converted = getStoredConvertedDeals(orgId);
  if (!converted.length) return { items: serverDeals, totalBonus: 0 };

  const knownIds = new Set(serverDeals.map((d) => String(d.id ?? '')));
  const missing = converted.filter((c) => !knownIds.has(c.id));

  if (!missing.length) return { items: serverDeals, totalBonus: 0 };

  const adapted = missing.map(
    (c) =>
      ({
        id: c.id,
        dealName: c.dealName,
        stage: c.stage,
        amount: c.amount,
        closeDate: c.closeDate,
        pipeline: c.pipeline,
        companyName: c.companyName,
        leadId: c.leadId,
        leadName: c.leadName,
        isConverted: true,
      }) as unknown as T,
  );

  return {
    items: [...adapted, ...serverDeals],
    totalBonus: adapted.length,
  };
}
