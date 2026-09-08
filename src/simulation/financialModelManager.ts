import { FinancialMetrics } from '../types/financial';
import { SimulationDeal } from '../types/simulation';

export interface FinancialCalculationParams {
  salesRepCount: number;
  csRepCount: number;
  liveARR: number;
  deals: SimulationDeal[];
  newWonDealsThisTick: number;
  previousCumulativeCashFlow?: number;
  marketingBudgetYearly?: number;
}

/**
 * Functional, deterministic Financial Domain Model Manager (Auftrag 011).
 *
 * TECHNICAL IMPLEMENTATION ASSUMPTIONS:
 * - Sales Rep Cost: 8.000 € / month per FTE (~ 267 € / tick per FTE).
 * - CS Rep Cost: 6.500 € / month per FTE (~ 217 € / tick per FTE).
 * - Marketing Budget: 5.000 € / month (~ 167 € / tick) fixed lead generation spend.
 * - Other OPEX: 3.000 € / month (~ 100 € / tick) operational overhead.
 * - Variable Sales Cost: 500 € per newly acquired won deal (commissions & onboarding tooling).
 * - Scale: 1 tick = 1 daily period. Daily Gross Revenue = Math.round(liveARR / 365).
 * - Division-by-Zero Safety: CAC = newCustomers > 0 ? Math.round((variableSalesCost + marketingCost) / newCustomers) : 0.
 */
export class FinancialModelManager {
  public static readonly COST_PER_SALES_REP_PER_MONTH = 8000;
  public static readonly COST_PER_CS_REP_PER_MONTH = 6500;
  public static readonly MARKETING_COST_PER_MONTH = 5000;
  public static readonly OTHER_OPEX_PER_MONTH = 3000;
  public static readonly VARIABLE_SALES_COST_PER_DEAL = 500;

  /**
   * Calculate deterministic FinancialMetrics for a single simulation tick.
   */
  public static calculateFinancialMetrics(params: FinancialCalculationParams): FinancialMetrics {
    const {
      salesRepCount,
      csRepCount,
      liveARR,
      deals,
      newWonDealsThisTick,
      previousCumulativeCashFlow = 0,
      marketingBudgetYearly,
    } = params;

    // 1. Headcount Costs (per tick = 1 day, i.e. monthly / 30)
    const normalizedSalesRepCount = Math.max(0, Math.floor(salesRepCount));
    const normalizedCSRepCount = Math.max(0, Math.floor(csRepCount));

    const salesHeadcountCost = Math.round((normalizedSalesRepCount * this.COST_PER_SALES_REP_PER_MONTH) / 30);
    const csHeadcountCost = Math.round((normalizedCSRepCount * this.COST_PER_CS_REP_PER_MONTH) / 30);
    const totalHeadcountCost = salesHeadcountCost + csHeadcountCost;

    // 2. Revenue & Churn Loss (Daily scale)
    const grossRevenue = Math.round((liveARR || 0) / 365);

    // Calculate daily churn loss from churned deals
    const churnedDeals = deals.filter((d) => d.isChurned);
    const churnedARR = churnedDeals.reduce((sum, d) => sum + (d.arr || 0), 0);
    const churnLoss = Math.round(churnedARR / 365);

    // Net Revenue
    const netRevenue = Math.max(0, grossRevenue - churnLoss);

    // 3. Variable & Fixed OPEX
    const newCustomers = Math.max(0, newWonDealsThisTick);
    const variableSalesCost = newCustomers * this.VARIABLE_SALES_COST_PER_DEAL;
    const marketingCost =
      marketingBudgetYearly !== undefined && marketingBudgetYearly !== 65000
        ? Math.round(marketingBudgetYearly / 360)
        : Math.round(this.MARKETING_COST_PER_MONTH / 30);
    const otherOpex = Math.round(this.OTHER_OPEX_PER_MONTH / 30);

    const totalOpex = totalHeadcountCost + variableSalesCost + marketingCost + otherOpex;

    // 4. Gross Profit & Contribution Margin
    const grossProfit = netRevenue; // Software ~ 100% gross margin
    const contributionMargin = grossProfit - variableSalesCost;

    // 5. EBITDA & Operating Margin
    const ebitda = netRevenue - totalOpex;
    const operatingMargin = netRevenue > 0 ? parseFloat(((ebitda / netRevenue) * 100).toFixed(2)) : 0;

    // 6. Customer Acquisition Cost (CAC) with Division-by-Zero Safety
    const cac = newCustomers > 0 ? Math.round((variableSalesCost + marketingCost) / newCustomers) : 0;

    // 7. Operative Cash Flow
    const cashInflow = netRevenue;
    const cashOutflow = totalOpex;
    const netCashFlow = cashInflow - cashOutflow;
    const cumulativeCashFlow = previousCumulativeCashFlow + netCashFlow;

    return {
      grossRevenue,
      churnLoss,
      netRevenue,
      salesHeadcountCost,
      csHeadcountCost,
      totalHeadcountCost,
      variableSalesCost,
      marketingCost,
      otherOpex,
      totalOpex,
      grossProfit,
      contributionMargin,
      ebitda,
      operatingMargin,
      cac,
      newCustomers,
      cashInflow,
      cashOutflow,
      netCashFlow,
      cumulativeCashFlow,
    };
  }
}
