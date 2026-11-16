// Auftrag 160 (P10b-1): Server-Zeitreihen, Historienbeginn und Datenlücken.
// Holt dauerhafte, belegte Historie vom Server über den RPC public.dashboard_time_series.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { EffectiveTileFilter } from '../model/dashboardFilters';
import {
  getScopeForLayer,
  type ResolvedTileData,
  type TileTimeSeriesData,
  type TimeSeriesPoint,
  type TimeSeriesResolution,
} from './dashboardData';

export interface TimeSeriesWindow {
  from: string;
  to: string;
  resolution: TimeSeriesResolution;
  count: number;
}

export interface FetchTimeSeriesParams {
  source: 'deal_stage_events' | 'live_kpi';
  metric: string;
  resolution: TimeSeriesResolution;
  from: string;
  to: string;
  pipeline?: string | null;
}

export interface FetchTimeSeriesOptions {
  supabaseClient?: typeof supabase;
  isConfigured?: boolean;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

interface BerlinParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
  offset: string;
}

function getBerlinParts(date: Date | string | number): BerlinParts {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
    timeZoneName: 'longOffset',
  });
  const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
  const offset = parts.timeZoneName ? parts.timeZoneName.replace('GMT', '') : '+01:00';
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday ?? '',
    offset,
  };
}

function getBerlinMidnightOffset(year: number, month: number, day: number): string {
  // Berlin ist UTC+1 (Winter) oder UTC+2 (Sommer). Zeitumstellungen erfolgen frühestens um 02:00.
  // 23:30 UTC des Vortags liegt in Berlin immer zwischen 00:30 und 01:30 des Zieltages und damit
  // vor jedem DST-Sprung im exakten Zeitzonen-Offset von Mitternacht.
  const midnightUtc = new Date(Date.UTC(year, month - 1, day - 1, 23, 30, 0));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      timeZoneName: 'longOffset',
    })
      .formatToParts(midnightUtc)
      .map((p) => [p.type, p.value]),
  );
  return parts.timeZoneName ? parts.timeZoneName.replace('GMT', '') : '+01:00';
}

function makeBerlinDate(year: number, month: number, day: number): Date {
  return new Date(
    `${pad2(year)}-${pad2(month)}-${pad2(day)}T00:00:00${getBerlinMidnightOffset(year, month, day)}`,
  );
}

/** Formatiert ein Datum in der Zeitzone Europe/Berlin als ISO-8601-String mit Zeitzonenoffset. */
export function formatBerlinIso(date: Date | string | number): string {
  const p = getBerlinParts(date);
  return `${pad2(p.year)}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}${p.offset}`;
}

const WEEKDAY_OFFSET_MAP: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Rundet ein Datum in Europe/Berlin auf den Beginn des jeweiligen Zeitabschnitts ab. */
export function truncateBerlin(
  date: Date | string | number,
  resolution: TimeSeriesResolution,
): Date {
  const p = getBerlinParts(date);
  if (resolution === 'stunde') {
    return new Date(
      `${pad2(p.year)}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:00:00${p.offset}`,
    );
  }
  if (resolution === 'tag') return makeBerlinDate(p.year, p.month, p.day);
  if (resolution === 'woche') {
    const diff = WEEKDAY_OFFSET_MAP[p.weekday] ?? 0;
    const u = new Date(Date.UTC(p.year, p.month - 1, p.day - diff));
    return makeBerlinDate(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate());
  }
  if (resolution === 'monat') return makeBerlinDate(p.year, p.month, 1);
  return new Date(date);
}

/** Zieht in Europe/Berlin n Abschnitte von einem Datum ab (unabhängig von Browser-Zeitzone). */
export function subtractBerlin(
  date: Date | string | number,
  count: number,
  resolution: TimeSeriesResolution,
): Date {
  const p = getBerlinParts(date);
  if (resolution === 'stunde') {
    return truncateBerlin(new Date(new Date(date).getTime() - count * 3600_000), 'stunde');
  }
  if (resolution === 'tag') {
    const u = new Date(Date.UTC(p.year, p.month - 1, p.day - count));
    return makeBerlinDate(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate());
  }
  if (resolution === 'woche') {
    const diff = WEEKDAY_OFFSET_MAP[p.weekday] ?? 0;
    const u = new Date(Date.UTC(p.year, p.month - 1, p.day - diff - count * 7));
    return makeBerlinDate(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate());
  }
  if (resolution === 'monat') {
    const u = new Date(Date.UTC(p.year, p.month - 1 - count, 1));
    return makeBerlinDate(u.getUTCFullYear(), u.getUTCMonth() + 1, 1);
  }
  return new Date(date);
}

