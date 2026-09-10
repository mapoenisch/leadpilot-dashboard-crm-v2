import { EXEC_KPIS_1, CHART_ARR, CHART_MRR } from './execData';
import { getOrganisationStructure, HR, TEAM, OrganisationUnit } from './organisationData';
import { ROADMAP, RoadmapRelease } from './produktData';
import { ImportedFunnelDeal } from '@/types/crm';

/**
 * Schmale Datenquelle für die Pipeline-Aggregation (Dependency Inversion:
 * domain importiert kein Repository; der Aufrufer reicht es herein).
 */
export interface FunnelDealSource {
  getImportedFunnelDeals(): Promise<ImportedFunnelDeal[]>;
}

export interface CockpitKpiItem {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  note: string;
  isNegativeAlert?: boolean;
}

export interface ArrTimeSeriesPoint {
  period: string;
  arr: number;
  label: string;
}

export interface MrrTierPoint {
  tier: string;
  mrr: number;
  sharePercent: number;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
  volume: number;
  sharePercent: number;
}

export interface PipelineOverview {
  totalDeals: number;
  totalVolume: number;
  wonVolume: number;
  openVolume: number;
  stages: PipelineStageSummary[];
}

/**
 * Parst einen formatierten Währungs-/Zahlen-String exakt in eine Zahl (ohne Schätzwerte).
 */
function parseExactNumber(str: string): number {
  const isNeg = str.includes('−') || str.includes('-');
  const digits = str.replace(/[^\d]/g, '');
  const num = parseInt(digits, 10);
  return isNeg ? -num : num;
}

/**
 * Leitet die 4 primären Executive-KPIs unverändert aus EXEC_KPIS_1 ab.
 * Keine Scheinwerte, keine Interpolation, exakte Übereinstimmung mit den Stammdaten.
 */
export function getExecutiveCockpitKpis(): CockpitKpiItem[] {
  const [arr, revenue, ebitda, customers] = EXEC_KPIS_1;

  // ARR YoY Wachstum mathematisch exakt aus CHART_ARR hergeleitet (Q4/24: 207.792 € ➔ Q4/25: 411.840 €)
  const q4_24 = CHART_ARR.datasets[0]?.data?.[3];
  const q4_25 = CHART_ARR.datasets[0]?.data?.[7];
  const arrDelta =
    typeof q4_24 === 'number' && typeof q4_25 === 'number' && q4_24 > 0
      ? `+${(((q4_25 - q4_24) / q4_24) * 100).toFixed(1).replace('.', ',')} % YoY`
      : undefined;

  return [
    {
      id: 'arr',
      label: arr.label,
      value: arr.value,
      rawValue: parseExactNumber(arr.value), // 411840
      delta: arrDelta,
      deltaType: 'positive',
      note: arr.note,
    },
    {
      id: 'revenue',
      label: revenue.label,
      value: revenue.value,
      rawValue: parseExactNumber(revenue.value), // 336000
      delta: undefined, // Kein erfundenes Delta
      deltaType: 'neutral',
      note: revenue.note,
    },
    {
      id: 'ebitda',
      label: ebitda.label,
      value: ebitda.value,
      rawValue: parseExactNumber(ebitda.value), // -309000
      delta: undefined, // Kein erfundenes Delta
      deltaType: 'negative',
      note: ebitda.note,
      isNegativeAlert: true, // Signalisiert Risiko/Warnung (Orange) für negatives EBITDA
    },
    {
      id: 'customers',
      label: customers.label,
      value: customers.value,
      rawValue: parseExactNumber(customers.value), // 66
      delta: undefined, // Kein erfundenes Delta
      deltaType: 'positive',
      note: customers.note,
    },
  ];
}

/**
 * Recharts-kompatible Datenpunkte für die ARR-Entwicklung aus CHART_ARR.
 * Keine künstlichen Ersatzwerte. Bei fehlerhaften Daten greift der Empty-State.
 */
export function getArrTrendData(): ArrTimeSeriesPoint[] {
  const dataset = CHART_ARR.datasets?.[0];
  if (!dataset || !Array.isArray(dataset.data) || dataset.data.length !== CHART_ARR.labels.length) {
    return [];
  }

  for (const val of dataset.data) {
    if (typeof val !== 'number' || isNaN(val)) {
      return []; // Ehrlicher Empty-State bei defekten Daten
    }
  }

  return CHART_ARR.labels.map((period, idx) => ({
    period,
    arr: dataset.data[idx],
    label: `${(dataset.data[idx] / 1000).toLocaleString('de-DE', { maximumFractionDigits: 0 })} k€`,
  }));
}

