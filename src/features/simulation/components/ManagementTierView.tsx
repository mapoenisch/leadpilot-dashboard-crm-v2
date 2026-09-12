import React from 'react';
import {
  useActiveScenario,
  useActiveVersion,
  useAggregation,
  useDraftMeasures,
  useSimulationControls,
  useSimulationState,
  useWorkerProgress,
} from '../../../store/hooks';
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
  const state = useSimulationState();
  const activeScenario = useActiveScenario();
  const activeVersion = useActiveVersion();
  const aggregation = useAggregation();
  const workerProgress = useWorkerProgress();
  const draftMeasures = useDraftMeasures();
  const { start, pause, resetSimulation } = useSimulationControls();

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
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Zone 1 & 2: Executive Management Banner & Command Cockpit */}
      <Card className="border border-solid border-primary-soft bg-[linear-gradient(135deg,rgba(0,217,198,0.06)_0%,rgba(11,33,31,0.95)_100%)]">
        <div className="flex items-start justify-between flex-wrap gap-[var(--space-4)]">
          {/* Zone 1: Leading KPI & Strategic Overview */}
          <div className="flex-[1_1_380px] min-w-0">
            <div className="flex items-center gap-[var(--space-2)] flex-wrap mb-[8px]">
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

            <h2 className="m-0 font-display text-[22px] text-text">
              Strategische Management-Prognose (P50 Median)
            </h2>

            <p className="text-[13.5px] leading-[1.4] mt-[6px] mb-0 mr-0 ml-0 text-[var(--color-text-muted)]">
              Führungskennzahlen basieren auf dem <strong>P50-Median aus {aggregation.validRunCount} validen Simulationsläufen</strong>.
              Der Unsicherheitskorridor wird durch das <strong>P10/P90-Quantilsband</strong> aufgespannt.
            </p>
          </div>

          {/* Zone 2: Action Command Strip & Toolbars */}
          <div className="flex flex-col items-end gap-[var(--space-2)]">
            <div className="flex items-center gap-[var(--space-2)] flex-wrap">
              <Button
                variant="primary"
                onClick={() => (isRunning ? pause() : start())}
                iconLeft={<Icon name={isRunning ? 'pause' : 'play'} size={15} />}
                // G39 Welle 3: zwei zur Build-Zeit bekannte Werte — als
                // Klasse via Block-A-Merge (kein style nötig).
                className={isRunning ? 'shadow-glow-cyan' : 'shadow-none'}
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
        <div className="border-0 border-t border-solid border-border-soft flex items-center justify-between flex-wrap gap-[12px] mt-[16px] pt-[12px]">
          <div className="flex items-center gap-[8px] text-[12.5px] text-[var(--color-text-muted)]">
            <span>Vergleichsansicht zur Baseline:</span>
            <div className="flex gap-[4px] rounded bg-background-deep p-[3px]">
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

          <div className="flex items-center gap-[8px] flex-wrap">
            <StatusChip variant={goalChipVariant} label={`ZIELSTATUS ARR: ${arrGoal.status}`} />
            <span className="text-[12px] text-[var(--color-text-muted)]">{arrGoal.explanation}</span>
          </div>
        </div>
      </Card>

      {/* Top Level Management KPI Grid (P50 + P10/P90 Corridor) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[var(--space-4)]">
        {/* KPI 1: ARR (P50) */}
        <Card featured={true}>
          <div className="flex justify-between items-center">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
              Jahresumsatz (ARR P50 Median)
            </span>
            <Badge variant={arrComp.isPositiveChange ? 'mint' : 'orange'}>
              {arrGoal.status}
            </Badge>
          </div>
          <div className="text-[28px] font-bold my-[6px] mx-0 text-accent">
            {comparisonMode === 'ABSOLUTE' && `${arrStats.median.toLocaleString('de-DE')} €`}
            {comparisonMode === 'DELTA' && `${arrComp.absoluteDelta >= 0 ? '+' : ''}${arrComp.absoluteDelta.toLocaleString('de-DE')} €`}
            {comparisonMode === 'PERCENT' && `${arrComp.percentChange >= 0 ? '+' : ''}${arrComp.percentChange} %`}
          </div>
          <div className={`flex items-center gap-[4px] text-[12px] ${arrComp.isPositiveChange ? 'text-primary' : 'text-[var(--color-text-muted)]'}`}>
            <Icon name={arrComp.isPositiveChange ? 'trendingUp' : 'trendingDown'} size={14} />
            <span>Baseline: {baselineARR.toLocaleString('de-DE')} € (Δ {arrComp.absoluteDelta >= 0 ? '+' : ''}{arrComp.absoluteDelta.toLocaleString('de-DE')} €)</span>
          </div>
          <div className="border-0 border-t border-solid border-border-soft text-[11px] mt-[8px] pt-[8px] text-[var(--color-text-muted)]">
            Unsicherheitskorridor: <strong>{arrStats.p10.toLocaleString('de-DE')} € (P10)</strong> – <strong>{arrStats.p90.toLocaleString('de-DE')} € (P90)</strong>
          </div>
        </Card>

        {/* KPI 2: MRR (P50) */}
        <Card>
          <div className="text-[12px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
            Monatsumsatz (MRR P50 Median)
          </div>
          <div className="text-[26px] font-bold my-[6px] mx-0 text-text">
            {comparisonMode === 'ABSOLUTE' && `${mrrStats.median.toLocaleString('de-DE')} €`}
            {comparisonMode === 'DELTA' && `${mrrComp.absoluteDelta >= 0 ? '+' : ''}${mrrComp.absoluteDelta.toLocaleString('de-DE')} €`}
            {comparisonMode === 'PERCENT' && `${mrrComp.percentChange >= 0 ? '+' : ''}${mrrComp.percentChange} %`}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Ebene-A-Basis-MRR: {baselineMRR.toLocaleString('de-DE')} €
          </div>
          <div className="border-0 border-t border-solid border-border-soft text-[11px] mt-[8px] pt-[8px] text-[var(--color-text-muted)]">
            P10: {mrrStats.p10.toLocaleString('de-DE')} € | P90: {mrrStats.p90.toLocaleString('de-DE')} €
          </div>
        </Card>

        {/* KPI 3: Kundenanzahl (P50) */}
        <Card>
          <div className="text-[12px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
            Gesamtkunden (P50 Median)
          </div>
          <div className="text-[26px] font-bold my-[6px] mx-0 text-text">
            {comparisonMode === 'ABSOLUTE' && `${custStats.median} Kunden`}
            {comparisonMode === 'DELTA' && `${custComp.absoluteDelta >= 0 ? '+' : ''}${custComp.absoluteDelta} Kunden`}
            {comparisonMode === 'PERCENT' && `${custComp.percentChange >= 0 ? '+' : ''}${custComp.percentChange} %`}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Ebene-A-Basis 2025: {baselineCustomers} Kunden
          </div>
          <div className="border-0 border-t border-solid border-border-soft text-[11px] mt-[8px] pt-[8px] text-[var(--color-text-muted)]">
            P10: {custStats.p10} | P90: {custStats.p90} Kunden
          </div>
        </Card>

        {/* KPI 4: Won Deals (P50) */}
        <Card>
          <div className="text-[12px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
            Gewonnene Neugeschäft-Deals
          </div>
          <div className="text-[26px] font-bold my-[6px] mx-0 text-primary">
            {wonStats.median} Deals
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Streubereich Min-Max: {wonStats.min} bis {wonStats.max} Deals
          </div>
          <div className="border-0 border-t border-solid border-border-soft text-[11px] mt-[8px] pt-[8px] text-[var(--color-text-muted)]">
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
        <h4 className="text-[14px] text-text mt-0 mb-[var(--space-3)] mr-0 ml-0">
          Finanzprognose & Profitabilität (Net Revenue, EBITDA, Operating Margin, Cash Flow)
        </h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[var(--space-3)]">
          <div className="rounded bg-background-deep p-[10px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Net Revenue (P50)</div>
            <div className="text-[18px] font-bold text-text">
              {(aggregation.metrics.financialMetrics?.netRevenue.median ?? state.metrics?.financialMetrics?.netRevenue ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div className="rounded bg-background-deep p-[10px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">EBITDA (P50)</div>
            <div
              className="text-[18px] font-bold"
              // G39 Welle 3: EBITDA-Farbe aus Finanz-Schwelle (< 0,
              // Simulations-Datum, kontinuierlich) — als Klasse nicht
              // darstellbar (Entscheidung 2).
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Finanz-Schwelle aus Daten), siehe Auftrag 056 Entscheidung 2
              style={{
                color: (aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0) < 0 ? 'var(--color-warning)' : 'var(--color-primary)',
              }}
            >
              {(aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} €
            </div>
          </div>

          <div className="rounded bg-background-deep p-[10px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Operating Margin</div>
            <div className="text-[18px] font-bold text-text">
              {aggregation.metrics.financialMetrics?.operatingMargin.median ?? state.metrics?.financialMetrics?.operatingMargin ?? 0}%
            </div>
          </div>

          <div className="rounded bg-background-deep p-[10px]">
            <div className="text-[11px] uppercase text-[var(--color-text-muted)]">Net Cash Flow</div>
            <div
              className="text-[18px] font-bold"
              // G39 Welle 3: Cash-Flow-Farbe aus Finanz-Schwelle (< 0) —
              // als Klasse nicht darstellbar (Entscheidung 2).
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Finanz-Schwelle aus Daten), siehe Auftrag 056 Entscheidung 2
              style={{
                color: (aggregation.metrics.financialMetrics?.netCashFlow.median ?? state.metrics?.financialMetrics?.netCashFlow ?? 0) < 0 ? 'var(--color-warning)' : 'var(--color-accent)',
              }}
            >
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
