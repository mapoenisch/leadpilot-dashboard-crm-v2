// Executive Dashboard, Teilauftrag 1 (Auftrag 070): Kandidaten, die (noch) nicht aktiv sind.
// „aufbereiten“: fachlich geeignet, braucht strukturierte Werte, Fachseite oder Freigabe.
// „nicht_geeignet“ steht in unsuitableEntries.ts.
// Simulations-KPIs sind ausgeschlossen (Plan §1) und stehen deshalb hier nicht.
import type { CatalogSource, DashboardCategory, InventoryCatalogEntry } from '../dashboardCatalog';
import { BASELINE_ACCESS, LIVE_ACCESS, LIVE_METADATA, LIVE_SOURCE } from './activeEntries';

const D = (file: string) => `src/domain/${file}.ts`;
const TA8 = 'Teilauftrag 8';

/** Messwertquelle der Live-Kombinationen: der Store; Definitionen liefern nur Metadaten. */
const LIVE_STORE = { ...LIVE_SOURCE, metadata: LIVE_METADATA };
const ARR_MIX_IDS = ['arr_direct', 'arr_partner', 'arr_outbound', 'arr_other'];
const FUNNEL_IDS = ['leads', 'mql', 'sql', 'offers', 'won'].map((id) => `pipeline_${id}`);
const LIVE_ALL_IDS = ['arr', 'mrr', 'pipeline_coverage', ...ARR_MIX_IDS, ...FUNNEL_IDS];

export const entry = (
  id: string,
  name: string,
  category: DashboardCategory,
  source: CatalogSource,
  status: InventoryCatalogEntry['status'],
  reason: string,
  target?: string,
): InventoryCatalogEntry => ({
  id,
  name,
  category,
  kind: id.startsWith('uebersicht.') ? 'uebersicht' : 'kpi',
  source,
  status,
  reason,
  ...(target ? { target } : {}),
});

export const base = (
  file: string,
  exportName: string,
  path?: (string | number)[],
): CatalogSource => ({
  layer: 'baseline',
  module: D(file),
  exportName,
  ...(path ? { path } : {}),
});

