/**
 * leadConversionService.ts
 * Auftrag 139: Die Konvertierung Lead → Deal läuft transaktional über die
 * RPC `convert_lead_to_deal`. Deal, Phasen-Event, Qualifizierungsstatus und
 * Audit-Eintrag entstehen gemeinsam oder gar nicht. ID und Organisation
 * setzt ausschließlich die Datenbank; der Browser hält keine Deal-Kopie.
 */
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { type QueryClient } from '@tanstack/react-query';
import { crmKeys } from '@/services/query/queryKeys';
import { LEAD_QUALIFICATIONS_KEY } from './leadQualificationService';

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

export type ConvertLeadErrorCode =
  'forbidden' | 'not_found' | 'conflict' | 'invalid_stage' | 'network';

export const CONVERT_LEAD_ERROR_MESSAGES: Record<ConvertLeadErrorCode, string> = {
  forbidden: 'Sie haben keine Berechtigung, Leads in Deals zu konvertieren.',
  not_found: 'Der Lead wurde nicht gefunden oder gehört zu einem anderen Mandanten.',
  conflict: 'Dieser Lead wurde bereits in einen Deal konvertiert.',
  invalid_stage: 'Die Konvertierung wurde abgewiesen: Prüfung der Eingaben fehlgeschlagen.',
  network: 'Die Konvertierung ist fehlgeschlagen. Der Deal wurde nicht angelegt.',
};

export class ConvertLeadError extends Error {
  constructor(public readonly code: ConvertLeadErrorCode) {
    super(CONVERT_LEAD_ERROR_MESSAGES[code]);
    this.name = 'ConvertLeadError';
  }
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

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

const CODE_BY_SQLSTATE: Record<string, ConvertLeadErrorCode> = {
  LP403: 'forbidden',
  LP404: 'not_found',
  LP409: 'conflict',
  LP422: 'invalid_stage',
};

const CODE_BY_MESSAGE_PREFIX: Record<string, ConvertLeadErrorCode> = {
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  INVALID_STAGE: 'invalid_stage',
};

/** Ordnet SQLSTATE und Meldungspräfix der RPC einem festen Frontend-Code zu. */
export function classifyConvertLeadError(
  error: PostgrestErrorLike | null | undefined,
): ConvertLeadErrorCode {
  const byState = error?.code ? CODE_BY_SQLSTATE[error.code] : undefined;
  if (byState) return byState;

  const message = error?.message ?? '';
  for (const [prefix, code] of Object.entries(CODE_BY_MESSAGE_PREFIX)) {
    if (message.startsWith(`${prefix}:`)) return code;
  }
  return 'network';
}

interface ConvertedDealRow {
  id?: unknown;
  deal_name?: unknown;
  stage?: unknown;
  amount?: unknown;
  close_date?: unknown;
  pipeline?: unknown;
  organization_id?: unknown;
  created_at?: unknown;
}

function parseResult(data: unknown, payload: ConvertedDealPayload): StoredConvertedDeal {
  const row = (Array.isArray(data) ? data[0] : data) as ConvertedDealRow | null | undefined;
  if (
    !row ||
    typeof row.id !== 'string' ||
    typeof row.deal_name !== 'string' ||
    typeof row.stage !== 'string' ||
    typeof row.organization_id !== 'string'
  ) {
    throw new ConvertLeadError('network');
  }
  return {
    id: row.id,
    dealName: row.deal_name,
    stage: row.stage,
    amount: typeof row.amount === 'number' ? row.amount : payload.amount,
    closeDate:
      typeof row.close_date === 'string' ? row.close_date : payload.closeDate || '2026-12-31',
    companyName: payload.companyName,
    leadId: payload.leadId,
    leadName: payload.leadName,
    pipeline:
      typeof row.pipeline === 'string' ? row.pipeline : (payload.pipeline ?? 'Enterprise SaaS'),
    organizationId: row.organization_id,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

/**
 * Konvertiert einen qualifizierten Lead transaktional in einen Deal.
 * Die RPC prüft Rolle, Mandant, Doppelkonvertierung und Betrag selbst;
 * das Frontend übergibt weder ID noch Organisation.
 */
export async function convertLeadToDeal(
  payload: ConvertedDealPayload,
  queryClient?: QueryClient,
): Promise<StoredConvertedDeal> {
  const amount = parseDealAmount(payload.amount);
  if (amount <= 0 || !Number.isFinite(amount) || !payload.leadId) {
    throw new ConvertLeadError('invalid_stage');
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new ConvertLeadError('network');
  }

  let data: unknown;
  let error: PostgrestErrorLike | null = null;
  try {
    const response = await supabase.rpc('convert_lead_to_deal', {
      p_contact_id: payload.leadId,
      p_deal_name: payload.dealName.trim() || `${payload.companyName} – Deal`,
      p_stage: payload.stage || 'Erstgespräch geführt',
      p_amount: amount,
      p_close_date: payload.closeDate || '2026-12-31',
      p_pipeline: payload.pipeline || 'Enterprise SaaS',
    });
    data = response.data;
    error = response.error;
  } catch {
    throw new ConvertLeadError('network');
  }

  if (error) {
    throw new ConvertLeadError(classifyConvertLeadError(error));
  }

  const deal = parseResult(data, payload);

  // Listen, Pipeline-Übersicht und Qualifizierungsmenge neu laden
  if (queryClient) {
    void queryClient.invalidateQueries({ queryKey: crmKeys.listsOf('deals') });
    void queryClient.invalidateQueries({ queryKey: crmKeys.listsOf('contacts') });
    void queryClient.invalidateQueries({ queryKey: crmKeys.pipelineOverview() });
    void queryClient.invalidateQueries({ queryKey: LEAD_QUALIFICATIONS_KEY });
  }

  return deal;
}
