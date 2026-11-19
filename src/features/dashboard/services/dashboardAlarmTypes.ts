// Executive Dashboard V2 (Auftrag 168 / P13c):
// Typdefinitionen für Dashboard-Server-Alarme, Quittierungen, Lesebestätigungen und Admin-Übernahme.

export interface DashboardAlarmRule {
  id: string;
  tileId: string;
  catalogId: string;
  pipeline?: string | null;
  ruleConfig: Record<string, unknown>;
  mindestdauerLaeufe: number;
  abklingzeitSekunden: number;
  status:
    'aktiv' | 'pausiert' | 'regel_ungueltig' | 'verantwortlicher_ohne_rechte' | 'kachel_entfernt';
  beobachteteStufe?: string | null;
  bestaetigteStufe?: string | null;
  letzterMesswert?: number | null;
  letzteAuswertung?: string | null;
  letztesEreignisAm?: string | null;
  responsibleUserId: string;
  responsibleEmail?: string;
  dashboardId?: string;
  dashboardTitle?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardAlarmReceipt {
  userId: string;
  email: string;
  quittiertAt: string;
  kommentar: string | null;
}

export interface DashboardAlarmEventItem {
  id: string;
  ruleId: string;
  dashboardId: string;
  dashboardTitle: string;
  tileId: string;
  catalogId: string;
  alterZustand: string;
  neuerZustand: string;
  messwert: number | null;
  einheit: string | null;
  grenze: number | null;
  meldung: string;
  createdAt: string;
  gelesen: boolean;
  quittiertVon: DashboardAlarmReceipt[];
}

export interface OrganizationAlarmRuleItem {
  id: string;
  dashboardId: string;
  dashboardTitle: string;
  tileId: string;
  catalogId: string;
  ruleConfig: Record<string, unknown>;
  mindestdauerLaeufe: number;
  abklingzeitSekunden: number;
  status: string;
  responsibleUserId: string;
  responsibleEmail: string;
  beobachteteStufe: string | null;
  bestaetigteStufe: string | null;
  letzterMesswert: number | null;
  letzteAuswertung: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmWorkerStatus {
  status: 'ok' | 'ueberfaellig' | 'pausiert';
  letzterLauf: string | null;
  minutenSeitLetztemLauf: number | null;
  auswertungAktiv: boolean;
  ueberfaellig: boolean;
}

export interface CreateAlarmRuleParams {
  dashboardId: string;
  tileId: string;
  catalogId: string;
  pipeline?: string | null;
  ruleConfig: Record<string, unknown>;
  mindestdauerLaeufe?: number;
  abklingzeitSekunden?: number;
}

export interface UpdateAlarmRuleParams {
  ruleId: string;
  ruleConfig: Record<string, unknown>;
  mindestdauerLaeufe?: number;
  abklingzeitSekunden?: number;
}

export interface ListAlarmEventsParams {
  dashboardId?: string;
  nurUngelesen?: boolean;
  nurWarnungKritisch?: boolean;
  limit?: number;
  offset?: number;
}

export interface AcknowledgeAlarmEventParams {
  eventId: string;
  comment?: string | null;
}
