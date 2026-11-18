import type { AlarmCapability } from '../alarmCapability';

export const ALARM_ENTRIES: Readonly<Record<string, AlarmCapability>> = {
  // Baseline Einzelwerte (ausgeschlossen: Feste Referenzwerte ändern sich nicht)
  'baseline.arr': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.umsatz': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.ebitda': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.kunden_aktiv': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.arpa': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.marketing_cac': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.fully_loaded_cac': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },
  'baseline.headcount': {
    status: 'ausgeschlossen',
    grund: 'Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.',
  },

  // Kombinationen basierend auf Baseline (ausgeschlossen: Bestandteil baseline.* ist fest)
  'kombination.ebitda_marge': {
    status: 'ausgeschlossen',
    grund:
      'Basiert auf baseline.ebitda und baseline.umsatz; feste Referenzwerte ändern sich nicht.',
  },
  'kombination.cac_aufschlag': {
    status: 'ausgeschlossen',
    grund:
      'Basiert auf baseline.marketing_cac und baseline.fully_loaded_cac; feste Referenzwerte ändern sich nicht.',
  },
  'kombination.mrr_anteil_starter': {
    status: 'ausgeschlossen',
    grund: 'Basiert auf baseline.mrr_paketmix; feste Referenzwerte ändern sich nicht.',
  },
  'kombination.mrr_anteil_growth': {
    status: 'ausgeschlossen',
    grund: 'Basiert auf baseline.mrr_paketmix; feste Referenzwerte ändern sich nicht.',
  },
  'kombination.mrr_anteil_pro': {
    status: 'ausgeschlossen',
    grund: 'Basiert auf baseline.mrr_paketmix; feste Referenzwerte ändern sich nicht.',
  },

  // CRM Einzelwerte (pruefbar: Serveraggregiert über dashboard_crm_pipeline_overview)
  'crm.pipeline_deals': {
    status: 'pruefbar',
    grund: 'Serveraggregierte CRM-Pipeline-Kennzahl über RPC dashboard_crm_pipeline_overview.',
    serverquelle: 'RPC public.dashboard_crm_pipeline_overview',
  },
  'crm.pipeline_volumen': {
    status: 'pruefbar',
    grund: 'Serveraggregierte CRM-Pipeline-Kennzahl über RPC dashboard_crm_pipeline_overview.',
    serverquelle: 'RPC public.dashboard_crm_pipeline_overview',
  },
  'crm.pipeline_gewonnen': {
    status: 'pruefbar',
    grund: 'Serveraggregierte CRM-Pipeline-Kennzahl über RPC dashboard_crm_pipeline_overview.',
    serverquelle: 'RPC public.dashboard_crm_pipeline_overview',
  },
  'crm.pipeline_offen': {
    status: 'pruefbar',
    grund: 'Serveraggregierte CRM-Pipeline-Kennzahl über RPC dashboard_crm_pipeline_overview.',
    serverquelle: 'RPC public.dashboard_crm_pipeline_overview',
  },

  // Live Einzelwerte (pruefbar: Mandantengebundener Live-KPI-Feed aus live_kpi_events)
  'live.arr': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.mrr': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.pipeline_coverage': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.arr_direct': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.arr_partner': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.arr_outbound': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.arr_other': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.pipeline_leads': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.pipeline_mql': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.pipeline_sql': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.pipeline_offers': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },
  'live.pipeline_won': {
    status: 'pruefbar',
    grund: 'Mandantengebundener Live-KPI-Feed aus live_kpi_events.',
    serverquelle: 'Tabelle public.live_kpi_events',
  },

  // Nicht-Einzelwerte: Zeitreihen
  'baseline.arr_verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'crm.phaseneintritte_verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'crm.gewonnen_verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.arr.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.mrr.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.pipeline_coverage.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.arr_direct.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.arr_partner.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.arr_outbound.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.arr_other.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.pipeline_leads.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.pipeline_mql.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.pipeline_sql.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.pipeline_offers.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'live.pipeline_won.verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'baseline.leads_quartal': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'baseline.neukunden_quartal': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'baseline.headcount_verlauf': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'baseline.aktivierungsrate': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },
  'baseline.ki_scoring_nutzung': {
    status: 'nicht_einzelwert',
    grund: 'Zeitreihen können keine einfachen Einzelwert-Schwellenwerte auswerten.',
  },

  // Nicht-Einzelwerte: Anteile und Verteilungen
  'baseline.mrr_paketmix': {
    status: 'nicht_einzelwert',
    grund: 'Verteilungen über mehrere Anteile liefern keinen Einzelwert.',
  },
  'baseline.erloesmix': {
    status: 'nicht_einzelwert',
    grund: 'Verteilungen über mehrere Anteile liefern keinen Einzelwert.',
  },
  'baseline.arr_nach_segment': {
    status: 'nicht_einzelwert',
    grund: 'Verteilungen über mehrere Anteile liefern keinen Einzelwert.',
  },
  'baseline.kunden_nach_region': {
    status: 'nicht_einzelwert',
    grund: 'Verteilungen über mehrere Anteile liefern keinen Einzelwert.',
  },
  'baseline.kanal_mix': {
    status: 'nicht_einzelwert',
    grund: 'Verteilungen über mehrere Anteile liefern keinen Einzelwert.',
  },
  'baseline.gesellschafter': {
    status: 'nicht_einzelwert',
    grund: 'Verteilungen über mehrere Anteile liefern keinen Einzelwert.',
  },

  // Nicht-Einzelwerte: Kategorien
  'crm.pipeline_stufen_volumen': {
    status: 'nicht_einzelwert',
    grund: 'Mehrdimensionale Kategorien liefern keinen Einzelwert.',
  },
  'crm.pipeline_stufen_anzahl': {
    status: 'nicht_einzelwert',
    grund: 'Mehrdimensionale Kategorien liefern keinen Einzelwert.',
  },
  'baseline.kanal_cac': {
    status: 'nicht_einzelwert',
    grund: 'Mehrdimensionale Kategorien liefern keinen Einzelwert.',
  },

  // Nicht-Einzelwerte: Übersichten
  'uebersicht.team_hr': {
    status: 'nicht_einzelwert',
    grund: 'Übersichtskacheln liefern keinen Einzelwert.',
  },
  'uebersicht.roadmap': {
    status: 'nicht_einzelwert',
    grund: 'Übersichtskacheln liefern keinen Einzelwert.',
  },
  'uebersicht.live_aktivitaet': {
    status: 'nicht_einzelwert',
    grund: 'Übersichtskacheln liefern keinen Einzelwert.',
  },
  'uebersicht.meilensteine': {
    status: 'nicht_einzelwert',
    grund: 'Übersichtskacheln liefern keinen Einzelwert.',
  },
};
