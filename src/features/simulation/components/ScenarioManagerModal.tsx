import React, { useState, useMemo } from 'react';
import { logger } from '@/services/logger';
import { scenarioService } from '../../../simulation/scenarioService';
import {
  useActiveScenario,
  useActiveVersion,
  useScenarioActions,
  useScenarioVersions,
  useScenarios,
} from '../../../store/hooks';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Alert } from '../../../components/ui/Alert';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { NumberStepper } from '../../../components/ui/NumberStepper';
import { Table } from '../../../components/ui/Table';
import { parameterRegistry } from '../../../simulation/parameterRegistry';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../../simulation/scenarioRepository';
import { ScenarioParameters, VersionComparisonResult } from '../../../types/scenario';

interface ScenarioManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioManagerModal: React.FC<ScenarioManagerModalProps> = ({ isOpen, onClose }) => {
  const scenarios = useScenarios();
  const activeScenario = useActiveScenario();
  const activeVersion = useActiveVersion();
  const versions = useScenarioVersions();
  const { selectScenario, selectVersion, createNewVersion } = useScenarioActions();

  const [activeTab, setActiveTab] = useState<'manage' | 'diff'>('manage');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Version selection for Side-by-Side Diff
  const [diffVersionIdA, setDiffVersionIdA] = useState<string>(
    versions[0]?.id || activeVersion?.id || ''
  );
  const [diffVersionIdB, setDiffVersionIdB] = useState<string>(
    versions[1]?.id || versions[0]?.id || activeVersion?.id || ''
  );
  const [showOnlyChangedParams, setShowOnlyChangedParams] = useState(false);

  // Keep diff version IDs valid when versions change
  React.useEffect(() => {
    if (versions.length > 0) {
      if (!versions.some((v) => v.id === diffVersionIdA)) {
        setDiffVersionIdA(versions[0].id);
      }
      if (!versions.some((v) => v.id === diffVersionIdB)) {
        setDiffVersionIdB(versions[versions.length > 1 ? 1 : 0].id);
      }
    }
  }, [versions, diffVersionIdA, diffVersionIdB]);

  // Form parameters state initialized with current active version or defaults
  const [formParams, setFormParams] = useState<Partial<ScenarioParameters>>({
    marketingBudgetYearly: activeVersion?.parameters.marketingBudgetYearly ?? 65000,
    trialToPaidConversion: activeVersion?.parameters.trialToPaidConversion ?? 18,
    churnRateMonthly: activeVersion?.parameters.churnRateMonthly ?? 2.8,
    salesRepCount: activeVersion?.parameters.salesRepCount ?? 2,
    csRepCount: activeVersion?.parameters.csRepCount ?? 2,
    salesCycleDays: activeVersion?.parameters.salesCycleDays ?? 38,
    discountPercent: activeVersion?.parameters.discountPercent ?? 12,
  });

  const handleParamChange = (field: keyof ScenarioParameters, val: ScenarioParameters[keyof ScenarioParameters]) => {
    setFormParams((prev) => ({ ...prev, [field]: val }));
    setValidationError(null);
  };

