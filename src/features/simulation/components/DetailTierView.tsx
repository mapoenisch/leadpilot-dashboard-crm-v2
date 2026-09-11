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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* 1. Core KPI Time Series, Uncertainty Corridor & Distribution Explorer (Auftrag 018) */}
      <KpiTimeSeriesDetailView />


      {/* Section 1: Active V1 Growth Driver Parameters */}
      <Card padding="var(--space-5)">
        <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '15px', color: 'var(--color-text)' }}>
          Aktive V1-Wachstumstreiber (Parameter Registry)
        </h4>
        {params ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Marketing-Budget:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{params.marketingBudgetYearly.toLocaleString('de-DE')} €/Jahr</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Trial-to-Paid Conversion:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{params.trialToPaidConversion} %</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Ziel-Churn-Rate:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{params.churnRateMonthly} % / Monat</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Sales FTE Kapazität:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{params.salesRepCount} FTE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>CS FTE Kapazität:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{params.csRepCount} FTE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Sales Zyklus Dauer:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{params.salesCycleDays} Tage</span>
            </div>

            {/* Channel Mix Breakdown */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Kanal-Mix (Proportional Normalisiert):</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <Badge variant="cyan">LinkedIn: {params.channelMix.linkedIn}%</Badge>
                <Badge variant="mint">SEO: {params.channelMix.seo}%</Badge>
                <Badge variant="orange">Partner: {params.channelMix.partner}%</Badge>
                <Badge variant="neutral">Webinar: {params.channelMix.webinar}%</Badge>
                <Badge variant="neutral">Outbound: {params.channelMix.outbound}%</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Keine Parameterdaten verfügbar.</div>
        )}
      </Card>

      {/* Section: Sales Capacity, Process Time vs Queue Time Analytics */}
      <Card padding="var(--space-5)">
        <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '15px', color: 'var(--color-text)' }}>
          Sales Capacity & Sales Queue Analytics (Process Time vs. Queue Time)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Vertriebs-Kapazität</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {params?.salesRepCount ?? 2} FTE ({state.salesQueueProjection?.availableCapacity ?? params?.salesRepCount ?? 2} Slots)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Auslastung: {state.metrics?.salesQueueMetrics?.capacityUtilization ?? 0}%
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Prozesszeit (Process Time)</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              {state.salesQueueProjection?.avgProcessTicks ?? 1} Ticks
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Effektive Bearbeitungsdauer
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Wartezeit (Queue Time)</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: state.metrics?.salesQueueMetrics?.isSalesBottleneck ? 'var(--color-warning)' : 'var(--color-accent)' }}>
              {state.salesQueueProjection?.avgQueueTicks ?? 0} Ticks
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Max. Wartezeit: {state.salesQueueProjection?.maxQueueTicks ?? 0} Ticks
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Sales Cycle</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              {(state.salesQueueProjection?.avgProcessTicks ?? 1) + (state.salesQueueProjection?.avgQueueTicks ?? 0)} Ticks
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              = Process Time + Queue Time
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Customer Success Health & CS Queue Analytics */}
      <Card padding="var(--space-5)">
        <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '15px', color: 'var(--color-text)' }}>
          Customer Success Health & CS Queue Analytics (Decisions 1374-1398)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ø Customer Health</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: (state.metrics?.customerHealthMetrics?.avgHealthScore ?? 75) < 50 ? 'var(--color-warning)' : 'var(--color-primary)' }}>
              {state.metrics?.customerHealthMetrics?.avgHealthScore ?? 75} / 100
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Gefährdet (&lt; 50): {state.metrics?.customerHealthMetrics?.atRiskCustomerCount ?? 0}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>CS Kapazität & Auslastung</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              {params?.csRepCount ?? 2} FTE ({state.csQueueProjection?.availableCapacity ?? params?.csRepCount ?? 2} Slots)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Auslastung: {state.metrics?.csQueueMetrics?.capacityUtilization ?? 0}%
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>CS Queue vs Process Time</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: state.metrics?.csQueueMetrics?.isCSBottleneck ? 'var(--color-warning)' : 'var(--color-accent)' }}>
              {state.csQueueProjection?.avgQueueTicks ?? 0} Ticks Queue / {state.csQueueProjection?.avgProcessTicks ?? 1} Ticks Process
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Max CS Wartezeit: {state.csQueueProjection?.maxQueueTicks ?? 0} Ticks
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Churn-Ursachen Breakdown</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginTop: '4px' }}>
              Gekündigt: {state.metrics?.customerHealthMetrics?.churnedCustomerCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Health: {state.metrics?.customerHealthMetrics?.churnCausesBreakdown?.HEALTH_PROBLEM ?? 0} | CS Kapazität: {state.metrics?.customerHealthMetrics?.churnCausesBreakdown?.CS_CAPACITY ?? 0} | Basis: {state.metrics?.customerHealthMetrics?.churnCausesBreakdown?.BASELINE_CHURN ?? 0}
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Financial Analysis & P&L Card (Auftrag 011) */}
      <Card padding="var(--space-5)">
        <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '15px', color: 'var(--color-text)' }}>
          Financial Analysis & P&L Model (Gross/Net Revenue, Headcount OPEX, EBITDA, Cash Flow)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Umsatz (Gross & Net Revenue)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Net: {(aggregation.metrics.financialMetrics?.netRevenue.median ?? state.metrics?.financialMetrics?.netRevenue ?? 0).toLocaleString('de-DE')} €
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Gross: {(aggregation.metrics.financialMetrics?.grossRevenue.median ?? state.metrics?.financialMetrics?.grossRevenue ?? 0).toLocaleString('de-DE')} € | Churn Loss: {(state.metrics?.financialMetrics?.churnLoss ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Headcount & Operational OPEX</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
              Total OPEX: {(aggregation.metrics.financialMetrics?.totalOpex.median ?? state.metrics?.financialMetrics?.totalOpex ?? 0).toLocaleString('de-DE')} €
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Sales Headcount: {(state.metrics?.financialMetrics?.salesHeadcountCost ?? 0).toLocaleString('de-DE')} € | CS Headcount: {(state.metrics?.financialMetrics?.csHeadcountCost ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>EBITDA & Operating Margin</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: (aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0) < 0 ? 'var(--color-warning)' : 'var(--color-accent)' }}>
              {(aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} € ({(aggregation.metrics.financialMetrics?.operatingMargin.median ?? state.metrics?.financialMetrics?.operatingMargin ?? 0)}%)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              P10: {(aggregation.metrics.financialMetrics?.ebitda.p10 ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} € | P90: {(aggregation.metrics.financialMetrics?.ebitda.p90 ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>CAC & Cash Flow</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
              CAC: {(aggregation.metrics.financialMetrics?.cac.median ?? state.metrics?.financialMetrics?.cac ?? 0).toLocaleString('de-DE')} €
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Net Cash Flow: {(aggregation.metrics.financialMetrics?.netCashFlow.median ?? state.metrics?.financialMetrics?.netCashFlow ?? 0).toLocaleString('de-DE')} € | Kumuliert: {(aggregation.metrics.financialMetrics?.cumulativeCashFlow.median ?? state.metrics?.financialMetrics?.cumulativeCashFlow ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>
        </div>
      </Card>



      {/* Section 4: Live Simulation Stream & Ticker */}
      <Card padding="var(--space-5)">
        <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '15px', color: 'var(--color-text)' }}>
          Aktueller Simulations-Event-Stream (Tick #{state.tickCount})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {events.slice(0, 15).map((evt) => (
            <div
              key={evt.id}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', marginRight: '8px' }}>Tick #{evt.tick}</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600, marginRight: '8px' }}>{evt.title}:</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{evt.details}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>{evt.timestamp}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
