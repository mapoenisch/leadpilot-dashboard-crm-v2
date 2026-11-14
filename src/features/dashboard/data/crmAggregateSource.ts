import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import {
  getPipelineOverview,
  type FunnelDealSource,
  type PipelineOverview,
} from '@/domain/executiveCockpitData';
import { FilteredFunnelDealSource } from './resolveCrm';
import { CRMRepository } from '@/services/db/crmRepository';

export interface CrmPipelineOverviewResult extends PipelineOverview {
  evaluatedDeals: number;
  pipeline: string | null;
  asOf: string;
}

export interface FetchCrmOverviewOptions {
  pipeline?: string | null;
  dealSource?: FunnelDealSource;
  supabaseClient?: typeof supabase;
  isConfigured?: boolean;
}

/**
 * Holt die aggregierte Pipeline-Übersicht für das Dashboard über den Vollbestand (Auftrag 154 §2.4 Nr. 15).
 * - Wenn Supabase konfiguriert ist: Aufruf der serverseitigen RPC dashboard_crm_pipeline_overview(p_pipeline).
 *   Rechnet serverseitig über alle RLS-sichtbaren Deals ohne 1.000er-Kappung.
 * - Wenn Supabase nicht konfiguriert ist (Offline / Demo-Snapshot): Fallback auf getPipelineOverview im Browser.
 */
export async function fetchCrmPipelineOverview(
  options: FetchCrmOverviewOptions = {},
): Promise<CrmPipelineOverviewResult> {
  const isConfigured = options.isConfigured ?? isSupabaseConfigured;
  const client = options.supabaseClient ?? supabase;
  const pipeline = options.pipeline ?? null;

  if (isConfigured && client) {
    const { data, error } = await client.rpc('dashboard_crm_pipeline_overview', {
      p_pipeline: pipeline,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Keine Daten von dashboard_crm_pipeline_overview erhalten');
    }

    const res = data as unknown as CrmPipelineOverviewResult;
    return {
      totalDeals: Number(res.totalDeals) || 0,
      totalVolume: Number(res.totalVolume) || 0,
      wonVolume: Number(res.wonVolume) || 0,
      openVolume: Number(res.openVolume) || 0,
      stages: Array.isArray(res.stages)
        ? res.stages.map((s) => ({
            stage: String(s.stage || ''),
            count: Number(s.count) || 0,
            volume: Number(s.volume) || 0,
            sharePercent: Number(s.sharePercent) || 0,
          }))
        : [],
      evaluatedDeals: Number(res.evaluatedDeals) || 0,
      pipeline: res.pipeline ?? null,
      asOf: String(res.asOf || new Date().toISOString()),
    };
  }

  // Fallback (Offline / Demo ohne Supabase)
  const baseSource = options.dealSource ?? CRMRepository;
  const filteredSource = new FilteredFunnelDealSource(baseSource, pipeline);
  const overview = await getPipelineOverview(filteredSource);

  return {
    ...overview,
    evaluatedDeals: overview.totalDeals,
    pipeline,
    asOf: new Date().toISOString(),
  };
}
