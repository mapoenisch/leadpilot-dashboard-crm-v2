import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Toolbar } from '../../../components/ui/Toolbar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Alert } from '../../../components/ui/Alert';
import { ManagementPresenter } from '../../../simulation/managementPresenter';
import { BaselineComparisonMode } from '../../../types/kpi';

interface ManagementTierViewProps {
  onOpenScenarioModal: () => void;
  onOpenRunModal: () => void;
  onOpenMeasureModal: () => void;
  onOpenMultiCompareModal?: () => void;
}

export const ManagementTierView: React.FC<ManagementTierViewProps> = ({
  onOpenScenarioModal,
  onOpenRunModal,
  onOpenMeasureModal,
  onOpenMultiCompareModal,
}) => {
  const {
    state,
    activeScenario,
    activeVersion,
    aggregation,
    workerProgress,
    draftMeasures,
    start,
    pause,
    resetSimulation,
  } = useSimulation();

  const isRunning = state.isRunning;
  const arrStats = aggregation.metrics.arr;
  const mrrStats = aggregation.metrics.mrr;
  const custStats = aggregation.metrics.customers;
  const wonStats = aggregation.metrics.wonDeals;

  const [comparisonMode, setComparisonMode] = React.useState<BaselineComparisonMode>('ABSOLUTE');

  // Consume pre-computed view model from ManagementPresenter (strict separation of concerns)
  const { baselineARR, baselineMRR, baselineCustomers, arrComp, mrrComp, custComp, arrGoal } =
    ManagementPresenter.getManagementViewData(aggregation, state);

  const goalChipVariant =
    arrGoal.status === 'ACHIEVED' ? 'mint' : arrGoal.status === 'AT_RISK' ? 'orange' : 'neutral';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Zone 1 & 2: Executive Management Banner & Command Cockpit */}
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(0,217,198,0.06) 0%, rgba(11,33,31,0.95) 100%)',
          border: '1px solid var(--color-primary-soft)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          {/* Zone 1: Leading KPI & Strategic Overview */}
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '8px', flexWrap: 'wrap' }}>
              <StatusChip variant="cyan" label="MANAGEMENT-EBENE" />
              <StatusChip
                variant="neutral"
                label={`SZENARIO: ${activeScenario ? activeScenario.name : 'Base 2026'} (${activeVersion ? `v${activeVersion.versionNumber}` : 'v1'})`}
              />
              <StatusChip
                variant={aggregation.validRunCount > 0 ? 'mint' : 'neutral'}
                label={`${workerProgress.completedRuns} / ${workerProgress.totalRuns} Runs (${aggregation.validRunCount} Valide)`}
              />
            </div>

            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--color-text)' }}>
              Strategische Management-Prognose (P50 Median)
            </h2>

            <p style={{ margin: '6px 0 0 0', color: 'var(--color-text-muted)', fontSize: '13.5px', lineHeight: 1.4 }}>
              Führungskennzahlen basieren auf dem <strong>P50-Median aus {aggregation.validRunCount} validen Simulationsläufen</strong>.
              Der Unsicherheitskorridor wird durch das <strong>P10/P90-Quantilsband</strong> aufgespannt.
            </p>
          </div>

          {/* Zone 2: Action Command Strip & Toolbars */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => (isRunning ? pause() : start())}
                iconLeft={<Icon name={isRunning ? 'pause' : 'play'} size={15} />}
                style={{
                  boxShadow: isRunning ? 'var(--shadow-glow-cyan)' : 'none',
                }}
              >
                {isRunning ? 'Simulation Pausieren' : 'Simulation Starten'}
              </Button>
            </div>

            <Toolbar ariaLabel="Sekundäre Simulations-Aktionen" gap="6px">
              <Button size="sm" variant="secondary" onClick={onOpenScenarioModal} iconLeft={<Icon name="sliders" size={13} />}>
                Szenarien & Parameter
              </Button>
              <Button size="sm" variant="secondary" onClick={onOpenMeasureModal} iconLeft={<Icon name="layers" size={13} />}>
                Maßnahmen ({draftMeasures.length})
              </Button>
              {onOpenMultiCompareModal && (
                <Button size="sm" variant="secondary" onClick={onOpenMultiCompareModal} iconLeft={<Icon name="gitCompare" size={13} />}>
                  Szenariovergleich (3–4)
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onOpenRunModal} iconLeft={<Icon name="playCircle" size={13} />}>
                Run / Re-Run
              </Button>
              <Button size="sm" variant="secondary" onClick={resetSimulation} iconLeft={<Icon name="refreshCw" size={13} />}>
                Zurücksetzen
              </Button>
            </Toolbar>
          </div>
        </div>

        {/* Baseline Comparison Mode Toggle Bar */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
            <span>Vergleichsansicht zur Baseline:</span>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-deep)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
              <Button
                size="sm"
                variant={comparisonMode === 'ABSOLUTE' ? 'primary' : 'secondary'}
                onClick={() => setComparisonMode('ABSOLUTE')}
              >
                Absolutwerte
              </Button>
              <Button
                size="sm"
                variant={comparisonMode === 'DELTA' ? 'primary' : 'secondary'}
                onClick={() => setComparisonMode('DELTA')}
              >
                Delta Baseline (Δ)
              </Button>
              <Button
                size="sm"
                variant={comparisonMode === 'PERCENT' ? 'primary' : 'secondary'}
                onClick={() => setComparisonMode('PERCENT')}
              >
                Prozentual (%)
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <StatusChip variant={goalChipVariant} label={`ZIELSTATUS ARR: ${arrGoal.status}`} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{arrGoal.explanation}</span>
          </div>
        </div>
      </Card>

      {/* Top Level Management KPI Grid (P50 + P10/P90 Corridor) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        {/* KPI 1: ARR (P50) */}
        <Card featured={true}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Jahresumsatz (ARR P50 Median)
            </span>
            <Badge variant={arrComp.isPositiveChange ? 'mint' : 'orange'}>
              {arrGoal.status}
            </Badge>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-accent)', margin: '6px 0' }}>
            {comparisonMode === 'ABSOLUTE' && `${arrStats.median.toLocaleString('de-DE')} €`}
            {comparisonMode === 'DELTA' && `${arrComp.absoluteDelta >= 0 ? '+' : ''}${arrComp.absoluteDelta.toLocaleString('de-DE')} €`}
            {comparisonMode === 'PERCENT' && `${arrComp.percentChange >= 0 ? '+' : ''}${arrComp.percentChange} %`}
          </div>
          <div style={{ fontSize: '12px', color: arrComp.isPositiveChange ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon name={arrComp.isPositiveChange ? 'trendingUp' : 'trendingDown'} size={14} />
            <span>Baseline: {baselineARR.toLocaleString('de-DE')} € (Δ {arrComp.absoluteDelta >= 0 ? '+' : ''}{arrComp.absoluteDelta.toLocaleString('de-DE')} €)</span>
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-soft)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Unsicherheitskorridor: <strong>{arrStats.p10.toLocaleString('de-DE')} € (P10)</strong> – <strong>{arrStats.p90.toLocaleString('de-DE')} € (P90)</strong>
          </div>
        </Card>

        {/* KPI 2: MRR (P50) */}
        <Card>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Monatsumsatz (MRR P50 Median)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text)', margin: '6px 0' }}>
            {comparisonMode === 'ABSOLUTE' && `${mrrStats.median.toLocaleString('de-DE')} €`}
            {comparisonMode === 'DELTA' && `${mrrComp.absoluteDelta >= 0 ? '+' : ''}${mrrComp.absoluteDelta.toLocaleString('de-DE')} €`}
            {comparisonMode === 'PERCENT' && `${mrrComp.percentChange >= 0 ? '+' : ''}${mrrComp.percentChange} %`}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Ebene-A-Basis-MRR: {baselineMRR.toLocaleString('de-DE')} €
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-soft)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            P10: {mrrStats.p10.toLocaleString('de-DE')} € | P90: {mrrStats.p90.toLocaleString('de-DE')} €
          </div>
        </Card>

        {/* KPI 3: Kundenanzahl (P50) */}
        <Card>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Gesamtkunden (P50 Median)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text)', margin: '6px 0' }}>
            {comparisonMode === 'ABSOLUTE' && `${custStats.median} Kunden`}
            {comparisonMode === 'DELTA' && `${custComp.absoluteDelta >= 0 ? '+' : ''}${custComp.absoluteDelta} Kunden`}
            {comparisonMode === 'PERCENT' && `${custComp.percentChange >= 0 ? '+' : ''}${custComp.percentChange} %`}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Ebene-A-Basis 2025: {baselineCustomers} Kunden
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-soft)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            P10: {custStats.p10} | P90: {custStats.p90} Kunden
          </div>
        </Card>

        {/* KPI 4: Won Deals (P50) */}
        <Card>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Gewonnene Neugeschäft-Deals
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)', margin: '6px 0' }}>
            {wonStats.median} Deals
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Streubereich Min-Max: {wonStats.min} bis {wonStats.max} Deals
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-soft)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            P10: {wonStats.p10} | P90: {wonStats.p90} Deals
          </div>
        </Card>
      </div>

      {/* Executive Management Summary & Corridor Status */}
      {state.metrics?.salesQueueMetrics?.isSalesBottleneck && (
        <Alert variant="warning" title="Vertriebs-Engpass erkannt (Sales Capacity Bottleneck)">
          Der Sales-Cycle wird aktuell durch vertriebliche Kapazitätswartezeiten (Queue Time) verzögert.
          Vertriebs-Auslastung: <strong>{state.metrics.salesQueueMetrics.capacityUtilization}%</strong> |
          Durchschnittliche Wartezeit: <strong>{state.metrics.salesQueueMetrics.avgQueueTicks} Ticks</strong> |
          Wartende Vorgänge: <strong>{state.metrics.salesQueueMetrics.waitingCount} Leads</strong>.
        </Alert>
      )}

      {state.metrics?.csQueueMetrics?.isCSBottleneck && (
        <Alert variant="warning" title="Customer Success Engpass erkannt (CS Capacity Bottleneck)">
          Die Kundenbetreuung wird aktuell durch CS-Kapazitätswartezeiten verzögert. 
          CS-Auslastung: <strong>{state.metrics.csQueueMetrics.capacityUtilization}%</strong> | 
          Durchschnittliche CS-Wartezeit: <strong>{state.metrics.csQueueMetrics.avgQueueTicks} Ticks</strong> | 
          Gefährdete Kunden (Health &lt; 50): <strong>{state.metrics.customerHealthMetrics?.atRiskCustomerCount || 0}</strong>.
        </Alert>
      )}

      {/* Financial P&L & Profitability Summary Card */}
      <Card padding="var(--space-4)">
        <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '14px', color: 'var(--color-text)' }}>
          Finanzprognose & Profitabilität (Net Revenue, EBITDA, Operating Margin, Cash Flow)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          <div style={{ padding: '10px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Net Revenue (P50)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
              {(aggregation.metrics.financialMetrics?.netRevenue.median ?? state.metrics?.financialMetrics?.netRevenue ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>EBITDA (P50)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: (aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0) < 0 ? 'var(--color-warning)' : 'var(--color-primary)' }}>
              {(aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Operating Margin</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
              {aggregation.metrics.financialMetrics?.operatingMargin.median ?? state.metrics?.financialMetrics?.operatingMargin ?? 0}%
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Net Cash Flow</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: (aggregation.metrics.financialMetrics?.netCashFlow.median ?? state.metrics?.financialMetrics?.netCashFlow ?? 0) < 0 ? 'var(--color-warning)' : 'var(--color-accent)' }}>
              {(aggregation.metrics.financialMetrics?.netCashFlow.median ?? state.metrics?.financialMetrics?.netCashFlow ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>
        </div>
      </Card>

      {(state.metrics?.financialMetrics?.ebitda ?? 0) < 0 && (
        <Alert variant="warning" title="Finanzwarung: Negatives EBITDA">
          Das operative EBITDA ist im aktuellen Ausführungsstand negativ (<strong>{(state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} €</strong>). Die operativen Personalkosten und OPEX übersteigen den generierten Net Revenue.
        </Alert>
      )}

      {(state.metrics?.financialMetrics?.netCashFlow ?? 0) < 0 && (
        <Alert variant="warning" title="Finanzwarnung: Negativer Net Cash Flow">
          Der laufende Net Cash Flow ist negativ (<strong>{(state.metrics?.financialMetrics?.netCashFlow ?? 0).toLocaleString('de-DE')} €</strong>). Der operative Cash-Abfluss übersteigt die Mittelzuflüsse.
        </Alert>
      )}

      <Alert variant="info" title="Management-Zusammenfassung & Unsicherheitsband">
        Die aktuellen Monte-Carlo-Ergebnisse zeigen einen geschätzten Median-ARR von <strong>{arrStats.median.toLocaleString('de-DE')} €</strong>. 
        Im ungünstigsten 10%-Szenario (P10) wird ein ARR von <strong>{arrStats.p10.toLocaleString('de-DE')} €</strong> erreicht, 
        während im optimistischen 90%-Szenario (P90) ein ARR von <strong>{arrStats.p90.toLocaleString('de-DE')} €</strong> möglich ist. 
        Die Standardabweichung beträgt <strong>{aggregation.metrics.arr.stdDev.toLocaleString('de-DE')} €</strong>.
      </Alert>
    </div>
  );
};
