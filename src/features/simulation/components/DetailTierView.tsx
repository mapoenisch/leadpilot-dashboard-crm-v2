import React from 'react';
import { useActiveVersion, useAggregation, useSimulationEvents, useSimulationState } from '../../../store/hooks';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { KpiTimeSeriesDetailView } from './KpiTimeSeriesDetailView';

export const DetailTierView: React.FC = () => {
  const activeVersion = useActiveVersion();
  const aggregation = useAggregation();
  const events = useSimulationEvents();
  const state = useSimulationState();
  const params = activeVersion?.parameters;

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* 1. Core KPI Time Series, Uncertainty Corridor & Distribution Explorer (Auftrag 018) */}
      <KpiTimeSeriesDetailView />


      {/* Section 1: Active V1 Growth Driver Parameters */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Aktive V1-Wachstumstreiber (Parameter Registry)
        </h4>
        {params ? (
          <div className="flex flex-col gap-[10px] text-[13px]">
            <div className="border-0 border-b border-solid border-border-soft flex justify-between pb-[6px]">
              <span className="text-[var(--color-text-muted)]">Marketing-Budget:</span>
              <span className="font-semibold text-text">{params.marketingBudgetYearly.toLocaleString('de-DE')} €/Jahr</span>
            </div>
            <div className="border-0 border-b border-solid border-border-soft flex justify-between pb-[6px]">
              <span className="text-[var(--color-text-muted)]">Trial-to-Paid Conversion:</span>
              <span className="font-semibold text-primary">{params.trialToPaidConversion} %</span>
            </div>
            <div className="border-0 border-b border-solid border-border-soft flex justify-between pb-[6px]">
              <span className="text-[var(--color-text-muted)]">Ziel-Churn-Rate:</span>
              <span className="font-semibold text-text">{params.churnRateMonthly} % / Monat</span>
            </div>
            <div className="border-0 border-b border-solid border-border-soft flex justify-between pb-[6px]">
              <span className="text-[var(--color-text-muted)]">Sales FTE Kapazität:</span>
              <span className="font-semibold text-text">{params.salesRepCount} FTE</span>
            </div>
            <div className="border-0 border-b border-solid border-border-soft flex justify-between pb-[6px]">
              <span className="text-[var(--color-text-muted)]">CS FTE Kapazität:</span>
              <span className="font-semibold text-text">{params.csRepCount} FTE</span>
            </div>
            <div className="border-0 border-b border-solid border-border-soft flex justify-between pb-[6px]">
              <span className="text-[var(--color-text-muted)]">Sales Zyklus Dauer:</span>
              <span className="font-semibold text-text">{params.salesCycleDays} Tage</span>
            </div>

            {/* Channel Mix Breakdown */}
            <div className="mt-[8px]">
              <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">Kanal-Mix (Proportional Normalisiert):</span>
              <div className="flex gap-[6px] flex-wrap mt-[6px]">
                <Badge variant="cyan">LinkedIn: {params.channelMix.linkedIn}%</Badge>
                <Badge variant="mint">SEO: {params.channelMix.seo}%</Badge>
                <Badge variant="orange">Partner: {params.channelMix.partner}%</Badge>
                <Badge variant="neutral">Webinar: {params.channelMix.webinar}%</Badge>
                <Badge variant="neutral">Outbound: {params.channelMix.outbound}%</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--color-text-muted)]">Keine Parameterdaten verfügbar.</div>
        )}
      </Card>

      {/* Section: Sales Capacity, Process Time vs Queue Time Analytics */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Sales Capacity & Sales Queue Analytics (Process Time vs. Queue Time)
        </h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[var(--space-4)]">
          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Vertriebs-Kapazität</div>
            <div className="text-[20px] font-bold text-primary">
              {params?.salesRepCount ?? 2} FTE ({state.salesQueueProjection?.availableCapacity ?? params?.salesRepCount ?? 2} Slots)
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Auslastung: {state.metrics?.salesQueueMetrics?.capacityUtilization ?? 0}%
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Prozesszeit (Process Time)</div>
            <div className="text-[20px] font-bold text-text">
              {state.salesQueueProjection?.avgProcessTicks ?? 1} Ticks
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Effektive Bearbeitungsdauer
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Wartezeit (Queue Time)</div>
            <div className={`text-[20px] font-bold ${state.metrics?.salesQueueMetrics?.isSalesBottleneck ? 'text-warning' : 'text-accent'}`}>

              {state.salesQueueProjection?.avgQueueTicks ?? 0} Ticks
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Max. Wartezeit: {state.salesQueueProjection?.maxQueueTicks ?? 0} Ticks
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Total Sales Cycle</div>
            <div className="text-[20px] font-bold text-text">
              {(state.salesQueueProjection?.avgProcessTicks ?? 1) + (state.salesQueueProjection?.avgQueueTicks ?? 0)} Ticks
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              = Process Time + Queue Time
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Customer Success Health & CS Queue Analytics */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Customer Success Health & CS Queue Analytics (Decisions 1374-1398)
        </h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[var(--space-4)]">
          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Ø Customer Health</div>
            <div className={`text-[20px] font-bold ${(state.metrics?.customerHealthMetrics?.avgHealthScore ?? 75) < 50 ? 'text-warning' : 'text-primary'}`}>

              {state.metrics?.customerHealthMetrics?.avgHealthScore ?? 75} / 100
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Gefährdet (&lt; 50): {state.metrics?.customerHealthMetrics?.atRiskCustomerCount ?? 0}
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">CS Kapazität & Auslastung</div>
            <div className="text-[20px] font-bold text-text">
              {params?.csRepCount ?? 2} FTE ({state.csQueueProjection?.availableCapacity ?? params?.csRepCount ?? 2} Slots)
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Auslastung: {state.metrics?.csQueueMetrics?.capacityUtilization ?? 0}%
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">CS Queue vs Process Time</div>
            <div className={`text-[20px] font-bold ${state.metrics?.csQueueMetrics?.isCSBottleneck ? 'text-warning' : 'text-accent'}`}>

              {state.csQueueProjection?.avgQueueTicks ?? 0} Ticks Queue / {state.csQueueProjection?.avgProcessTicks ?? 1} Ticks Process
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Max CS Wartezeit: {state.csQueueProjection?.maxQueueTicks ?? 0} Ticks
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Churn-Ursachen Breakdown</div>
            <div className="text-[13px] font-semibold mt-[4px] text-text">
              Gekündigt: {state.metrics?.customerHealthMetrics?.churnedCustomerCount ?? 0}
            </div>
            <div className="text-[11px] mt-[4px] text-[var(--color-text-muted)]">
              Health: {state.metrics?.customerHealthMetrics?.churnCausesBreakdown?.HEALTH_PROBLEM ?? 0} | CS Kapazität: {state.metrics?.customerHealthMetrics?.churnCausesBreakdown?.CS_CAPACITY ?? 0} | Basis: {state.metrics?.customerHealthMetrics?.churnCausesBreakdown?.BASELINE_CHURN ?? 0}
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Financial Analysis & P&L Card (Auftrag 011) */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Financial Analysis & P&L Model (Gross/Net Revenue, Headcount OPEX, EBITDA, Cash Flow)
        </h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[var(--space-4)]">
          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Umsatz (Gross & Net Revenue)</div>
            <div className="text-[18px] font-bold text-primary">
              Net: {(aggregation.metrics.financialMetrics?.netRevenue.median ?? state.metrics?.financialMetrics?.netRevenue ?? 0).toLocaleString('de-DE')} €
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Gross: {(aggregation.metrics.financialMetrics?.grossRevenue.median ?? state.metrics?.financialMetrics?.grossRevenue ?? 0).toLocaleString('de-DE')} € | Churn Loss: {(state.metrics?.financialMetrics?.churnLoss ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Headcount & Operational OPEX</div>
            <div className="text-[18px] font-bold text-text">
              Total OPEX: {(aggregation.metrics.financialMetrics?.totalOpex.median ?? state.metrics?.financialMetrics?.totalOpex ?? 0).toLocaleString('de-DE')} €
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Sales Headcount: {(state.metrics?.financialMetrics?.salesHeadcountCost ?? 0).toLocaleString('de-DE')} € | CS Headcount: {(state.metrics?.financialMetrics?.csHeadcountCost ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">EBITDA & Operating Margin</div>
            <div className={`text-[18px] font-bold ${(aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0) < 0 ? 'text-warning' : 'text-accent'}`}>

              {(aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} € ({(aggregation.metrics.financialMetrics?.operatingMargin.median ?? state.metrics?.financialMetrics?.operatingMargin ?? 0)}%)
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              P10: {(aggregation.metrics.financialMetrics?.ebitda.p10 ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} € | P90: {(aggregation.metrics.financialMetrics?.ebitda.p90 ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div className="rounded bg-background-deep p-[12px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">CAC & Cash Flow</div>
            <div className="text-[18px] font-bold text-text">
              CAC: {(aggregation.metrics.financialMetrics?.cac.median ?? state.metrics?.financialMetrics?.cac ?? 0).toLocaleString('de-DE')} €
            </div>
            <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
              Net Cash Flow: {(aggregation.metrics.financialMetrics?.netCashFlow.median ?? state.metrics?.financialMetrics?.netCashFlow ?? 0).toLocaleString('de-DE')} € | Kumuliert: {(aggregation.metrics.financialMetrics?.cumulativeCashFlow.median ?? state.metrics?.financialMetrics?.cumulativeCashFlow ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>
        </div>
      </Card>



      {/* Section 4: Live Simulation Stream & Ticker */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Aktueller Simulations-Event-Stream (Tick #{state.tickCount})
        </h4>
        <div className="flex flex-col gap-[8px] max-h-[240px] overflow-y-auto">
          {events.slice(0, 15).map((evt) => (
            <div
              key={evt.id}
              className="rounded bg-background-deep flex items-center justify-between text-[12.5px] px-[12px] py-[8px]"
            >
              <div>
                <span className="font-bold mr-[8px] text-primary">Tick #{evt.tick}</span>
                <span className="font-semibold mr-[8px] text-text">{evt.title}:</span>
                <span className="text-[var(--color-text-muted)]">{evt.details}</span>
              </div>
              <span className="text-[11px] text-[var(--color-text-dim)]">{evt.timestamp}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