/** Kandidaten „aufbereiten“ ohne Metadaten; ergänzt unten aus PREPARE_META. */
const PREPARE_BASE: InventoryCatalogEntry[] = [
  entry(
    'baseline.erloesmix',
    'Erlösmix 2025',
    'finanzen',
    base('finanzenData', 'CHART_ERLOESE', ['datasets', 0, 'data']),
    'aufbereiten',
    'Geeignete Aufteilung: Summe 336.000 € entspricht den Umsatzerlösen 2025. Fachseite s-guv.',
    TA8,
  ),
  entry(
    'baseline.kostenstruktur',
    'Kostenstruktur 2025',
    'finanzen',
    base('finanzenData', 'BUDGET', ['allocations']),
    'aufbereiten',
    'Anteile ergeben 100 %, Beträge 645.000 € entsprechen den GuV-Aufwendungen 2025; Werte nur als Text („490.000 €“). Fachseite s-unit.',
    TA8,
  ),
  entry(
    'baseline.guv',
    'GuV-Positionen',
    'finanzen',
    base('finanzenData', 'GUV', ['rows']),
    'aufbereiten',
    'FY 2024, FY 2025 und Plan 2026 in einer Tabelle; Plan- und Istwerte müssen getrennt gekennzeichnet werden, Werte nur als Text.',
    TA8,
  ),
  entry(
    'baseline.kosten_vergleich',
    'Kosten 2024 und 2025',
    'finanzen',
    base('finanzenData', 'CHART_KOSTEN'),
    'aufbereiten',
    'Vorzeichen uneinheitlich (Kosten positiv, EBITDA negativ, in der GuV alle Kosten negativ); vor der Darstellung normalisieren, negative Werte nie als Kreis.',
    TA8,
  ),
  entry(
    'baseline.unit_economics',
    'Unit Economics',
    'finanzen',
    base('finanzenData', 'UNIT', ['metrics']),
    'aufbereiten',
    'LTV, LTV/CAC, CAC-Payback, Deckungsbeitrag, Bruttomarge, NRR und GRR nur als Text mit Zusätzen („2,7 : 1 (Ziel …)“); strukturierte Einzelwerte nötig. Fachseite s-unit.',
    TA8,
  ),
  entry(
    'baseline.bilanz',
    'Bilanzpositionen',
    'finanzen',
    base('finanzenData', 'BILANZ'),
    'aufbereiten',
    'Stichtagswerte nur als Text-Tabelle ohne Datum im Datensatz; einzelne Posten (z. B. Kassenbestand) erst mit Fachfreigabe. Fachseite s-bilanz.',
    TA8,
  ),
  entry(
    'baseline.arr_nach_segment',
    'ARR nach Segment',
    'kunden',
    base('kundenData', 'CHART_SEGMENT', ['datasets', 0, 'data']),
    'aufbereiten',
    'Geeignete Aufteilung: Summe 411.840 € entspricht dem ARR. Fachseite s-segmente.',
    TA8,
  ),
  entry(
    'baseline.kunden_nach_region',
    'Kunden nach Region',
    'kunden',
    base('kundenData', 'REGIONEN', ['distribution']),
    'aufbereiten',
    'Geeignete Aufteilung: 61 + 3 + 2 = 66 Kunden. Fachseite s-segmente.',
    TA8,
  ),
  entry(
    'baseline.kunden_nach_branche',
    'Kunden nach Branche',
    'kunden',
    base('kundenData', 'SEGMENTE', ['rows']),
    'aufbereiten',
    'Kundenzahlen stehen nur im Text („24 Kunden · …“), die Prozentwerte ergeben 99 %; strukturierte Zählung nötig. Fachseite s-segmente.',
    TA8,
  ),
  entry(
    'baseline.top_kunden',
    'Top-Referenzkunden',
    'kunden',
    base('kundenData', 'TOP10', ['rows']),
    'aufbereiten',
    'Zehn Referenzkunden mit ARR nur als Text; als Übersichtstabelle aufbereiten. Fachseite s-top10.',
    TA8,
  ),
  entry(
    'baseline.customer_success',
    'Customer Success',
    'kunden',
    base('kundenData', 'CS', ['kpis']),
    'aufbereiten',
    'NRR, GRR, Account-Churn, NPS und Time-to-Value nur als Text; die Seite Customer Success ist nicht geroutet, ein Fachseitenziel fehlt.',
  ),
  entry(
    'baseline.funnel_2025',
    'Funnel 2025 je Quartal',
    'vertrieb_crm',
    base('vertriebData', 'FUNNEL', ['chart']),
    'aufbereiten',
    'Leads, MQL, SQL und Neukunden je Quartal 2025, Summen stimmen mit der FY-Spalte überein; Funnel-Stufen, daher nie Kreis. Fachseite s-funnel.',
    TA8,
  ),
  entry(
    'baseline.neukunden_quartal',
    'Neukunden und Vertriebskosten je Quartal',
    'vertrieb_crm',
    base('execData', 'CHART_QUARTAL'),
    'aufbereiten',
    'Zwei Einheiten (Anzahl und T€) in einem Datensatz, auf keiner Fachseite verwendet; Neukunden je Quartal stehen gleichwertig in FUNNEL.',
    TA8,
  ),
  entry(
    'baseline.kanal_mix',
    'Neukunden nach Kanal',
    'marketing',
    base('vertriebData', 'KANAELE', ['chartKanal']),
    'aufbereiten',
    'Anteile je Kanal ergeben 100 % (gerundet aus 47 Neukunden). Fachseite s-kanaele.',
    TA8,
  ),
  entry(
    'baseline.kanal_cac',
    'Marketing-CAC nach Kanal',
    'marketing',
    base('vertriebData', 'KANAELE', ['chartRoi']),
    'aufbereiten',
    'Verhältnis je Kategorie (Spend ÷ Neukunden je Kanal); Darstellung als Kategorienvergleich. Fachseite s-kanaele.',
    TA8,
  ),
  entry(
    'baseline.marketing_budget',
    'Marketingbudget 2025',
    'marketing',
    base('vertriebData', 'MBUDGET', ['chartSpend']),
    'aufbereiten',
    'Budget und Ist-Spend je Kanal; die Seite Marketingbudget ist nicht geroutet, ein Fachseitenziel fehlt.',
  ),
  entry(
    'baseline.reichweite',
    'Digitale Reichweite',
    'marketing',
    base('vertriebData', 'BRAND', ['chart']),
    'aufbereiten',
    'Website-Besucher, LinkedIn-Follower und Newsletter je Quartal in drei Einheiten; die Seite Brand ist nicht geroutet, ein Fachseitenziel fehlt.',
  ),
  entry(
    'baseline.headcount_verlauf',
    'Headcount-Verlauf',
    'organisation',
    base('organisationData', 'HEADCOUNT', ['chart', 'datasets', 0, 'data']),
    'aufbereiten',
    'Geeignete Zeitreihe: FTE je Quartal 2024 bis 2025. Fachseite s-headcount.',
    TA8,
  ),
  entry(
    'baseline.hr_kennzahlen',
    'HR-Kennzahlen',
    'organisation',
    base('organisationData', 'HR', ['metrics']),
    'aufbereiten',
    'Fluktuation, Personalaufwand und Remote-Anteil nur als Text mit Zusätzen; strukturierte Werte nötig. Fachseite s-hr.',
    TA8,
  ),
  entry(
    'baseline.produkt_nutzung',
    'Aktivierung und KI-Scoring-Nutzung',
    'produkt',
    base('produktData', 'CHART_PRODUKT'),
    'aufbereiten',
    'Zwei Prozent-Zeitreihen je Quartal 2025, im Plan für Teilauftrag 8 vorgemerkt. Fachseite s-perf.',
    TA8,
  ),
  entry(
    'baseline.kuendigungsgruende',
    'Kündigungsgründe',
    'produkt',
    base('produktData', 'CHART_CHURN', ['datasets', 0, 'data']),
    'aufbereiten',
    'Aufteilung 8 + 5 + 2 + 2 = 17 Accounts; der Zeitraum der Zählung steht nicht in der Quelle und muss vor der Aufnahme belegt werden. Fachseite s-perf.',
    TA8,
  ),
  entry(
    'baseline.produkt_qualitaet',
    'Produktqualität',
    'produkt',
    base('produktData', 'PERF', ['metrics']),
    'aufbereiten',
    'Uptime, Aktivierung, WAU/MAU und weitere nur als Text mit Zielzusatz; strukturierte Werte nötig. Fachseite s-perf.',
    TA8,
  ),
  entry(
    'baseline.marktanteile',
    'Marktanteile Europa/DACH',
    'markt',
    base('marktData', 'CHART_WETTBEWERB', ['datasets', 0, 'data']),
    'aufbereiten',
    'Anteile ergeben 74,4 % (keine Gesamtheit, daher nie Kreis); LeadPilot „< 0,1 %“ ist als 0,1 gespeichert und damit eine Obergrenze. Fachseite s-wettbewerb.',
    TA8,
  ),
  entry(
    'baseline.gesellschafter',
    'Gesellschafter',
    'recht',
    base('rechtData', 'GESELLSCHAFTER', ['rows']),
    'aufbereiten',
    'Stimmrechtsanteile; die Summenzeile „Gesamt“ wird ausgeschlossen, die fünf Anteile ergeben exakt 100 % (Test). Fachseite s-gesellschafter.',
    TA8,
  ),
  entry(
    'uebersicht.meilensteine',
    'Meilensteine',
    'unternehmen',
    base('unternehmenData', 'HISTORIE', ['events']),
    'aufbereiten',
    'Meilensteinübersicht von der Gründung bis zum GJ 2025; als Übersichtskachel geeignet. Fachseite s-historie.',
    TA8,
  ),
  entry(
    'live.arr_mix',
    'Live-ARR-Mix',
    'live',
    { ...LIVE_STORE, liveKpiIds: ARR_MIX_IDS },
    'aufbereiten',
    'Aufteilung aus vier Live-Werten; ein gemeinsamer bestätigter Snapshot ist nicht belegt (Plan §4, Kombinationen). Die Einzelwerte sind aktiv.',
  ),
  entry(
    'live.funnel',
    'Live-Funnel',
    'live',
    { ...LIVE_STORE, liveKpiIds: FUNNEL_IDS },
    'aufbereiten',
    'Funnel aus fünf Live-Werten; derselbe Snapshot ist nicht belegt; Funnel-Stufen nie Kreis. Die Einzelwerte sind aktiv.',
  ),
  entry(
    'live.verlauf',
    'Live-Verlauf',
    'live',
    {
      ...LIVE_STORE,
      liveKpiIds: LIVE_ALL_IDS,
      processing: {
        module: 'src/services/liveKpi/liveKpiStreamHistory.ts',
        exportName: 'mergeIntoHistory',
      },
    },
    'aufbereiten',
    'Sitzungshistorie seit Seitenaufruf ist keine vollständige Zeitreihe (Plan §4); Verlaufsdarstellung erst mit Teilauftrag 2.',
  ),
];