/**
 * Recharts-kompatible Datenpunkte für die MRR-Verteilung nach Paketen aus CHART_MRR.
 * Keine künstlichen Ersatzwerte. Bei fehlerhaften Daten greift der Empty-State.
 */
export function getMrrTierData(): MrrTierPoint[] {
  const dataset = CHART_MRR.datasets?.[0];
  if (!dataset || !Array.isArray(dataset.data) || dataset.data.length !== CHART_MRR.labels.length) {
    return [];
  }

  for (const val of dataset.data) {
    if (typeof val !== 'number' || isNaN(val)) {
      return [];
    }
  }

  const total = dataset.data.reduce((acc, v) => acc + v, 0);

  return CHART_MRR.labels.map((tier, idx) => {
    const mrr = dataset.data[idx];
    return {
      tier,
      mrr,
      sharePercent: total > 0 ? Math.round((mrr / total) * 100) : 0,
    };
  });
}

/**
 * Team- und HR-Snapshot aus organisationData.
 */
export function getTeamHrSnapshot(): {
  structure: {
    root: OrganisationUnit;
    units: OrganisationUnit[];
    total: OrganisationUnit;
  };
  metrics: typeof HR.metrics;
  bottlenecks: string[];
} {
  return {
    structure: getOrganisationStructure(),
    metrics: HR.metrics,
    bottlenecks: TEAM.bottlenecks,
  };
}

/**
 * Roadmap-Snapshot aus produktData.
 */
export function getRoadmapSnapshot(): {
  releases: RoadmapRelease[];
} {
  return {
    releases: ROADMAP.releases,
  };
}

/**
 * Aggregiert die Pipeline-Stages und Volumina direkt aus den realen Deals des CRMRepository.
 * Validiert Deals strikt ohne stille Fallbacks (keine künstlichen Ersatzwerte).
 * Wirft bei fehlerhaften Deal-Daten einen expliziten Fehler, der im UI als ehrlicher
 * Error-State visualisiert wird.
 */
export async function getPipelineOverview(source: FunnelDealSource): Promise<PipelineOverview> {
  const deals: ImportedFunnelDeal[] = await source.getImportedFunnelDeals();

  if (!Array.isArray(deals) || deals.length === 0) {
    return {
      totalDeals: 0,
      totalVolume: 0,
      wonVolume: 0,
      openVolume: 0,
      stages: [],
    };
  }

  let totalVolume = 0;
  let wonVolume = 0;
  let openVolume = 0;
  const stageMap = new Map<string, { count: number; volume: number }>();

  for (const deal of deals) {
    if (typeof deal.amount !== 'number' || isNaN(deal.amount) || deal.amount < 0) {
      throw new Error(`Ungültiger Betrag in CRM-Deal ${deal.id || 'ohne ID'}: ${deal.amount}`);
    }
    if (!deal.stage || typeof deal.stage !== 'string' || deal.stage.trim() === '') {
      throw new Error(`Fehlende Funnel-Stage in CRM-Deal ${deal.id || 'ohne ID'}`);
    }

    const amt = deal.amount;
    totalVolume += amt;
    const stage = deal.stage.trim();

    const cur = stageMap.get(stage) || { count: 0, volume: 0 };
    cur.count += 1;
    cur.volume += amt;
    stageMap.set(stage, cur);

    const lowerStage = stage.toLowerCase();
    if (lowerStage.includes('gewonnen')) {
      wonVolume += amt;
    } else if (!lowerStage.includes('verloren')) {
      openVolume += amt;
    }
  }

  const stages: PipelineStageSummary[] = Array.from(stageMap.entries()).map(([stage, stats]) => ({
    stage,
    count: stats.count,
    volume: stats.volume,
    sharePercent: totalVolume > 0 ? Math.round((stats.volume / totalVolume) * 100) : 0,
  }));

  // Sortierung: Größtes Volumen zuerst
  stages.sort((a, b) => b.volume - a.volume);

  return {
    totalDeals: deals.length,
    totalVolume,
    wonVolume,
    openVolume,
    stages,
  };
}
