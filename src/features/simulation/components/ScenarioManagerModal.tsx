import React, { useState, useMemo } from 'react';
import { logger } from '@/services/logger';
import { useSimulation } from '../../../context/SimulationContext';
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
  const {
    scenarios,
    activeScenario,
    activeVersion,
    versions,
    selectScenario,
    selectVersion,
    createNewVersion,
    scenarioService,
  } = useSimulation();

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

  const handleParamChange = (field: keyof ScenarioParameters, val: any) => {
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
    } catch (err: any) {
      setValidationError(err.message || 'Fehler beim Erstellen der Version.');
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
  }, [scenarioService, diffVersionIdA, diffVersionIdB]);

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
      render: (r: any) => (
        <div>
          <strong style={{ color: r.hasChanged ? 'var(--color-primary)' : 'var(--color-text)' }}>
            {r.label}
          </strong>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
            ({r.unit || 'Wert'})
          </span>
        </div>
      ),
    },
    {
      key: 'formattedValueA',
      label: `Version A (v${comparisonResult?.versionA.versionNumber ?? 'A'})`,
      render: (r: any) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)' }}>
          {r.formattedValueA}
        </span>
      ),
    },
    {
      key: 'formattedValueB',
      label: `Version B (v${comparisonResult?.versionB.versionNumber ?? 'B'})`,
      render: (r: any) => (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: r.hasChanged ? 'var(--color-primary)' : 'var(--color-text)',
            fontWeight: r.hasChanged ? 700 : 400,
          }}
        >
          {r.formattedValueB}
        </span>
      ),
    },
    {
      key: 'delta',
      label: 'Änderung / Delta (Δ)',
      render: (r: any) => {
        if (!r.hasChanged) {
          return <Badge variant="neutral">Unverändert</Badge>;
        }
        if (typeof r.delta === 'number') {
          const isPositive = r.delta > 0;
          return (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Badge variant={isPositive ? 'cyan' : 'orange'}>
                {isPositive ? '+' : ''}
                {r.delta.toLocaleString('de-DE')} {r.unit}
              </Badge>
              {typeof r.deltaPercent === 'number' && (
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
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
      render: (r: any) => (
        <div>
          <strong style={{ color: 'var(--color-text)' }}>{r.label}</strong>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
            ({r.unit})
          </span>
        </div>
      ),
    },
    {
      key: 'baselineValue',
      label: 'Baseline 2026',
      render: (r: any) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
          {r.baselineValue.toLocaleString('de-DE')} {r.unit}
        </span>
      ),
    },
    {
      key: 'valueA',
      label: `Version A (v${comparisonResult?.versionA.versionNumber ?? 'A'})`,
      render: (r: any) => {
        if (!r.hasResultA) {
          return <Badge variant="neutral">Simulation ausstehend</Badge>;
        }
        const status = r.goalEvaluationA?.status;
        const badgeVariant =
          status === 'ACHIEVED' ? 'cyan' : status === 'AT_RISK' ? 'orange' : 'neutral';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
              {r.valueA.toLocaleString('de-DE')} {r.unit}
            </span>
            {status && status !== 'NO_TARGET' && (
              <span style={{ fontSize: '11px' }}>
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
      render: (r: any) => {
        if (!r.hasResultB) {
          return <Badge variant="neutral">Simulation ausstehend</Badge>;
        }
        const status = r.goalEvaluationB?.status;
        const badgeVariant =
          status === 'ACHIEVED' ? 'cyan' : status === 'AT_RISK' ? 'orange' : 'neutral';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {r.valueB.toLocaleString('de-DE')} {r.unit}
            </span>
            {status && status !== 'NO_TARGET' && (
              <span style={{ fontSize: '11px' }}>
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
      render: (r: any) => {
        if (!r.hasResultA || !r.hasResultB || !r.comparisonAB) {
          return <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>– (Simulation ausstehend)</span>;
        }
        const delta = r.comparisonAB.absoluteDelta;
        const percent = r.comparisonAB.percentChange;
        const isPos = r.comparisonAB.isPositiveChange;
        const sign = delta > 0 ? '+' : '';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Badge variant={isPos ? 'cyan' : 'orange'}>
              {sign}
              {delta.toLocaleString('de-DE')} {r.unit}
            </Badge>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                color: isPos ? 'var(--color-success)' : 'var(--color-accent)',
                fontWeight: 600,
              }}
            >
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
        
        {/* Executive Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-bg-deep)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Aktives Szenario
              </span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                {activeScenario?.name || 'Unbenanntes Szenario'}
              </div>
            </div>
            {activeScenario?.isProtected && <StatusChip variant="neutral" label="Geschützt (Base 2026)" size="sm" />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <StatusChip
              variant="cyan"
              label={`Aktive Version: v${activeVersion?.versionNumber ?? 1}`}
              size="sm"
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              ({versions.length} Version{versions.length === 1 ? '' : 'en'} verfügbar)
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '8px', paddingBottom: '8px' }}>
          <button
            data-testid="scenario-manage-tab"
            onClick={() => setActiveTab('manage')}
            style={{
              background: activeTab === 'manage' ? 'var(--color-primary-soft)' : 'transparent',
              color: activeTab === 'manage' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: activeTab === 'manage' ? '1px solid var(--color-primary)' : '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⚙️ Szenario & Versionen verwalten
          </button>
          <button
            data-testid="scenario-diff-tab"
            onClick={() => setActiveTab('diff')}
            style={{
              background: activeTab === 'diff' ? 'var(--color-primary-soft)' : 'transparent',
              color: activeTab === 'diff' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: activeTab === 'diff' ? '1px solid var(--color-primary)' : '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚖️ Szenario-Versionen-Diff (Side-by-Side)
            {versions.length > 1 && <Badge variant="cyan">{versions.length} Versionen</Badge>}
          </button>
        </div>

        {/* TAB 1: MANAGE SCENARIO & VERSIONS */}
        {activeTab === 'manage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Active Scenario Selector */}
            <Select
              label="Szenario wechseln"
              options={scenarioSelectOptions}
              value={activeScenario?.id || ''}
              onChange={(val) => selectScenario(val)}
            />

            {/* Version Selection Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                  Vorhandene Szenario-Versionen:
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Klicken zum Aktivieren
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 'var(--space-3)',
                }}
              >
                {versions.map((v) => {
                  const isActive = activeVersion?.id === v.id;
                  const isBase = v.id === DEFAULT_BASE_2026_VERSION_ID;
                  return (
                    <Card
                      key={v.id}
                      padding="var(--space-3)"
                      featured={isActive}
                      style={{
                        cursor: 'pointer',
                        borderColor: isActive ? 'var(--color-primary)' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => selectVersion(v.id)}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}>
                            Version {v.versionNumber}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {isActive && <StatusChip variant="cyan" label="Aktiv" size="sm" />}
                            {isBase && <StatusChip variant="neutral" label="★ Base 2026" size="sm" />}
                          </div>
                        </div>

                        <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {v.description || 'Keine Beschreibung angegeben.'}
                        </p>

                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--color-bg-deep)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                          <div>Sales Reps: <strong>{v.parameters.salesRepCount ?? 2}</strong> · CS Reps: <strong>{v.parameters.csRepCount ?? 2}</strong></div>
                          <div>Marketing: <strong>{(v.parameters.marketingBudgetYearly ?? 65000).toLocaleString('de-DE')} €</strong></div>
                          <div>Conversion: <strong>{v.parameters.trialToPaidConversion ?? 18} %</strong> · Churn: <strong>{v.parameters.churnRateMonthly ?? 2.8} %</strong></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border-soft)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Erstellt: {new Date(v.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <form onSubmit={handleCreateVersion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-primary)' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Version Selectors Bar */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                alignItems: 'center',
                flexWrap: 'wrap',
                background: 'var(--color-bg-deep)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
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

              <div style={{ alignSelf: 'flex-end', paddingBottom: '4px' }}>
                <Button variant="secondary" size="sm" onClick={handleSwapVersions} title="Versionen tauschen">
                  ⇄ Tauschen
                </Button>
              </div>

              <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: '8px 12px',
                  background: 'rgba(0, 217, 198, 0.08)',
                  border: '1px solid var(--color-primary-soft)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
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
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--color-bg-deep)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}
              >
                Keine Parameterunterschiede zwischen Version A und Version B.
              </div>
            )}

            {/* Summary Explanation Banner */}
            {comparisonResult && (
              <Card featured>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px' }}>💡</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '13.5px' }}>
                    Strukturierte Management-Erklärung (Decision 1273 & 1637):
                  </strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {comparisonResult.summaryExplanation}
                </div>
              </Card>
            )}

            {/* SECTION 1: KPI-Diff & Zielstatus */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)' }}>
                  📊 KPI-Auswirkung & Zielerreichung (vA vs. vB)
                </h4>
                <Badge variant="neutral">Directionality-bewertet</Badge>
              </div>
              <Card padding="0">
                <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table columns={kpiDiffColumns} rows={comparisonResult?.kpiComparisons || []} minWidth="650px" />
                </div>
              </Card>
            </div>

            {/* SECTION 2: Parameter-Diff */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)' }}>
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
                <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table columns={paramDiffColumns} rows={filteredParamDiffs} minWidth="650px" />
                </div>
              </Card>

              {/* Mobile Parameter Cards for small screens */}
              <div className="mobile-only-diff-cards" style={{ display: 'none', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {filteredParamDiffs.map((p) => (
                  <Card key={p.key} padding="var(--space-3)">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: p.hasChanged ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {p.label}
                      </strong>
                      <Badge variant={p.hasChanged ? 'orange' : 'neutral'}>
                        {p.hasChanged ? 'Geändert' : 'Unverändert'}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      <span>vA: <strong style={{ color: 'var(--color-text)' }}>{p.formattedValueA}</strong></span>
                      <span>vB: <strong style={{ color: 'var(--color-primary)' }}>{p.formattedValueB}</strong></span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Explanations Section */}
            {comparisonResult && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)' }}>
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