type PrepareMeta = Pick<InventoryCatalogEntry, 'unit' | 'timeBasis' | 'detailRouteId'>;
const FY = 'Geschäftsjahr 2025';
const Q25 = 'Quartale 2025';

/** Belegte Angaben je Kandidat; fehlende Zeitbasis oder Fachseite begründet `reason`. */
const PREPARE_META: Record<string, PrepareMeta> = {
  'baseline.erloesmix': { unit: 'EUR', timeBasis: FY, detailRouteId: 's-guv' },
  'baseline.kostenstruktur': { unit: 'EUR', timeBasis: FY, detailRouteId: 's-unit' },
  'baseline.guv': {
    unit: 'EUR',
    timeBasis: 'FY 2024 und FY 2025 (Ist), Plan 2026',
    detailRouteId: 's-guv',
  },
  'baseline.kosten_vergleich': {
    unit: 'T€',
    timeBasis: 'FY 2024 und FY 2025',
    detailRouteId: 's-guv',
  },
  'baseline.unit_economics': {
    unit: 'gemischt (EUR, Monate, Prozent, Verhältnis)',
    timeBasis: FY,
    detailRouteId: 's-unit',
  },
  'baseline.bilanz': { unit: 'EUR', detailRouteId: 's-bilanz' },
  'baseline.arr_nach_segment': {
    unit: 'EUR',
    timeBasis: 'Stand 31.12.2025 (Summe = ARR zum Stichtag)',
    detailRouteId: 's-segmente',
  },
  'baseline.kunden_nach_region': {
    unit: 'Kunden',
    timeBasis: 'Stand 31.12.2025',
    detailRouteId: 's-segmente',
  },
  'baseline.kunden_nach_branche': {
    unit: 'Kunden',
    timeBasis: 'Stand 31.12.2025',
    detailRouteId: 's-segmente',
  },
  'baseline.top_kunden': { unit: 'EUR (ARR je Kunde)', detailRouteId: 's-top10' },
  'baseline.customer_success': { unit: 'gemischt (Prozent, Punkte, Tage)', timeBasis: FY },
  'baseline.funnel_2025': { unit: 'Anzahl', timeBasis: Q25, detailRouteId: 's-funnel' },
  'baseline.neukunden_quartal': { unit: 'Anzahl und T€', timeBasis: Q25 },
  'baseline.kanal_mix': { unit: 'Prozent', timeBasis: FY, detailRouteId: 's-kanaele' },
  'baseline.kanal_cac': { unit: 'EUR je Neukunde', timeBasis: FY, detailRouteId: 's-kanaele' },
  'baseline.marketing_budget': { unit: 'EUR', timeBasis: FY },
  'baseline.reichweite': {
    unit: 'gemischt (Besucher je Monat, Follower, Abonnenten)',
    timeBasis: Q25,
  },
  'baseline.headcount_verlauf': {
    unit: 'FTE',
    timeBasis: 'Quartalsende Q1 2024 bis Q4 2025',
    detailRouteId: 's-headcount',
  },
  'baseline.hr_kennzahlen': {
    unit: 'gemischt (Prozent, EUR, FTE)',
    timeBasis: FY,
    detailRouteId: 's-hr',
  },
  'baseline.produkt_nutzung': { unit: 'Prozent', timeBasis: Q25, detailRouteId: 's-perf' },
  'baseline.kuendigungsgruende': { unit: 'Accounts', detailRouteId: 's-perf' },
  'baseline.produkt_qualitaet': {
    unit: 'gemischt (Prozent, Minuten, Tickets)',
    timeBasis: FY,
    detailRouteId: 's-perf',
  },
  'baseline.marktanteile': { unit: 'Prozent', detailRouteId: 's-wettbewerb' },
  'baseline.gesellschafter': {
    unit: 'Prozent',
    timeBasis: 'Stand nach Kapitalerhöhung Q1 2024',
    detailRouteId: 's-gesellschafter',
  },
  'uebersicht.meilensteine': {
    unit: 'Ereignisse',
    timeBasis: '21.07.2022 bis Dez 2025',
    detailRouteId: 's-historie',
  },
  'live.arr_mix': {
    unit: 'EUR',
    timeBasis: 'Live, Werte mit eigenem Zeitstempel',
    detailRouteId: 's-exec',
  },
  'live.funnel': {
    unit: 'Anzahl',
    timeBasis: 'Live, Werte mit eigenem Zeitstempel',
    detailRouteId: 's-exec',
  },
  'live.verlauf': {
    unit: 'je KPI',
    timeBasis: 'bis 30 Feed-Punkte der letzten 30 Minuten, danach Sitzungshistorie',
    detailRouteId: 's-exec',
  },
};

/** Fachlich geeignet, aber noch nicht aktiv; mit den belegten Metadaten. */
export const PREPARE_CATALOG_ENTRIES: readonly InventoryCatalogEntry[] = PREPARE_BASE.map(
  (item) => ({
    ...item,
    ...PREPARE_META[item.id],
    access: item.source.layer === 'live' ? LIVE_ACCESS : BASELINE_ACCESS,
  }),
);