/**
 * Berechnet Standardzeitraum from/to für einen Verlaufseintrag in Europe/Berlin (Auftrag 160 §2.3 Nr. 19).
 * Prüft strikt die 400-Punkte-Grenze.
 */
export function timeSeriesWindow(
  entry: ActiveCatalogEntry,
  now: Date | string | number = Date.now(),
): TimeSeriesWindow {
  const windowDef = entry.history.defaultWindow ?? {
    resolution: entry.source.layer === 'crm' ? ('woche' as const) : ('stunde' as const),
    count: entry.source.layer === 'crm' ? 12 : 24,
  };

  if (windowDef.count > 400) {
    throw new RangeError(`zu_viele_punkte: ${windowDef.count} übersteigt Grenze von 400`);
  }

  const toDate = truncateBerlin(now, windowDef.resolution);
  const fromDate = subtractBerlin(toDate, windowDef.count, windowDef.resolution);

  return {
    from: formatBerlinIso(fromDate),
    to: formatBerlinIso(toDate),
    resolution: windowDef.resolution,
    count: windowDef.count,
  };
}

export type ParseTimeSeriesResult =
  { ok: true; data: TileTimeSeriesData } | { ok: false; message: string };

/**
 * Validiert die RPC-Antwort streng und ignoriert unbekannte Felder (Auftrag 160 §2.3 Nr. 17).
 */
export function parseTimeSeriesResponse(raw: unknown): ParseTimeSeriesResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Antwort ist kein gültiges Objekt' };
  }

  const obj = raw as Record<string, unknown>;

  const rawSource = String(obj.source || '');
  if (rawSource !== 'deal_stage_events' && rawSource !== 'live_kpi') {
    return { ok: false, message: `Unbekannte Quelle: ${rawSource}` };
  }
  const source: 'deal_stage_events' | 'live_kpi_events' =
    rawSource === 'live_kpi' ? 'live_kpi_events' : 'deal_stage_events';

  const rawResolution = String(obj.resolution || '');
  if (!['stunde', 'tag', 'woche', 'monat'].includes(rawResolution)) {
    return { ok: false, message: `Unbekannte Auflösung: ${rawResolution}` };
  }
  const resolution = rawResolution as TimeSeriesResolution;

  if (typeof obj.from !== 'string' || typeof obj.to !== 'string') {
    return { ok: false, message: 'from/to fehlen oder sind keine Zeichenketten' };
  }

  const historyStartAt =
    obj.historyStartAt === null || typeof obj.historyStartAt === 'string'
      ? (obj.historyStartAt as string | null)
      : null;

  if (!Array.isArray(obj.points)) {
    return { ok: false, message: 'points ist kein Array' };
  }

  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < obj.points.length; i++) {
    const pt = obj.points[i];
    if (!pt || typeof pt !== 'object') {
      return { ok: false, message: `Punkt an Index ${i} ist kein Objekt` };
    }
    const ptObj = pt as Record<string, unknown>;
    const at = typeof ptObj.bucketStart === 'string' ? ptObj.bucketStart : '';
    if (!at) {
      return { ok: false, message: `Punkt an Index ${i} hat keinen gültigen bucketStart` };
    }

    const rawStatus = String(ptObj.status || '');
    if (!['belegt', 'luecke', 'vor_historienbeginn'].includes(rawStatus)) {
      return { ok: false, message: `Punkt an Index ${i} hat ungültigen Status: ${rawStatus}` };
    }
    const status = rawStatus as TimeSeriesPoint['status'];

    let value: number | null = null;
    if (ptObj.value !== null && ptObj.value !== undefined) {
      const num = Number(ptObj.value);
      if (!Number.isFinite(num)) {
        return { ok: false, message: `Punkt an Index ${i} hat keinen endlichen Wert` };
      }
      value = num;
    }

    const measuredAt = typeof ptObj.measuredAt === 'string' ? ptObj.measuredAt : null;

    points.push({ at, value, status, measuredAt });
  }

  const pipelineBasis =
    obj.pipelineBasis === 'aktuelle_pipeline_des_deals'
      ? ('aktuelle_pipeline_des_deals' as const)
      : undefined;
  const generatedAt = typeof obj.generatedAt === 'string' ? obj.generatedAt : null;

  return {
    ok: true,
    data: {
      source,
      resolution,
      from: obj.from,
      to: obj.to,
      historyStartAt,
      points,
      pipelineBasis,
      generatedAt,
    },
  };
}

