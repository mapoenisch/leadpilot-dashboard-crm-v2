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

/** Formatiert ein Datum in der Zeitzone Europe/Berlin als ISO-8601-String mit Zeitzonenoffset. */
export function formatBerlinIso(date: Date | string | number): string {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset',
  });
  const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
  const offset = parts.timeZoneName ? parts.timeZoneName.replace('GMT', '') : '+01:00';
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${offset}`;
}

/** Rundet ein Datum in Europe/Berlin auf den Beginn des jeweiligen Zeitabschnitts ab. */
export function truncateBerlin(
  date: Date | string | number,
  resolution: TimeSeriesResolution,
): Date {
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
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const weekday = parts.weekday;

  if (resolution === 'stunde') {
    return new Date(`${year}-${month}-${day}T${hour}:00:00${offset}`);
  }
  if (resolution === 'tag') {
    return new Date(`${year}-${month}-${day}T00:00:00${offset}`);
  }
  if (resolution === 'woche') {
    const dayMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };

    const diff: number = weekday && weekday in dayMap ? (dayMap[weekday] ?? 0) : 0;
    const dayDate = new Date(`${year}-${month}-${day}T00:00:00${offset}`);
    dayDate.setDate(dayDate.getDate() - diff);

    const mParts = Object.fromEntries(
      formatter.formatToParts(dayDate).map((p) => [p.type, p.value]),
    );
    const mOffset = mParts.timeZoneName ? mParts.timeZoneName.replace('GMT', '') : '+01:00';
    return new Date(`${mParts.year}-${mParts.month}-${mParts.day}T00:00:00${mOffset}`);
  }
  if (resolution === 'monat') {
    return new Date(`${year}-${month}-01T00:00:00${offset}`);
  }
  return d;
}

/** Zieht in Europe/Berlin n Abschnitte von einem Datum ab. */
export function subtractBerlin(
  date: Date | string | number,
  count: number,
  resolution: TimeSeriesResolution,
): Date {
  const d = new Date(date);
  if (resolution === 'stunde') {
    d.setHours(d.getHours() - count);
  } else if (resolution === 'tag') {
    d.setDate(d.getDate() - count);
  } else if (resolution === 'woche') {
    d.setDate(d.getDate() - count * 7);
  } else if (resolution === 'monat') {
    d.setMonth(d.getMonth() - count);
  }
  return truncateBerlin(d, resolution);
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

/**
 * Ruft die RPC public.dashboard_time_series über Supabase ab (Auftrag 160 §2.3 Nr. 17).
 */
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
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      throw new Error('Verlauf auf dem Server noch nicht verfügbar');
    }
    throw error;
  }

  const parsed = parseTimeSeriesResponse(data);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  return parsed.data;
}

/** Formatiert einen Zeitreihenpunkt für die Tabellen- und Diagrammansicht. */
export function formatPointLabel(at: string, resolution: TimeSeriesResolution): string {
  const d = new Date(at);
  if (resolution === 'woche') {
    // Ermittle Kalenderwoche nach ISO
    const parts = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    return `Woche ${parts}`;
  }
  if (resolution === 'stunde') {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
  if (resolution === 'tag') {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    month: '2-digit',
    year: '2-digit',
  }).format(d);
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
