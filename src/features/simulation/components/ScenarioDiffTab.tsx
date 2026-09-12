import React, { useState, useMemo } from 'react';
import { logger } from '@/services/logger';
import { scenarioService } from '../../../simulation/scenarioService';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Card } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Table } from '../../../components/ui/Table';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../../simulation/scenarioRepository';
import { ScenarioVersion, VersionComparisonResult } from '../../../types/scenario';

interface ScenarioDiffTabProps {
  versions: ScenarioVersion[];
  activeVersion: ScenarioVersion | null | undefined;
  diffVersionIdA: string;
  diffVersionIdB: string;
  setDiffVersionIdA: (id: string) => void;
  setDiffVersionIdB: (id: string) => void;
}

export const ScenarioDiffTab: React.FC<ScenarioDiffTabProps> = ({
  versions,
  activeVersion,
  diffVersionIdA,
  diffVersionIdB,
  setDiffVersionIdA,
  setDiffVersionIdB,
}) => {
  const [showOnlyChangedParams, setShowOnlyChangedParams] = useState(false);

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
  );
};