  const handleCreateVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScenario) return;

    // Run Preflight / Parameter Registry validation
    const validation = parameterRegistry.validateAllParameters({
      ...activeVersion?.parameters,
      ...formParams,
    } as ScenarioParameters);

    if (!validation.valid) {
      setValidationError(`Preflight-Validierung fehlgeschlagen: ${validation.errors.join('; ')}`);
      return;
    }

    try {
      const newVer = createNewVersion(activeScenario.id, formParams, descriptionInput || undefined);
      setIsCreatingVersion(false);
      setDescriptionInput('');
      setValidationError(null);
      // Auto-set version B to the newly created version and switch to diff
      setDiffVersionIdB(newVer.id);
      setActiveTab('diff');
    } catch (err) {
      setValidationError((err instanceof Error ? err.message : '') || 'Fehler beim Erstellen der Version.');
    }
  };

  // Compute deterministic comparison using domain logic in ScenarioService
  const comparisonResult: VersionComparisonResult | null = useMemo(() => {
    if (!diffVersionIdA || !diffVersionIdB) return null;
    try {
      return scenarioService.compareVersions(diffVersionIdA, diffVersionIdB);
    } catch (err) {
      logger.warn('Could not compute version comparison:', err);
      return null;
    }
  }, [diffVersionIdA, diffVersionIdB]);

  const filteredParamDiffs = useMemo(() => {
    if (!comparisonResult) return [];
    if (!showOnlyChangedParams) return comparisonResult.parameterDiffs;
    return comparisonResult.parameterDiffs.filter((p) => p.hasChanged);
  }, [comparisonResult, showOnlyChangedParams]);

  const changedParamCount = useMemo(() => {
    return comparisonResult?.parameterDiffs.filter((p) => p.hasChanged).length || 0;
  }, [comparisonResult]);

  const handleSwapVersions = () => {
    const temp = diffVersionIdA;
    setDiffVersionIdA(diffVersionIdB);
    setDiffVersionIdB(temp);
  };

  const scenarioSelectOptions = scenarios.map((s) => ({
    value: s.id,
    label: `${s.name} ${s.isProtected ? '(Geschützt - Base 2026)' : ''}`,
  }));

  const paramDiffColumns = [
    {
      key: 'label',
      label: 'Parameter',
      render: (r: VersionComparisonResult['parameterDiffs'][number]) => (
        <div>
          <strong className={`font-bold ${r.hasChanged ? 'text-primary' : 'text-text'}`}>
            {r.label}
          </strong>
          <span className="text-[11px] ml-[6px] text-[var(--color-text-muted)]">
            ({r.unit || 'Wert'})
          </span>
        </div>
      ),
    },
    {
      key: 'formattedValueA',
      label: `Version A (v${comparisonResult?.versionA.versionNumber ?? 'A'})`,
      render: (r: VersionComparisonResult['parameterDiffs'][number]) => (
        <span className="font-mono text-[13px] text-text">
          {r.formattedValueA}
        </span>
      ),
    },
    {
      key: 'formattedValueB',
      label: `Version B (v${comparisonResult?.versionB.versionNumber ?? 'B'})`,
      render: (r: VersionComparisonResult['parameterDiffs'][number]) => (
        <span className={`font-mono text-[13px] ${r.hasChanged ? 'font-bold text-primary' : 'font-normal text-text'}`}>
          {r.formattedValueB}
        </span>
      ),
    },
    {
      key: 'delta',
      label: 'Änderung / Delta (Δ)',
      render: (r: VersionComparisonResult['parameterDiffs'][number]) => {
        if (!r.hasChanged) {
          return <Badge variant="neutral">Unverändert</Badge>;
        }
        if (typeof r.delta === 'number') {
          const isPositive = r.delta > 0;
          return (
            <div className="flex gap-[6px] items-center">
              <Badge variant={isPositive ? 'cyan' : 'orange'}>
                {isPositive ? '+' : ''}
                {r.delta.toLocaleString('de-DE')} {r.unit}
              </Badge>
              {typeof r.deltaPercent === 'number' && (
                <span className="text-[11.5px] text-[var(--color-text-muted)]">
                  ({isPositive ? '+' : ''}
                  {r.deltaPercent}%)
                </span>
              )}
            </div>
          );
        }
        return <Badge variant="orange">Geändert</Badge>;
      },
    },
  ];

  const kpiDiffColumns = [
    {
      key: 'label',
      label: 'KPI (Kennzahl)',
      render: (r: VersionComparisonResult['kpiComparisons'][number]) => (
        <div>
          <strong className="text-text">{r.label}</strong>
          <span className="text-[11px] ml-[6px] text-[var(--color-text-muted)]">
            ({r.unit})
          </span>
        </div>
      ),
    },
    {
      key: 'baselineValue',
      label: 'Baseline 2026',
      render: (r: VersionComparisonResult['kpiComparisons'][number]) => (
        <span className="font-mono text-[12.5px] text-[var(--color-text-muted)]">
          {r.baselineValue.toLocaleString('de-DE')} {r.unit}
        </span>
      ),
    },
    {
      key: 'valueA',
      label: `Version A (v${comparisonResult?.versionA.versionNumber ?? 'A'})`,
      render: (r: VersionComparisonResult['kpiComparisons'][number]) => {
        if (!r.hasResultA) {
          return <Badge variant="neutral">Simulation ausstehend</Badge>;
        }
        const status = r.goalEvaluationA?.status;
        const badgeVariant =
          status === 'ACHIEVED' ? 'cyan' : status === 'AT_RISK' ? 'orange' : 'neutral';
        return (
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono font-semibold text-text">
              {r.valueA.toLocaleString('de-DE')} {r.unit}
            </span>
            {status && status !== 'NO_TARGET' && (
              <span className="text-[11px]">
                <Badge variant={badgeVariant}>{status}</Badge>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'valueB',
      label: `Version B (v${comparisonResult?.versionB.versionNumber ?? 'B'})`,
      render: (r: VersionComparisonResult['kpiComparisons'][number]) => {
        if (!r.hasResultB) {
          return <Badge variant="neutral">Simulation ausstehend</Badge>;
        }
        const status = r.goalEvaluationB?.status;
        const badgeVariant =
          status === 'ACHIEVED' ? 'cyan' : status === 'AT_RISK' ? 'orange' : 'neutral';
        return (
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono font-bold text-primary">
              {r.valueB.toLocaleString('de-DE')} {r.unit}
            </span>
            {status && status !== 'NO_TARGET' && (
              <span className="text-[11px]">
                <Badge variant={badgeVariant}>{status}</Badge>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'comparisonAB',
      label: 'Delta vA ➔ vB',
      render: (r: VersionComparisonResult['kpiComparisons'][number]) => {
        if (!r.hasResultA || !r.hasResultB || !r.comparisonAB) {
          return <span className="text-[12px] text-[var(--color-text-muted)]">– (Simulation ausstehend)</span>;
        }
        const delta = r.comparisonAB.absoluteDelta;
        const percent = r.comparisonAB.percentChange;
        const isPos = r.comparisonAB.isPositiveChange;
        const sign = delta > 0 ? '+' : '';

        return (
          <div className="flex items-center gap-[6px]">
            <Badge variant={isPos ? 'cyan' : 'orange'}>
              {sign}
              {delta.toLocaleString('de-DE')} {r.unit}
            </Badge>
            <span className={`font-mono text-[11.5px] font-semibold ${isPos ? 'text-success' : 'text-accent'}`}>
              ({sign}
              {percent}%)
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <Modal open={isOpen} onClose={onClose} title="Szenario- & Versions-Entscheidungswerkbank" maxWidth="1000px">
      <div className="flex flex-col gap-[var(--space-4)] w-full">
        
        {/* Executive Header Bar */}
        <div className="flex justify-between items-center flex-wrap gap-[var(--space-3)] rounded-md border border-solid border-border bg-background-deep px-[var(--space-4)] py-[var(--space-3)]">
          <div className="flex items-center gap-[var(--space-3)]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                Aktives Szenario
              </span>
              <div className="text-[15px] font-bold text-text">
                {activeScenario?.name || 'Unbenanntes Szenario'}
              </div>
            </div>
            {activeScenario?.isProtected && <StatusChip variant="neutral" label="Geschützt (Base 2026)" size="sm" />}
          </div>

          <div className="flex items-center gap-[var(--space-2)]">
            <StatusChip
              variant="cyan"
              label={`Aktive Version: v${activeVersion?.versionNumber ?? 1}`}
              size="sm"
            />
            <span className="text-[12px] text-[var(--color-text-muted)]">
              ({versions.length} Version{versions.length === 1 ? '' : 'en'} verfügbar)
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-0 border-b border-solid border-border flex gap-[8px] pb-[8px]">
          <button
            data-testid="scenario-manage-tab"
            onClick={() => setActiveTab('manage')}
            className={`rounded-md cursor-pointer text-[13px] font-semibold px-[14px] py-[6px] ${activeTab === 'manage' ? 'border border-solid border-primary bg-primary-soft text-primary' : 'border border-solid border-transparent bg-transparent text-[var(--color-text-muted)]'}`}
          >
            ⚙️ Szenario & Versionen verwalten
          </button>
          <button
            data-testid="scenario-diff-tab"
            onClick={() => setActiveTab('diff')}
            className={`rounded-md cursor-pointer text-[13px] font-semibold px-[14px] py-[6px] flex items-center gap-[6px] ${activeTab === 'diff' ? 'border border-solid border-primary bg-primary-soft text-primary' : 'border border-solid border-transparent bg-transparent text-[var(--color-text-muted)]'}`}
          >
            ⚖️ Szenario-Versionen-Diff (Side-by-Side)
            {versions.length > 1 && <Badge variant="cyan">{versions.length} Versionen</Badge>}
          </button>
        </div>

        {/* TAB 1: MANAGE SCENARIO & VERSIONS */}
        {activeTab === 'manage' && (
          <div className="flex flex-col gap-[var(--space-4)]">
            {/* Active Scenario Selector */}
            <Select
              label="Szenario wechseln"
              options={scenarioSelectOptions}
              value={activeScenario?.id || ''}
              onChange={(val) => selectScenario(val)}
            />

            {/* Version Selection Cards */}
            <div>
              <div className="flex justify-between items-center mb-[8px]">
                <span className="text-[13px] font-semibold text-text">
                  Vorhandene Szenario-Versionen:
                </span>
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  Klicken zum Aktivieren
                </span>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[var(--space-3)]">
                {versions.map((v) => {
                  const isActive = activeVersion?.id === v.id;
                  const isBase = v.id === DEFAULT_BASE_2026_VERSION_ID;
                  return (
                    <Card
                      key={v.id}
                      padding="var(--space-3)"
                      featured={isActive}
                      className={`flex flex-col justify-between cursor-pointer ${isActive ? 'border-primary' : ''}`}
                      onClick={() => selectVersion(v.id)}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-[6px]">
                          <span className={`font-bold text-[14px] ${isActive ? 'text-primary' : 'text-text'}`}>
                            Version {v.versionNumber}
                          </span>
                          <div className="flex gap-[4px]">
                            {isActive && <StatusChip variant="cyan" label="Aktiv" size="sm" />}
                            {isBase && <StatusChip variant="neutral" label="★ Base 2026" size="sm" />}
                          </div>
                        </div>

                        <p className="text-[12px] text-[var(--color-text-muted)] mt-0 mb-[8px] mr-0 ml-0">
                          {v.description || 'Keine Beschreibung angegeben.'}
                        </p>

                        <div className="text-[11px] flex flex-col gap-[2px] rounded bg-background-deep py-[6px] px-[8px] text-[var(--color-text-muted)]">
                          <div>Sales Reps: <strong>{v.parameters.salesRepCount ?? 2}</strong> · CS Reps: <strong>{v.parameters.csRepCount ?? 2}</strong></div>
                          <div>Marketing: <strong>{(v.parameters.marketingBudgetYearly ?? 65000).toLocaleString('de-DE')} €</strong></div>
                          <div>Conversion: <strong>{v.parameters.trialToPaidConversion ?? 18} %</strong> · Churn: <strong>{v.parameters.churnRateMonthly ?? 2.8} %</strong></div>
                        </div>
                      </div>

                      <div className="border-0 border-t border-solid border-border-soft flex justify-between items-center mt-[10px] pt-[8px]">
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          Erstellt: {new Date(v.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex gap-[6px]">
                          {!isActive && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectVersion(v.id);
                              }}
                            >
                              Aktivieren
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDiffVersionIdB(v.id);
                              setActiveTab('diff');
                            }}
                          >
                            Diff ➔
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Action Toggle to Create New Version */}
            {!isCreatingVersion ? (
              <div className="flex gap-[10px] items-center flex-wrap">
                <Button variant="primary" onClick={() => setIsCreatingVersion(true)}>
                  + Neue Version (v{versions.length + 1}) aus Parameter-Set erstellen
                </Button>
                {versions.length > 1 && (
                  <Button variant="secondary" onClick={() => setActiveTab('diff')}>
                    Vergleich gegen andere Version öffnen ➔
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateVersion} className="flex flex-col gap-[var(--space-3)] mt-[8px]">
                <div className="flex justify-between items-center">
                  <h4 className="m-0 text-[14px] text-primary">
                    Neue Version (v{versions.length + 1}) konfigurieren
                  </h4>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreatingVersion(false)}>
                    Abbrechen
                  </Button>
                </div>

                {validationError && (
                  <Alert variant="error" title="Validierungsfehler">
                    {validationError}
                  </Alert>
                )}

                <Input
                  label="Versionsbeschreibung (optional)"
                  placeholder="z. B. Erhöhte Marketing-Ausgaben Q3"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  sizeVariant="sm"
                />

                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[var(--space-3)]">
                  <NumberStepper
                    label="Marketing-Budget (€/Jahr)"
                    value={formParams.marketingBudgetYearly || 65000}
                    min={30000}
                    max={150000}
                    step={5000}
                    unit="€"
                    onChange={(val) => handleParamChange('marketingBudgetYearly', val)}
                    sizeVariant="sm"
                  />

                  <NumberStepper
                    label="Trial-to-Paid Conversion (%)"
                    value={formParams.trialToPaidConversion || 18}
                    min={10}
                    max={40}
                    step={0.5}
                    unit="%"
                    onChange={(val) => handleParamChange('trialToPaidConversion', val)}
                    sizeVariant="sm"
                  />

                  <NumberStepper
                    label="Monatliche Churn-Rate (%)"
                    value={formParams.churnRateMonthly || 2.8}
                    min={0.5}
                    max={10.0}
                    step={0.1}
                    unit="%"
                    onChange={(val) => handleParamChange('churnRateMonthly', val)}
                    sizeVariant="sm"
                  />

                  <NumberStepper
                    label="Sales Reps (Headcount)"
                    value={formParams.salesRepCount || 2}
                    min={1}
                    max={10}
                    unit="Reps"
                    onChange={(val) => handleParamChange('salesRepCount', val)}
                    sizeVariant="sm"
                  />

                  <NumberStepper
                    label="CS Reps (Headcount)"
                    value={formParams.csRepCount || 2}
                    min={1}
                    max={10}
                    unit="Reps"
                    onChange={(val) => handleParamChange('csRepCount', val)}
                    sizeVariant="sm"
                  />

                  <NumberStepper
                    label="Sales Cycle (Tage)"
                    value={formParams.salesCycleDays || 38}
                    min={15}
                    max={90}
                    unit="Tage"
                    onChange={(val) => handleParamChange('salesCycleDays', val)}
                    sizeVariant="sm"
                  />
                </div>

                <div className="flex justify-end gap-[10px] mt-[8px]">
                  <Button type="button" variant="secondary" onClick={() => setIsCreatingVersion(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit" variant="primary">
                    Version v{versions.length + 1} anlegen & speichern
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: SIDE-BY-SIDE DIFF */}
        {activeTab === 'diff' && (
          <div className="flex flex-col gap-[var(--space-4)]">
            {/* Version Selectors Bar */}
            <div className="flex gap-[var(--space-3)] items-center flex-wrap rounded bg-background-deep border border-solid border-border p-[var(--space-3)]">
              <div className="flex-[1_1_200px] min-w-[180px]">
                <Select
                  label="Referenz-Version (Version A)"
                  options={versions.map((v) => ({
                    value: v.id,
                    label: `v${v.versionNumber} (${v.description || 'Version'}) ${v.id === DEFAULT_BASE_2026_VERSION_ID ? '★ Base' : ''}`,
                  }))}
                  value={diffVersionIdA}
                  onChange={(val) => setDiffVersionIdA(val)}
                  sizeVariant="sm"
                />
              </div>

              <div className="self-end pb-[4px]">
                <Button variant="secondary" size="sm" onClick={handleSwapVersions} title="Versionen tauschen">
                  ⇄ Tauschen
                </Button>
              </div>

              <div className="flex-[1_1_200px] min-w-[180px]">
                <Select
                  label="Vergleichs-Version (Version B)"
                  options={versions.map((v) => ({
                    value: v.id,
                    label: `v${v.versionNumber} (${v.description || 'Version'}) ${v.id === activeVersion?.id ? '● Aktiv' : ''}`,
                  }))}
                  value={diffVersionIdB}
                  onChange={(val) => setDiffVersionIdB(val)}
                  sizeVariant="sm"
                />
              </div>
            </div>

            {/* Changed Parameters Summary Chip Bar */}
            {changedParamCount > 0 ? (
              <div
                data-testid="changed-params-bar"
                className="flex items-center gap-[var(--space-2)] flex-wrap rounded border border-solid border-primary-soft bg-[rgba(0,217,198,0.08)] px-[12px] py-[8px]"
              >
                <span className="text-[12px] font-semibold text-primary">
                  {changedParamCount} geänderte{changedParamCount === 1 ? 'r' : ''} Parameter:
                </span>
                {comparisonResult?.parameterDiffs
                  .filter((p) => p.hasChanged)
                  .map((p) => (
                    <StatusChip
                      key={p.key}
                      variant="cyan"
                      label={`${p.label}: ${p.formattedValueA} ➔ ${p.formattedValueB}`}
                      size="sm"
                    />
                  ))}
              </div>
            ) : (
              <div className="rounded bg-background-deep text-[12px] text-[var(--color-text-muted)] px-[12px] py-[8px]">
                Keine Parameterunterschiede zwischen Version A und Version B.
              </div>
            )}

            {/* Summary Explanation Banner */}
            {comparisonResult && (
              <Card featured>
                <div className="flex items-center gap-[8px] mb-[4px]">
                  <span className="text-[15px]">💡</span>
                  <strong className="text-[13.5px] text-primary">
                    Strukturierte Management-Erklärung (Decision 1273 & 1637):
                  </strong>
                </div>
                <div className="text-[13px] leading-[1.5] text-text">
                  {comparisonResult.summaryExplanation}
                </div>
              </Card>
            )}

            {/* SECTION 1: KPI-Diff & Zielstatus */}
            <div className="flex flex-col gap-[var(--space-2)]">
              <div className="flex justify-between items-center flex-wrap gap-[var(--space-2)]">
                <h4 className="m-0 text-[14px] text-text">
                  📊 KPI-Auswirkung & Zielerreichung (vA vs. vB)
                </h4>
                <Badge variant="neutral">Directionality-bewertet</Badge>
              </div>
              <Card padding="0">
                <div className="w-full overflow-x-auto [touch-action:pan-x_pan-y]">
                  <Table columns={kpiDiffColumns} rows={comparisonResult?.kpiComparisons || []} minWidth="650px" />
                </div>
              </Card>
            </div>

            {/* SECTION 2: Parameter-Diff */}
            <div className="flex flex-col gap-[var(--space-2)]">
              <div className="flex justify-between items-center flex-wrap gap-[var(--space-2)]">
                <h4 className="m-0 text-[14px] text-text">
                  ⚙️ Parameter-Gegenüberstellung (Side-by-Side)
                </h4>
                <Checkbox
                  label={`Nur geänderte Parameter (${changedParamCount}) anzeigen`}
                  checked={showOnlyChangedParams}
                  onChange={setShowOnlyChangedParams}
                />
              </div>

              {/* Desktop Table */}
              <Card padding="0">
                <div className="w-full overflow-x-auto [touch-action:pan-x_pan-y]">
                  <Table columns={paramDiffColumns} rows={filteredParamDiffs} minWidth="650px" />
                </div>
              </Card>

              {/* Mobile Parameter Cards for small screens */}
              {/* G39 Welle 3: doppeltes className-Attribut (Original) zu einem
                  gemerged — zweites gewann ohnehin (immer hidden); Verhalten
                  exakt erhalten, tsc-Duplikat beseitigt. */}
              <div className="hidden flex-col gap-[var(--space-2)]">
                {filteredParamDiffs.map((p) => (
                  <Card key={p.key} padding="var(--space-3)">
                    <div className="flex justify-between items-center mb-[6px]">
                      <strong className={`text-[13px] ${p.hasChanged ? 'text-primary' : 'text-text'}`}>
                        {p.label}
                      </strong>
                      <Badge variant={p.hasChanged ? 'orange' : 'neutral'}>
                        {p.hasChanged ? 'Geändert' : 'Unverändert'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[12px] text-[var(--color-text-muted)]">
                      <span>vA: <strong className="text-text">{p.formattedValueA}</strong></span>
                      <span>vB: <strong className="text-primary">{p.formattedValueB}</strong></span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Explanations Section */}
            {comparisonResult && (
              <div className="text-[12px] flex flex-col gap-[4px] rounded bg-background-deep p-[8px] px-[12px] text-[var(--color-text-muted)]">
                <strong>Zielstatus & Simulationsstatus:</strong>
                {comparisonResult.kpiComparisons.map((k) => (
                  <div key={k.kpiId}>
                    • <strong>{k.label}:</strong> {k.goalEvaluationB?.explanation || (k.hasResultB ? 'Zielwert geprüft.' : `Kein Simulationslauf für Version ${comparisonResult.versionB.versionNumber} vorhanden (Simulation erforderlich).`)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
};