/** Ruft die RPC public.dashboard_time_series über Supabase ab (Auftrag 160 §2.3 Nr. 17). */
export async function fetchTimeSeries(
  params: FetchTimeSeriesParams,
  options: FetchTimeSeriesOptions = {},
): Promise<TileTimeSeriesData> {
  const isConfigured = options.isConfigured ?? isSupabaseConfigured;
  const client = options.supabaseClient ?? supabase;

  if (!isConfigured || !client) {
    throw new Error('Supabase ist nicht konfiguriert');
  }

  const { data, error } = await client.rpc('dashboard_time_series', {
    p_source: params.source,
    p_metric: params.metric,
    p_resolution: params.resolution,
    p_from: params.from,
    p_to: params.to,
    p_pipeline: params.pipeline ?? null,
  });

  if (error) {
    const isMissing =
      error.code === '42883' ||
      error.code === 'PGRST202' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('schema cache');
    if (isMissing) throw new Error('Verlauf auf dem Server noch nicht verfügbar');
    throw error;
  }

  const parsed = parseTimeSeriesResponse(data);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  return parsed.data;
}

export function formatPointLabel(at: string, resolution: TimeSeriesResolution): string {
  const d = new Date(at);
  const tz = { timeZone: 'Europe/Berlin' } as const;
  if (resolution === 'woche') {
    return `Woche ${new Intl.DateTimeFormat('de-DE', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)}`;
  }
  if (resolution === 'stunde') {
    const day = new Intl.DateTimeFormat('de-DE', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    const h = new Intl.DateTimeFormat('de-DE', { ...tz, hour: '2-digit', minute: '2-digit' }).format(d);
    const nextH = `${String((Number(h.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`;
    const zName = new Intl.DateTimeFormat('de-DE', { ...tz, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value;
    return `${day}, ${h}–${nextH} Uhr${zName ? ` (${zName})` : ''}`;
  }
  if (resolution === 'tag') {
    return new Intl.DateTimeFormat('de-DE', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  }
  return new Intl.DateTimeFormat('de-DE', { ...tz, month: '2-digit', year: '2-digit' }).format(d);
}

/**
 * Erzeugt aus den Rohdaten der Zeitreihe ein ResolvedTileData-Objekt (Auftrag 160 §2.3 Nr. 16).
 * Verlaufskacheln füllen zusätzlich series mit den belegten Punkten, damit Tabelle und Kurzfassung funktionieren.
 */
export function resolveTimeSeriesTile(
  entry: ActiveCatalogEntry,
  timeSeries: TileTimeSeriesData,
  effectiveFilter: EffectiveTileFilter,
): ResolvedTileData {
  const belegtePunkte = timeSeries.points
    .filter((p) => p.status === 'belegt' && p.value !== null)
    .map((p) => ({
      label: formatPointLabel(p.at, timeSeries.resolution),
      value: p.value as number,
    }));

  const latestPoint = timeSeries.points[timeSeries.points.length - 1];
  const currentValue = latestPoint && latestPoint.status === 'belegt' ? latestPoint.value : null;

  return {
    catalogId: entry.id,
    state: 'bereit',
    value: currentValue,
    series: belegtePunkte,
    overview: null,
    unit: entry.unit,
    timeBasis: entry.timeBasis,
    asOf: latestPoint?.measuredAt ?? latestPoint?.at ?? null,
    origin: {
      layer: entry.source.layer,
      module: entry.source.module,
      exportName: entry.source.exportName,
      liveKpiId: entry.source.liveKpiId,
    },
    scope: getScopeForLayer(entry.source.layer),
    effectiveFilter,
    timeSeries,
  };
}
