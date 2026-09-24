import { KPIRegistry } from './kpiRegistry';
import {
  KeyDifferenceItem,
  KpiMatrixRow,
  ParameterMatrixRow,
  ScenarioError,
  ScenarioVersion,
  TradeOffDimension,
  TradeOffEvaluation,
} from '../types/scenario';

// 067K / G57 — aus scenarioService.ts herausgelöste Trade-off- und
// Root-Cause-Bausteine des Multi-Vergleichs (reine Code-Bewegung, keine
// Verhaltensänderung; Decisions 864–871).
export function evaluateTradeOffs(
  versions: ScenarioVersion[],
  kpiMatrix: KpiMatrixRow[],
): TradeOffEvaluation[] {
  // 4. Trade-Off Evaluations in 5 Dimensions (Decisions 864–868)
  const tradeOffDimensions: {
    dim: TradeOffDimension;
    label: string;
    desc: string;
    kpiId: string;
  }[] = [
    {
      dim: 'GROWTH',
      label: 'Wachstum (Growth)',
      desc: 'Umsatzskalierung gemessen an ARR und MRR-Zuwachs.',
      kpiId: 'liveARR',
    },
    {
      dim: 'PROFITABILITY',
      label: 'Profitabilität (Profitability)',
      desc: 'Ertragskraft nach Abzug aller Vertriebs-, Personal- und Betriebskosten (EBITDA).',
      kpiId: 'ebitda',
    },
    {
      dim: 'LIQUIDITY',
      label: 'Liquidität (Liquidity)',
      desc: 'Operativer Netto-Cashflow und Kapitalerhalt im Simulationsverlauf.',
      kpiId: 'netCashFlow',
    },
    {
      dim: 'ACQUISITION',
      label: 'Neukundengewinnung (Acquisition)',
      desc: 'Effizienz der Lead-Generierung und Kundenakquisitionskosten (CAC).',
      kpiId: 'cac',
    },
    {
      dim: 'RETENTION',
      label: 'Kundenbindung & Churn (Retention)',
      desc: 'Bestandskundensicherung und Minimierung von Kündigungsverlusten.',
      kpiId: 'liveCustomers',
    },
  ];

  const tradeOffs: TradeOffEvaluation[] = tradeOffDimensions.map((dimObj) => {
    const kRow = kpiMatrix.find((r) => r.kpiId === dimObj.kpiId)!;
    const kInfo = KPIRegistry.getKPI(dimObj.kpiId);

    // Determine best version for this dimension
    const firstVersion = versions[0];
    if (!firstVersion) {
      // Unerreichbar: versionIds enthält per Guard oben 2–4 Einträge.
      throw new ScenarioError('INVALID_VERSION', 'Keine Versionen zum Vergleich.');
    }
    let bestVerId = firstVersion.id;
    let bestVal = valuesByVersionIdBest(kRow, firstVersion.id, kInfo.direction);

    for (const v of versions) {
      const val = valuesByVersionIdBest(kRow, v.id, kInfo.direction);
      if (kInfo.direction === 'HIGHER_IS_BETTER') {
        if (val > bestVal) {
          bestVal = val;
          bestVerId = v.id;
        }
      } else {
        if (val < bestVal) {
          bestVal = val;
          bestVerId = v.id;
        }
      }
    }

    const evaluations: Record<
      string,
      {
        versionId: string;
        versionName: string;
        isLeader: boolean;
        metricHighlight: string;
        pros: string[];
        cons: string[];
      }
    > = {};
    for (const v of versions) {
      const valObj = kRow.valuesByVersionId[v.id];
      const isLeader = v.id === bestVerId;
      const pros: string[] = [];
      const cons: string[] = [];

      if (isLeader) {
        pros.push(
          `Führend in ${dimObj.label} mit ${valObj?.median.toLocaleString('de-DE') ?? '–'} ${kRow.unit}.`,
        );
      } else {
        cons.push(
          `Liegt hinter Spitzenreiter zurück (${valObj?.median.toLocaleString('de-DE') ?? '–'} ${kRow.unit}).`,
        );
      }

      evaluations[v.id] = {
        versionId: v.id,
        versionName: `v${v.versionNumber}`,
        isLeader,
        metricHighlight: valObj
          ? `${valObj.median.toLocaleString('de-DE')} ${kRow.unit}`
          : 'Keine Runs',
        pros,
        cons,
      };
    }

    return {
      dimension: dimObj.dim,
      label: dimObj.label,
      description: dimObj.desc,
      primaryKpiId: dimObj.kpiId,
      bestVersionId: bestVerId,
      evaluations,
      tradeOffSummary: `Spitzenreiter in ${dimObj.label}: v${versions.find((v) => v.id === bestVerId)?.versionNumber ?? ''} (${evaluations[bestVerId]?.metricHighlight}).`,
    };
  });

  return tradeOffs;
}

