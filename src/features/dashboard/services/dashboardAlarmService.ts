// Executive Dashboard V2 (Auftrag 168 / P13c):
// Dienstschicht für Dashboard-Server-Alarme, Quittierungen, Lesebestätigungen und Admin-Übernahme.

import { supabase } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';

export * from './dashboardAlarmTypes';
export { inMemoryAlarmStore, shouldUseInMemoryStore } from './dashboardAlarmInMemory';
import type {
  DashboardAlarmRule,
  CreateAlarmRuleParams,
  UpdateAlarmRuleParams,
  ListAlarmEventsParams,
  AcknowledgeAlarmEventParams,
  DashboardAlarmEventItem,
} from './dashboardAlarmTypes';
import { inMemoryAlarmStore, shouldUseInMemoryStore } from './dashboardAlarmInMemory';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert');
  }
  return supabase;
}

export async function fetchDashboardAlarmRules(
  dashboardId: string,
): Promise<{ ok: boolean; data?: DashboardAlarmRule[]; error?: string }> {
  if (!dashboardId) return { ok: false, error: 'Keine Dashboard-ID angegeben' };

  if (shouldUseInMemoryStore()) {
    return { ok: true, data: inMemoryAlarmStore.getRulesForDashboard(dashboardId) };
  }

  try {
    const { data, error } = await requireSupabase().rpc('list_dashboard_alarm_rules', {
      p_dashboard_id: dashboardId,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] list_dashboard_alarm_rules Fehler:', error);
      return { ok: false, error: error.message };
    }
    const rawList = (data as Array<Record<string, unknown>>) || [];
    const rules: DashboardAlarmRule[] = rawList.map((r) => ({
      id: String(r.id),
      tileId: String(r.tile_id),
      catalogId: String(r.catalog_id),
      pipeline: r.pipeline ? String(r.pipeline) : null,
      ruleConfig: (r.rule_config as Record<string, unknown>) || {},
      mindestdauerLaeufe: Number(r.mindestdauer_laeufe || 1),
      abklingzeitSekunden: Number(r.abklingzeit_sekunden || 0),
      status: r.status as DashboardAlarmRule['status'],
      beobachteteStufe: r.beobachtete_stufe ? String(r.beobachtete_stufe) : null,
      bestaetigteStufe: r.bestaetigte_stufe ? String(r.bestaetigte_stufe) : null,
      letzterMesswert:
        r.letzter_messwert !== null && r.letzter_messwert !== undefined
          ? Number(r.letzter_messwert)
          : null,
      letzteAuswertung: r.letzte_auswertung ? String(r.letzte_auswertung) : null,
      letztesEreignisAm: r.letztes_ereignis_am ? String(r.letztes_ereignis_am) : null,
      responsibleUserId: String(r.responsible_user_id || ''),
      createdAt: String(r.created_at || ''),
    }));
    return { ok: true, data: rules };
  } catch (err: unknown) {
    logger.warn('[dashboardAlarmService] fetchDashboardAlarmRules Exception:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function createDashboardAlarmRule(
  params: CreateAlarmRuleParams,
): Promise<{ ok: boolean; ruleId?: string; error?: string }> {
  if (shouldUseInMemoryStore()) {
    const ruleId = inMemoryAlarmStore.createRule(params);
    return { ok: true, ruleId };
  }

  try {
    const { data, error } = await requireSupabase().rpc('create_dashboard_alarm_rule', {
      p_dashboard_id: params.dashboardId,
      p_tile_id: params.tileId,
      p_catalog_id: params.catalogId,
      p_pipeline: params.pipeline ?? null,
      p_rule_config: params.ruleConfig,
      p_mindestdauer: params.mindestdauerLaeufe ?? 2,
      p_abklingzeit: params.abklingzeitSekunden ?? 3600,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] create_dashboard_alarm_rule Fehler:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, ruleId: typeof data === 'string' ? data : undefined };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function updateDashboardAlarmRule(
  params: UpdateAlarmRuleParams,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseInMemoryStore()) {
    inMemoryAlarmStore.updateRule(params);
    return { ok: true };
  }

  try {
    const { error } = await requireSupabase().rpc('update_dashboard_alarm_rule', {
      p_rule_id: params.ruleId,
      p_rule_config: params.ruleConfig,
      p_mindestdauer: params.mindestdauerLaeufe ?? 2,
      p_abklingzeit: params.abklingzeitSekunden ?? 3600,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function pauseDashboardAlarmRule(
  ruleId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseInMemoryStore()) {
    inMemoryAlarmStore.pauseRule(ruleId);
    return { ok: true };
  }

  try {
    const { error } = await requireSupabase().rpc('pause_dashboard_alarm_rule', {
      p_rule_id: ruleId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function resumeDashboardAlarmRule(
  ruleId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseInMemoryStore()) {
    inMemoryAlarmStore.resumeRule(ruleId);
    return { ok: true };
  }

  try {
    const { error } = await requireSupabase().rpc('resume_dashboard_alarm_rule', {
      p_rule_id: ruleId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function deleteDashboardAlarmRule(
  ruleId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseInMemoryStore()) {
    inMemoryAlarmStore.deleteRule(ruleId);
    return { ok: true };
  }

  try {
    const { error } = await requireSupabase().rpc('delete_dashboard_alarm_rule', {
      p_rule_id: ruleId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function fetchDashboardAlarmEvents(
  params: ListAlarmEventsParams = {},
): Promise<{ ok: boolean; data?: DashboardAlarmEventItem[]; error?: string }> {
  if (shouldUseInMemoryStore()) {
    return { ok: true, data: inMemoryAlarmStore.getEvents(params) };
  }

  try {
    const { data, error } = await requireSupabase().rpc('list_dashboard_alarm_events_v2', {
      p_dashboard_id: params.dashboardId ?? null,
      p_nur_ungelesen: params.nurUngelesen ?? false,
      p_nur_warnung_kritisch: params.nurWarnungKritisch ?? false,
      p_limit: params.limit ?? 50,
      p_offset: params.offset ?? 0,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] list_dashboard_alarm_events_v2 Fehler:', error);
      return { ok: false, error: error.message };
    }

    const rawEvents = (data as Array<Record<string, unknown>>) || [];
    const events: DashboardAlarmEventItem[] = rawEvents.map((ev) => ({
      id: String(ev.id),
      ruleId: String(ev.rule_id),
      dashboardId: String(ev.dashboard_id),
      dashboardTitle: String(ev.dashboard_title || 'Unbenanntes Dashboard'),
      tileId: String(ev.tile_id),
      catalogId: String(ev.catalog_id),
      alterZustand: String(ev.alter_zustand),
      neuerZustand: String(ev.neuer_zustand),
      messwert: ev.messwert !== null && ev.messwert !== undefined ? Number(ev.messwert) : null,
      einheit: ev.einheit ? String(ev.einheit) : null,
      grenze: ev.grenze !== null && ev.grenze !== undefined ? Number(ev.grenze) : null,
      meldung: ev.meldung ? String(ev.meldung) : '',
      createdAt: String(ev.created_at),
      gelesen: Boolean(ev.gelesen),
      quittiertVon: Array.isArray(ev.quittiert_von)
        ? (ev.quittiert_von as Array<Record<string, unknown>>).map((q) => ({
            userId: String(q.user_id),
            email: String(q.email || ''),
            quittiertAt: String(q.quittiert_at),
            kommentar: q.kommentar ? String(q.kommentar) : null,
          }))
        : [],
    }));

    return { ok: true, data: events };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function markAlarmEventsRead(eventIds: string[]): Promise<number> {
  if (!eventIds.length) return 0;

  if (shouldUseInMemoryStore()) {
    return inMemoryAlarmStore.markRead(eventIds);
  }

  try {
    const { data, error } = await requireSupabase().rpc('mark_dashboard_alarm_events_read', {
      p_event_ids: eventIds,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] mark_dashboard_alarm_events_read Fehler:', error);
      return 0;
    }
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

export interface MarkAllAlarmEventsReadOptions {
  dashboardId?: string;
  nurWarnungKritisch?: boolean;
}

export async function markAllAlarmEventsRead(
  optionsOrDashboardId?: MarkAllAlarmEventsReadOptions | string,
): Promise<number> {
  const options: MarkAllAlarmEventsReadOptions =
    typeof optionsOrDashboardId === 'string'
      ? { dashboardId: optionsOrDashboardId }
      : (optionsOrDashboardId ?? {});

  if (shouldUseInMemoryStore()) {
    return inMemoryAlarmStore.markAllRead(options);
  }

  try {
    const { data, error } = await requireSupabase().rpc('mark_all_dashboard_alarm_events_read', {
      p_dashboard_id: options.dashboardId ?? null,
      p_nur_warnung_kritisch: options.nurWarnungKritisch ?? false,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] mark_all_dashboard_alarm_events_read Fehler:', error);
      return 0;
    }
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

export async function acknowledgeAlarmEvent(
  params: AcknowledgeAlarmEventParams,
): Promise<{ ok: boolean; error?: string }> {
  if (params.comment && params.comment.length > 280) {
    return { ok: false, error: 'Kommentar darf höchstens 280 Zeichen lang sein' };
  }

  if (shouldUseInMemoryStore()) {
    inMemoryAlarmStore.acknowledge(params);
    return { ok: true };
  }

  try {
    const { error } = await requireSupabase().rpc('acknowledge_dashboard_alarm_event', {
      p_event_id: params.eventId,
      p_kommentar: params.comment ? params.comment.trim() : null,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] acknowledge_dashboard_alarm_event Fehler:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function takeoverAlarmRule(ruleId: string): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseInMemoryStore()) {
    inMemoryAlarmStore.takeoverRule(ruleId);
    return { ok: true };
  }

  try {
    const { error } = await requireSupabase().rpc('takeover_dashboard_alarm_rule', {
      p_rule_id: ruleId,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] takeover_dashboard_alarm_rule Fehler:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export const takeoverDashboardAlarmRule = takeoverAlarmRule;
export const fetchDashboardAlarmEventsV2 = fetchDashboardAlarmEvents;

export async function fetchUnreadAlarmCount(): Promise<number> {
  if (shouldUseInMemoryStore()) {
    return inMemoryAlarmStore.events.filter(
      (e) => !e.gelesen && (e.neuerZustand === 'warnung' || e.neuerZustand === 'kritisch'),
    ).length;
  }

  // Fehler weiterreichen: TanStack Query bewahrt dann den letzten bestätigten Zähler.
  const { data, error } = await requireSupabase().rpc('count_unread_dashboard_alarm_events');
  if (error) {
    logger.warn('[dashboardAlarmService] count_unread_dashboard_alarm_events Fehler:', error);
    throw new Error(error.message || 'Ungelesen-Zähler konnte nicht geladen werden');
  }
  return typeof data === 'number' ? data : 0;
}

export {
  fetchAlarmWorkerStatus,
  fetchOrganizationAlarmRules,
  fetchDashboardRetentionInfo,
} from './dashboardAlarmAdminService';
