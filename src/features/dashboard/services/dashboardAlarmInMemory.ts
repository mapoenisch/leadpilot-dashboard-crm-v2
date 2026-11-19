// Executive Dashboard V2 (Auftrag 168 / P13c):
// In-Memory-Mock-Speicher und Hilfsmethoden für Vorschau und Offline-Betrieb der Alarme.

import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';
import type {
  DashboardAlarmRule,
  DashboardAlarmEventItem,
  OrganizationAlarmRuleItem,
  AlarmWorkerStatus,
  CreateAlarmRuleParams,
  UpdateAlarmRuleParams,
  ListAlarmEventsParams,
  AcknowledgeAlarmEventParams,
} from './dashboardAlarmTypes';

export class InMemoryAlarmStore {
  rules = new Map<string, DashboardAlarmRule>();
  events: DashboardAlarmEventItem[] = [];
  receipts = new Map<string, Set<string>>(); // eventId -> Set(userId)
  workerStatus: AlarmWorkerStatus | null = null;

  getRulesForDashboard(dashId: string): DashboardAlarmRule[] {
    return Array.from(this.rules.values()).filter(
      (r) => (r as unknown as { dashboardId: string }).dashboardId === dashId,
    );
  }

  createRule(params: CreateAlarmRuleParams): string {
    const id = `mock-rule-${Date.now()}`;
    const rule: DashboardAlarmRule = {
      id,
      tileId: params.tileId,
      catalogId: params.catalogId,
      pipeline: params.pipeline,
      ruleConfig: params.ruleConfig,
      mindestdauerLaeufe: params.mindestdauerLaeufe ?? 2,
      abklingzeitSekunden: params.abklingzeitSekunden ?? 3600,
      status: 'aktiv',
      responsibleUserId: 'mock-user',
      createdAt: new Date().toISOString(),
    };
    (rule as unknown as { dashboardId: string }).dashboardId = params.dashboardId;
    this.rules.set(id, rule);
    return id;
  }

  updateRule(params: UpdateAlarmRuleParams): void {
    const r = this.rules.get(params.ruleId);
    if (r) {
      r.ruleConfig = params.ruleConfig;
      if (params.mindestdauerLaeufe !== undefined) r.mindestdauerLaeufe = params.mindestdauerLaeufe;
      if (params.abklingzeitSekunden !== undefined)
        r.abklingzeitSekunden = params.abklingzeitSekunden;
    }
  }

  pauseRule(ruleId: string): void {
    const r = this.rules.get(ruleId);
    if (r) r.status = 'pausiert';
  }

  resumeRule(ruleId: string): void {
    const r = this.rules.get(ruleId);
    if (r) r.status = 'aktiv';
  }

  deleteRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getEvents(params: ListAlarmEventsParams): DashboardAlarmEventItem[] {
    let result = [...this.events];
    if (params.dashboardId) {
      result = result.filter((e) => e.dashboardId === params.dashboardId);
    }
    if (params.nurUngelesen) {
      result = result.filter((e) => !e.gelesen);
    }
    if (params.nurWarnungKritisch) {
      result = result.filter((e) => e.neuerZustand === 'warnung' || e.neuerZustand === 'kritisch');
    }
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    return result.slice(offset, offset + limit);
  }

  markRead(eventIds: string[]): number {
    let count = 0;
    const set = new Set(eventIds);
    for (const ev of this.events) {
      if (set.has(ev.id) && !ev.gelesen) {
        ev.gelesen = true;
        count++;
      }
    }
    return count;
  }

  markAllRead(
    optionsOrDashboardId?: { dashboardId?: string; nurWarnungKritisch?: boolean } | string,
  ): number {
    const options =
      typeof optionsOrDashboardId === 'string'
        ? { dashboardId: optionsOrDashboardId }
        : (optionsOrDashboardId ?? {});
    let count = 0;
    for (const ev of this.events) {
      if (options.dashboardId && ev.dashboardId !== options.dashboardId) {
        continue;
      }
      if (options.nurWarnungKritisch && !['warnung', 'kritisch'].includes(ev.neuerZustand)) {
        continue;
      }
      if (!ev.gelesen) {
        ev.gelesen = true;
        count++;
      }
    }
    return count;
  }

  acknowledge(params: AcknowledgeAlarmEventParams): void {
    const ev = this.events.find((e) => e.id === params.eventId);
    if (ev) {
      ev.gelesen = true;
      ev.quittiertVon = [
        ...ev.quittiertVon,
        {
          userId: 'current-mock-user',
          email: 'aktueller.nutzer@firma.de',
          quittiertAt: new Date().toISOString(),
          kommentar: params.comment ?? null,
        },
      ];
    }
  }

  takeoverRule(ruleId: string): void {
    const r = this.rules.get(ruleId);
    if (r) {
      r.status = 'aktiv';
      r.responsibleUserId = 'current-admin-user';
      (r as unknown as { responsibleEmail: string }).responsibleEmail = 'admin@leadpilot.de';
    }
  }

  getOrgRules(): OrganizationAlarmRuleItem[] {
    return Array.from(this.rules.values()).map((r: DashboardAlarmRule) => ({
      id: r.id,
      dashboardId: r.dashboardId ?? 'preview-dashboard',
      dashboardTitle: r.dashboardTitle ?? 'Dashboard Vorschau',
      tileId: r.tileId,
      catalogId: r.catalogId,
      ruleConfig: r.ruleConfig,
      mindestdauerLaeufe: r.mindestdauerLaeufe ?? 2,
      abklingzeitSekunden: r.abklingzeitSekunden ?? 3600,
      status: r.status,
      responsibleUserId: r.responsibleUserId,
      responsibleEmail: r.responsibleEmail ?? 'kollege@firma.de',
      beobachteteStufe: r.beobachteteStufe ?? 'normal',
      bestaetigteStufe: r.bestaetigteStufe ?? 'normal',
      letzterMesswert: r.letzterMesswert ?? null,
      letzteAuswertung: r.letzteAuswertung ?? null,
      createdAt: r.createdAt ?? new Date().toISOString(),
      updatedAt: r.updatedAt ?? r.createdAt ?? new Date().toISOString(),
    }));
  }
}

export const inMemoryAlarmStore = new InMemoryAlarmStore();

export function shouldUseInMemoryStore(): boolean {
  if (!isSupabaseConfigured || !supabase) return true;
  if (typeof window !== 'undefined' && window.location.pathname.includes('vorschau')) return true;
  return false;
}