function valuesByVersionIdBest(
  row: KpiMatrixRow,
  vId: string,
  dir: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER',
): number {
  const obj = row.valuesByVersionId[vId];
  if (!obj) return dir === 'HIGHER_IS_BETTER' ? -Infinity : Infinity;
  return obj.median;
}

// 5. Root-Cause Key Differences Identification (Decisions 869–871)
export function identifyKeyDifferences(
  versions: ScenarioVersion[],
  parameterMatrix: ParameterMatrixRow[],
): KeyDifferenceItem[] {
  const keyDifferences: KeyDifferenceItem[] = [];

  for (const pRow of parameterMatrix) {
    const changedVersions = versions.filter((v) => pRow.hasChangedAgainstRef[v.id]);
    if (changedVersions.length > 0) {
      let affectedKpi = 'liveARR';
      let affectedLabel = 'ARR';
      let dim: TradeOffDimension = 'GROWTH';
      let explanation = '';

      if (pRow.key === 'salesRepCount') {
        affectedKpi = 'liveARR';
        affectedLabel = 'ARR & Personalaufwand';
        dim = 'GROWTH';
        explanation =
          'Veränderung der Sales-FTE-Kapazität skaliert den Deal-Durchsatz, erhöht jedoch die fixen Headcount-Kosten (8.000 €/Monat je FTE).';
      } else if (pRow.key === 'marketingBudgetYearly') {
        affectedKpi = 'cac';
        affectedLabel = 'CAC & Lead-Inflow';
        dim = 'ACQUISITION';
        explanation =
          'Veränderung des Marketingbudgets verschiebt die Lead-Akquisitionsrate entlang der Sättigungskurve und beeinflusst die Marketing-OPEX.';
      } else if (pRow.key === 'trialToPaidConversion') {
        affectedKpi = 'liveWonDeals';
        affectedLabel = 'Abschlüsse & Konvertierung';
        dim = 'GROWTH';
        explanation =
          'Höhere Conversion-Rate steigert die Win-Wahrscheinlichkeit von Hot Deals direkt ohne zusätzliche Fixkosten.';
      } else if (pRow.key === 'churnRateMonthly' || pRow.key === 'csRepCount') {
        affectedKpi = 'liveCustomers';
        affectedLabel = 'Kundenbestand & Churn Loss';
        dim = 'RETENTION';
        explanation =
          'Beeinflusst die Kündigungsdynamik und den Erhalt des bestehenden Kundenstamms.';
      } else if (pRow.key === 'discountPercent') {
        affectedKpi = 'ebitda';
        affectedLabel = 'Deckungsbeitrag & ARR';
        dim = 'PROFITABILITY';
        explanation =
          'Rabattierung mindert den durchschnittlichen Vertragswert und schmälert die operative Marge.';
      } else {
        affectedKpi = 'liveARR';
        affectedLabel = 'ARR';
        dim = 'GROWTH';
        explanation = `Parameter-Divergenz in ${pRow.label}.`;
      }

      keyDifferences.push({
        id: `diff-${pRow.key}`,
        parameterKey: pRow.key,
        parameterLabel: pRow.label,
        affectedKpiId: affectedKpi,
        affectedKpiLabel: affectedLabel,
        dimension: dim,
        explanation,
        divergenceLevel: changedVersions.length >= 2 ? 'HIGH' : 'MEDIUM',
        causeClarity: 'CLEAR',
      });
    }
  }

  return keyDifferences;
}
