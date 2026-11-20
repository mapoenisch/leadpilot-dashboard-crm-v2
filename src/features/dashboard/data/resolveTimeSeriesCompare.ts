// Auftrag 170 (P14b): Server-Zeitreihen mit Vergleichszeitraum (Vorperiode / Vorjahr) und
// Phaseneintritte je Phase für die Heatmap „Phase × Woche“. Ruft die neuen RPCs
// public.dashboard_time_series_compare und public.dashboard_time_series_phases auf.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import type { TimeSeriesPoint, TimeSeriesResolution } from './dashboardData';
import { parseTimeSeriesResponse } from './resolveTimeSeries';
import type { TimeSeriesCompareType } from '../model/timeseries/types';
import { partialCompareNotice } from '../model/timeseries/computeComparison';

export interface FetchTimeSeriesCompareParams {
  source: 'deal_stage_events' | 'live_kpi';
  metric: string;
  resolution: TimeSeriesResolution;
  from: string;
  to: string;
  compare: TimeSeriesCompareType;
  pipeline?: string | null;
}

export interface FetchRpcOptions {
  supabaseClient?: typeof supabase;
  isConfigured?: boolean;
}

export interface TileTimeSeriesCompareData {
  compare: TimeSeriesCompareType;
  resolution: TimeSeriesResolution;
  compareFrom: string;
  compareTo: string;
  /** Frühester belegter Zeitpunkt (datenstand_ab). */
  datenstandAb: string | null;
  isPartial: boolean;
  /** „Vergleich unvollständig: Daten ab TT.MM.JJJJ“ oder null. */
  partialNotice: string | null;
  basePoints: readonly TimeSeriesPoint[];
  comparePoints: readonly TimeSeriesPoint[];
}

export interface TilePhaseSeriesData {
  resolution: TimeSeriesResolution;
  from: string;
  to: string;
  phases: readonly { phase: string; points: readonly TimeSeriesPoint[] }[];
}

type Parsed<T> = { ok: true; data: T } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validiert die Antwort streng; beide Fenster laufen durch denselben Parser wie der Verlauf. */
export function parseTimeSeriesCompareResponse(raw: unknown): Parsed<TileTimeSeriesCompareData> {
  if (!isRecord(raw)) return { ok: false, message: 'Antwort ist kein gültiges Objekt' };
  const compare = raw.compare;
  if (compare !== 'vorperiode' && compare !== 'vorjahr') {
    return { ok: false, message: `Unbekannter Vergleichszeitraum: ${String(compare)}` };
  }
  const base = parseTimeSeriesResponse(raw);
  if (!base.ok) return base;
  const other = parseTimeSeriesResponse({
    ...raw,
    from: raw.compareFrom,
    to: raw.compareTo,
    points: raw.comparePoints,
  });
  if (!other.ok) return { ok: false, message: `Vergleich: ${other.message}` };

  const datenstandAb = typeof raw.datenstand_ab === 'string' ? raw.datenstand_ab : null;
  const isPartial = raw.is_partial === true;
  return {
    ok: true,
    data: {
      compare,
      resolution: base.data.resolution,
      compareFrom: other.data.from,
      compareTo: other.data.to,
      datenstandAb,
      isPartial,
      partialNotice: isPartial ? partialCompareNotice(datenstandAb) : null,
      basePoints: base.data.points,
      comparePoints: other.data.points,
    },
  };
}

export function parseTimeSeriesPhasesResponse(raw: unknown): Parsed<TilePhaseSeriesData> {
  if (!isRecord(raw) || !Array.isArray(raw.phases)) {
    return { ok: false, message: 'Antwort ohne Phasenliste' };
  }
  const phases: { phase: string; points: readonly TimeSeriesPoint[] }[] = [];
  for (const entry of raw.phases) {
    if (!isRecord(entry) || typeof entry.phase !== 'string') {
      return { ok: false, message: 'Phaseneintrag ungültig' };
    }
    const parsed = parseTimeSeriesResponse({ ...raw, points: entry.points });
    if (!parsed.ok) return { ok: false, message: `Phase ${entry.phase}: ${parsed.message}` };
    phases.push({ phase: entry.phase, points: parsed.data.points });
  }
  const head = parseTimeSeriesResponse({ ...raw, points: [] });
  if (!head.ok) return head;
  return {
    ok: true,
    data: { resolution: head.data.resolution, from: head.data.from, to: head.data.to, phases },
  };
}

async function callRpc(
  name: string,
  args: Record<string, unknown>,
  options: FetchRpcOptions,
): Promise<unknown> {
  const isConfigured = options.isConfigured ?? isSupabaseConfigured;
  const client = options.supabaseClient ?? supabase;
  if (!isConfigured || !client) throw new Error('Supabase ist nicht konfiguriert');

  const { data, error } = await client.rpc(name, args);
  if (error) {
    const isMissing =
      error.code === '42883' ||
      error.code === 'PGRST202' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('schema cache');
    if (isMissing) throw new Error('Vergleich auf dem Server noch nicht verfügbar');
    throw error;
  }
  return data;
}

export async function fetchTimeSeriesCompare(
  params: FetchTimeSeriesCompareParams,
  options: FetchRpcOptions = {},
): Promise<TileTimeSeriesCompareData> {
  const data = await callRpc(
    'dashboard_time_series_compare',
    {
      p_source: params.source,
      p_metric: params.metric,
      p_resolution: params.resolution,
      p_from: params.from,
      p_to: params.to,
      p_compare: params.compare,
      p_pipeline: params.pipeline ?? null,
    },
    options,
  );
  const parsed = parseTimeSeriesCompareResponse(data);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.data;
}

export async function fetchTimeSeriesPhases(
  params: { resolution: TimeSeriesResolution; from: string; to: string; pipeline?: string | null },
  options: FetchRpcOptions = {},
): Promise<TilePhaseSeriesData> {
  const data = await callRpc(
    'dashboard_time_series_phases',
    {
      p_resolution: params.resolution,
      p_from: params.from,
      p_to: params.to,
      p_pipeline: params.pipeline ?? null,
    },
    options,
  );
  const parsed = parseTimeSeriesPhasesResponse(data);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.data;
}
