// Executive Dashboard V2 (Auftrag 168 / P13c):
// Dienstfunktionen für Admin-Alarme, Worker-Status und Revisions-Aufbewahrung.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import { logger } from '@/services/logger';
import { inMemoryAlarmStore, shouldUseInMemoryStore } from './dashboardAlarmInMemory';
import type { OrganizationAlarmRuleItem, AlarmWorkerStatus } from './dashboardAlarmTypes';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert');
  }
  return supabase;
}

export async function fetchAlarmWorkerStatus(): Promise<AlarmWorkerStatus> {
  const fallback: AlarmWorkerStatus = {
    status: 'ok',
    letzterLauf: new Date().toISOString(),
    minutenSeitLetztemLauf: 1,
    auswertungAktiv: true,
    ueberfaellig: false,
  };

  if (shouldUseInMemoryStore()) {
    return inMemoryAlarmStore.workerStatus ?? fallback;
  }

  // Fehler werden bewusst weitergereicht: TanStack Query behält dann den letzten
  // bestätigten Status, statt einen gesunden Worker vorzutäuschen (Codex-Befund PR #209).
  const { data, error } = await requireSupabase().rpc('alarm_worker_status');
  if (error) {
    logger.warn('[dashboardAlarmService] alarm_worker_status Fehler:', error);
    throw new Error(error.message || 'Worker-Status konnte nicht geladen werden');
  }
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!r) throw new Error('Worker-Status ohne Daten');

  const letzterLaufStr = (r.letzterLaufAm ?? r.letzter_lauf ?? null) as string | null;
  const letzterErfolgStr = (r.letzterErfolgAm ?? r.letzter_erfolg_am ?? letzterLaufStr) as
    string | null;

  let minuten: number | null = null;
  if (typeof r.minutenSeitLetztemLauf === 'number') {
    minuten = r.minutenSeitLetztemLauf;
  } else if (typeof r.minuten_seit_letztem_lauf === 'number') {
    minuten = r.minuten_seit_letztem_lauf;
  } else if (letzterErfolgStr) {
    const diffMs = Date.now() - new Date(letzterErfolgStr).getTime();
    minuten = Math.max(0, Math.round(diffMs / 60000));
  }

  const status = (r.status ?? 'ok') as AlarmWorkerStatus['status'];
  const auswertungAktiv =
    typeof r.auswertungAktiv === 'boolean'
      ? r.auswertungAktiv
      : typeof r.auswertung_aktiv === 'boolean'
        ? r.auswertung_aktiv
        : status !== 'pausiert';
  const ueberfaellig =
    status === 'ueberfaellig' ||
    (typeof r.ueberfaellig === 'boolean'
      ? r.ueberfaellig
      : status !== 'pausiert' && auswertungAktiv && minuten !== null && minuten >= 15);

  return {
    status,
    letzterLauf: letzterLaufStr,
    minutenSeitLetztemLauf: minuten,
    auswertungAktiv,
    ueberfaellig,
  };
}

export async function fetchOrganizationAlarmRules(): Promise<{
  ok: boolean;
  data?: OrganizationAlarmRuleItem[];
  error?: string;
}> {
  if (shouldUseInMemoryStore()) {
    return { ok: true, data: inMemoryAlarmStore.getOrgRules() };
  }

  try {
    const { data, error } = await requireSupabase().rpc('list_organization_alarm_rules');
    if (error) {
      logger.warn('[dashboardAlarmService] list_organization_alarm_rules Fehler:', error);
      return { ok: false, error: error.message };
    }
    const rawList = (data as Array<Record<string, unknown>>) || [];
    const rules: OrganizationAlarmRuleItem[] = rawList.map((r) => ({
      id: String(r.id),
      dashboardId: String(r.dashboard_id),
      dashboardTitle: String(r.dashboard_title || ''),
      tileId: String(r.tile_id),
      catalogId: String(r.catalog_id),
      ruleConfig: (r.rule_config as Record<string, unknown>) || {},
      mindestdauerLaeufe: Number(r.mindestdauer_laeufe || 1),
      abklingzeitSekunden: Number(r.abklingzeit_sekunden || 0),
      status: r.status as OrganizationAlarmRuleItem['status'],
      responsibleUserId: String(r.responsible_user_id || ''),
      responsibleEmail: String(r.responsible_email || ''),
      beobachteteStufe: r.beobachtete_stufe ? String(r.beobachtete_stufe) : null,
      bestaetigteStufe: r.bestaetigte_stufe ? String(r.bestaetigte_stufe) : null,
      letzterMesswert:
        r.letzter_messwert !== null && r.letzter_messwert !== undefined
          ? Number(r.letzter_messwert)
          : null,
      letzteAuswertung: r.letzte_auswertung ? String(r.letzte_auswertung) : null,
      createdAt: String(r.created_at || ''),
      updatedAt: String(r.updated_at || ''),
    }));
    return { ok: true, data: rules };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Technischer Fehler' };
  }
}

export async function fetchDashboardRetentionInfo(
  dashboardId: string,
): Promise<{ entfernt: boolean; letzteBereinigung: string | null }> {
  if (!dashboardId || !isSupabaseConfigured || !supabase) {
    return { entfernt: false, letzteBereinigung: null };
  }

  try {
    const { data, error } = await requireSupabase().rpc('dashboard_revision_retention_info', {
      p_dashboard_id: dashboardId,
    });
    if (error) {
      logger.warn('[dashboardAlarmService] dashboard_revision_retention_info Fehler:', error);
      return { entfernt: false, letzteBereinigung: null };
    }
    const r = Array.isArray(data) ? data[0] : data;
    if (!r) return { entfernt: false, letzteBereinigung: null };
    return {
      entfernt: Boolean(r.entfernt),
      letzteBereinigung: r.letzte_bereinigung ?? null,
    };
  } catch {
    return { entfernt: false, letzteBereinigung: null };
  }
}
