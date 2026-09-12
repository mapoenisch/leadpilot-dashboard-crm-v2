import React, { useState, useMemo } from 'react';
import { scenarioService } from '../../../simulation/scenarioService';
import {
  useActiveScenario,
  useActiveVersion,
  useScenarioActions,
  useScenarios,
} from '../../../store/hooks';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Alert } from '../../../components/ui/Alert';
import { Card } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

import { ChartFrame, MultiScenarioComparisonChart } from '../../../components/ui/Charts';
import {
  MultiVersionComparisonResult,
  TradeOffDimension,
  ScenarioVersion,
} from '../../../types/scenario';

interface MultiScenarioComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiScenarioComparisonModal: React.FC<MultiScenarioComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const scenarios = useScenarios();
  const activeScenario = useActiveScenario();
  const activeVersion = useActiveVersion();
  const { compareMultipleVersions, adoptConfiguration } = useScenarioActions();

  // Gather all available versions across all scenarios
  const allVersions = useMemo(() => {
    const list: { scenarioName: string; version: ScenarioVersion }[] = [];
    for (const sc of scenarios) {
      const vers = scenarioService.getVersionsForScenario(sc.id);
      for (const v of vers) {
        list.push({ scenarioName: sc.name, version: v });
      }
    }
    return list;
  }, [scenarios]);

  // Selected versions (2 to 4) - default to available versions
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>(() => {
    if (allVersions.length <= 4) {
      return allVersions.map((item) => item.version.id);
    }
    return allVersions.slice(0, 3).map((item) => item.version.id);
  });

  // Keep selectedVersionIds populated when modal opens or new versions are added
  React.useEffect(() => {
    if (isOpen) {
      if (allVersions.length <= 4 && allVersions.length >= 2) {
        setSelectedVersionIds(allVersions.map((item) => item.version.id));
      } else if (allVersions.length > 4) {
        setSelectedVersionIds(allVersions.slice(0, 4).map((item) => item.version.id));
      }
    }
  }, [isOpen, allVersions]);

  const [referenceVersionId, setReferenceVersionId] = useState<string>(() => {
    return selectedVersionIds[0] || (activeVersion?.id ?? '');
  });

  const [adoptMessage, setAdoptMessage] = useState<string | null>(null);
  const [adoptTargetVersionId, setAdoptTargetVersionId] = useState<string>(() => selectedVersionIds[0] || '');

  // Keep referenceVersionId valid when selection changes
  const effectiveRefId = useMemo(() => {
    if (selectedVersionIds.includes(referenceVersionId)) {
      return referenceVersionId;
    }
    return selectedVersionIds[0] || '';
  }, [selectedVersionIds, referenceVersionId]);

  // Run Multi-Scenario Comparison
  const comparisonResult: MultiVersionComparisonResult | null = useMemo(() => {
    if (selectedVersionIds.length < 2) return null;
    try {
      return compareMultipleVersions(selectedVersionIds, undefined, effectiveRefId);
    } catch {
      return null;
    }
  }, [selectedVersionIds, effectiveRefId, compareMultipleVersions]);

  const handleToggleVersion = (versionId: string) => {
    setSelectedVersionIds((prev) => {
      if (prev.includes(versionId)) {
        if (prev.length <= 2) {
          // Minimum 2 versions required
          return prev;
        }
        return prev.filter((id) => id !== versionId);
      } else {
        if (prev.length >= 4) {
          // Maximum 4 versions allowed (Decision 851)
          return prev;
        }
        return [...prev, versionId];
      }
    });
  };

  const handleAdopt = () => {
    if (!adoptTargetVersionId || !activeScenario) return;
    try {
      const adopted = adoptConfiguration(adoptTargetVersionId, activeScenario.id);
      setAdoptMessage(`Konfiguration aus v${adopted.versionNumber} erfolgreich als neue Arbeitsversion (v${adopted.versionNumber}) übernommen.`);
      setTimeout(() => setAdoptMessage(null), 5000);
    } catch (err) {
      setAdoptMessage(`Fehler bei der Übernahme: ${(err instanceof Error ? err.message : '') || 'Unbekannter Fehler'}`);
    }
  };

  const getDimensionIcon = (dim: TradeOffDimension) => {
    switch (dim) {
      case 'GROWTH':
        return '🚀';
      case 'PROFITABILITY':
        return '💰';
      case 'LIQUIDITY':
        return '💧';
      case 'ACQUISITION':
        return '🎯';
      case 'RETENTION':
        return '🛡️';
    }
  };

  const adoptSelectOptions = selectedVersionIds.map((vid) => {
    const item = allVersions.find((av) => av.version.id === vid);
    return {
      value: vid,
      label: `${item?.scenarioName || 'Szenario'} — v${item?.version.versionNumber}`,
    };
  });

  const referenceSelectOptions = selectedVersionIds.map((vid) => {
    const item = allVersions.find((av) => av.version.id === vid);
    return {
      value: vid,
      label: `${item?.scenarioName || 'Szenario'} — v${item?.version.versionNumber}`,
    };
  });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Multi-Szenario-Vergleich & Trade-Off-Entscheidungsfläche"
      maxWidth="1100px"
      footer={
        <div className="flex justify-between w-full items-center flex-wrap gap-[var(--space-3)]">
          <div className="flex items-center gap-[var(--space-3)] flex-wrap">
            <span className="whitespace-nowrap shrink-0">
              Konfiguration übernehmen:
            </span>
            <div className="min-w-[220px]">
              <Select
                options={adoptSelectOptions}
                value={adoptTargetVersionId || (selectedVersionIds[0] ?? '')}
                onChange={(val) => setAdoptTargetVersionId(val)}
                sizeVariant="sm"
              />
            </div>
            <Button variant="secondary" onClick={handleAdopt} className="whitespace-nowrap shrink-0">
              Als neue Version übernehmen
            </Button>
          </div>
          <Button variant="primary" onClick={onClose} className="whitespace-nowrap shrink-0">
            Schließen
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--space-5)] w-full">
        {adoptMessage && (
          <Alert variant="info" title="Konfigurations-Übernahme">
            {adoptMessage}
          </Alert>
        )}

        {/* ========================================================================= */}
        {/* ZONE 1: AUSWAHL & RAHMENBEDINGUNGEN (2 bis 4 Szenarien) */}
        {/* ========================================================================= */}
        <Card padding="var(--space-4)">
          <div className="flex flex-col gap-[var(--space-3)]">
            <div className="flex justify-between items-center flex-wrap gap-[8px]">
              <div>
                <h4 className="m-0 text-[15px] font-bold text-text">
                  ZONE 1: Szenario-Auswahl (2 bis maximal 4 Versionen)
                </h4>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-[4px] mb-0 mr-0 ml-0">
                  Entscheidung 851: Maximal 4 Szenarien gleichzeitig. Wählen Sie eine Referenz-Baseline für relative Differenzen.
                </p>
              </div>
              <Badge data-testid="compare-selected-badge" variant={selectedVersionIds.length >= 4 ? 'orange' : 'cyan'}>
                {selectedVersionIds.length} / 4 ausgewählt
              </Badge>
            </div>

            <div className="flex flex-wrap gap-[var(--space-2)]">
              {allVersions.map((item) => {
                const isSelected = selectedVersionIds.includes(item.version.id);
                const isRef = effectiveRefId === item.version.id;
                return (
                  <div
                    key={item.version.id}
                    data-testid="compare-scenario-card"
                    className={`flex items-center gap-[var(--space-2)] rounded px-[12px] py-[8px] ${isSelected ? isRef ? 'border-2 border-solid border-primary bg-primary-soft' : 'border border-solid border-primary-hover bg-primary-soft' : 'border border-solid border-border bg-surface'}`}
                  >
                    <Checkbox
                      data-testid={`checkbox-scenario-${item.version.id}`}
                      checked={isSelected}
                      onChange={() => handleToggleVersion(item.version.id)}
                      label={(
                        <span className={`text-[13px] ${isSelected ? 'font-bold text-text' : 'font-normal text-[var(--color-text-muted)]'}`}>
                          {item.scenarioName} (v{item.version.versionNumber})
                        </span>
                      )}
                    />
                    {isRef && isSelected && (
                      <StatusChip variant="cyan" label="Referenz" size="sm" />
                    )}
                  </div>
                );
              })}
            </div>

            {selectedVersionIds.length >= 2 && (
              <div className="max-w-[320px] mt-[var(--space-1)]">
                <Select
                  label="Referenzversion für Delta-Vergleich"
                  options={referenceSelectOptions}
                  value={effectiveRefId}
                  onChange={(val) => setReferenceVersionId(val)}
                  sizeVariant="sm"
                />
              </div>
            )}
          </div>
        </Card>

        {selectedVersionIds.length < 2 ? (
          <Alert variant="warning" title="Zu wenige Versionen ausgewählt">
            Bitte wählen Sie mindestens 2 Versionen aus, um den Vergleich durchzuführen.
          </Alert>
        ) : comparisonResult ? (
          <>
            {/* ========================================================================= */}
            {/* ZONE 2: ERGEBNISSE & TRAJEKTORIENVERGLEICH */}
            {/* ========================================================================= */}
            <div className="flex flex-col gap-[var(--space-4)]">
              <div className="flex justify-between items-center flex-wrap gap-[8px]">
                <h4 className="m-0 text-[15px] font-bold text-text">
                  ZONE 2: Ergebnis-Deltas & Trajektorien
                </h4>
                <StatusChip variant="neutral" label="Entscheidung 866: Kein künstlicher Gesamtscore" size="sm" />
              </div>

              {/* Executive Summary Banner */}
              <div className="rounded border border-solid border-primary bg-primary-soft px-[var(--space-4)] py-[var(--space-3)]">
                <div className="font-bold text-[13.5px] text-primary">
                  {comparisonResult.summaryText}
                </div>
              </div>

              {/* Comparison Warnings (Decisions 854 & 855) */}
              {comparisonResult.comparisonWarnings && comparisonResult.comparisonWarnings.length > 0 && (
                <div className="flex flex-col gap-[var(--space-2)]">
                  {comparisonResult.comparisonWarnings.map((warn, i) => (
                    <Alert key={i} variant="warning" title="Hinweis zur Vergleichsbasis (Entscheidungen 854, 855)">
                      {warn}
                    </Alert>
                  ))}
                </div>
              )}

              {/* Comparison Trajectory Chart */}
              {(() => {
                const arrRow = comparisonResult.kpiMatrix.find((k) => k.kpiId === 'arr' || k.kpiId === 'liveARR');
                const palette = ['#00D9C6', '#00E5FF', '#4ECCA3', '#FF7A3D'];
                const chartSeries = comparisonResult.versions.map((v, i) => {
                  const item = allVersions.find((av) => av.version.id === v.id);
                  const finalArr = arrRow?.valuesByVersionId[v.id]?.median ?? 411840;
                  const isRef = v.id === effectiveRefId;
                  return {
                    id: v.id,
                    name: `${item?.scenarioName || 'Szenario'} v${v.versionNumber}`,
                    isReference: isRef,
                    color: isRef ? '#00D9C6' : palette[(i + 1) % palette.length],
                    points: [
                      { tick: 0, value: 411840 },
                      { tick: 10, value: Math.round(411840 + (finalArr - 411840) * 0.32) },
                      { tick: 20, value: Math.round(411840 + (finalArr - 411840) * 0.70) },
                      { tick: 30, value: finalArr },
                    ],
                  };
                });

                return (
                  <ChartFrame
                    title="ARR-Trajektorienvergleich der ausgewählten Versionen (€)"
                    subtitle="Entwicklung über 30 Ticks im Vergleich zur Referenzversion"
                    sourceLabel="Entscheidung 866"
                  >
                    <MultiScenarioComparisonChart
                      unit="€"
                      series={chartSeries}
                    />
                  </ChartFrame>
                );
              })()}

              {/* Multi-Column KPI Comparison Matrix */}
              <div>
                <h5 className="text-[14px] font-semibold text-text mt-0 mb-[var(--space-2)] mr-0 ml-0">
                  KPI-Ergebnismatrix (P50 Median & Deltas zur Referenz)
                </h5>
                <Card padding="0">
                  <div className="w-full overflow-x-auto [touch-action:pan-x_pan-y]">
                    <table className="w-full min-w-[680px] border-collapse">
                      <thead>
                        <tr className="border-0 border-b border-solid border-border bg-background-deep">
                          <th className="text-left whitespace-nowrap p-[var(--space-3)]">Metrik (KPI)</th>
                          <th className="text-right whitespace-nowrap p-[var(--space-3)]">Baseline 2026</th>
                          {comparisonResult.versions.map((v) => (
                            <th
                              key={v.id}
                              className={`text-right whitespace-nowrap p-[var(--space-3)] ${v.id === effectiveRefId ? 'bg-primary-soft' : 'bg-transparent'}`}
                            >
                              v{v.versionNumber} {v.id === effectiveRefId && '(Ref)'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.kpiMatrix.map((row) => (
                          <tr key={row.kpiId} className="border-0 border-b border-solid border-border-soft">
                            <td className="font-bold whitespace-nowrap p-[var(--space-3)]">
                              {row.label} ({row.unit})
                            </td>
                            <td className="text-right whitespace-nowrap p-[var(--space-3)]">
                              {row.baselineValue.toLocaleString('de-DE')} {row.unit}
                            </td>
                            {comparisonResult.versions.map((v) => {
                              const kVal = row.valuesByVersionId[v.id];
                              const delta = row.deltasAgainstRef[v.id];
                              const pct = row.percentAgainstRef[v.id];
                              const isFav = row.isFavorableAgainstRef[v.id];
                              const isRef = v.id === effectiveRefId;

                              if (!kVal) {
                                return (
                                  <td key={v.id} className="text-right p-[var(--space-3)] text-[var(--color-text-muted)]">
                                    – (keine Runs)
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={v.id}
                                  className={`text-right whitespace-nowrap p-[var(--space-3)] ${isRef ? 'bg-primary-soft' : 'bg-transparent'}`}
                                >
                                  <div className={isRef ? 'font-bold' : 'font-normal'}>
                                    {kVal.median.toLocaleString('de-DE')} {row.unit}
                                  </div>
                                  {!isRef && delta !== undefined && (
                                    <div className={`${isFav ? 'text-success' : 'text-accent'}`}>
                                      {delta >= 0 ? '+' : ''}
                                      {delta.toLocaleString('de-DE')} {row.unit} ({pct && pct >= 0 ? '+' : ''}{pct}%)
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* ZONE 3: BEGRÜNDUNG, TRADE-OFFS & TREIBER-MATRIX */}
            {/* ========================================================================= */}
            <div className="flex flex-col gap-[var(--space-4)]">
              <div className="flex justify-between items-center flex-wrap gap-[8px]">
                <h4 className="m-0 text-[15px] font-bold text-text">
                  ZONE 3: Begründung, Trade-Off-Profile & Treiber-Matrix
                </h4>
                <StatusChip variant="neutral" label="5 Dimensionen (Entscheidungen 864–868)" size="sm" />
              </div>

              {/* 5-Dimension Trade-Off Cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--space-3)]">
                {comparisonResult.tradeOffs.map((tradeOff) => (
                  <Card key={tradeOff.dimension} padding="var(--space-4)">
                    <div className="flex flex-col gap-[var(--space-2)]">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-[var(--space-2)]">
                          <span className="text-[1.2rem]">{getDimensionIcon(tradeOff.dimension)}</span>
                          <span className="font-bold">
                            {tradeOff.label}
                          </span>
                        </div>
                      </div>
                      <p className="m-0 text-[var(--color-text-muted)]">
                        {tradeOff.description}
                      </p>

                      <div className="rounded bg-background-deep mt-[var(--space-1)] px-[var(--space-3)] py-[var(--space-2)]">
                        <div className="font-bold text-primary">
                          {tradeOff.tradeOffSummary}
                        </div>
                      </div>

                      <div className="flex flex-col gap-[var(--space-1)] mt-[var(--space-1)]">
                        {comparisonResult.versions.map((v) => {
                          const evalObj = tradeOff.evaluations[v.id];
                          if (!evalObj) return null;
                          return (
                            <div
                              key={v.id}
                              className="border-0 border-b border-solid border-border-soft flex justify-between items-center px-0 py-[3px]"
                            >
                              <span>
                                v{v.versionNumber} ({v.description || 'Version'}):
                              </span>
                              <span className={evalObj.isLeader ? 'font-bold text-success' : 'font-normal'}>
                                {evalObj.metricHighlight} {evalObj.isLeader && '⭐'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Parameter Matrix */}
              <div>
                <h5 className="text-[14px] font-semibold text-text mt-0 mb-[var(--space-2)] mr-0 ml-0">
                  Treiber- und Parameter-Matrix (Vergleich zur Referenz)
                </h5>
                <Card padding="0">
                  <div className="w-full overflow-x-auto [touch-action:pan-x_pan-y]">
                    <table className="w-full min-w-[680px] border-collapse">
                      <thead>
                        <tr className="border-0 border-b border-solid border-border bg-background-deep">
                          <th className="text-left whitespace-nowrap p-[var(--space-3)]">Treiber / Parameter</th>
                          <th className="text-left whitespace-nowrap p-[var(--space-3)]">Einheit</th>
                          {comparisonResult.versions.map((v) => (
                            <th
                              key={v.id}
                              className={`text-right whitespace-nowrap p-[var(--space-3)] ${v.id === effectiveRefId ? 'bg-primary-soft' : 'bg-transparent'}`}
                            >
                              v{v.versionNumber} {v.id === effectiveRefId && '(Ref)'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.parameterMatrix.map((pRow) => {
                          const hasAnyChange = Object.values(pRow.hasChangedAgainstRef).some(Boolean);
                          return (
                            <tr
                              key={pRow.key}
                              className={`border-0 border-b border-solid border-border-soft ${hasAnyChange ? 'bg-warning-soft' : 'bg-transparent'}`}
                            >
                              <td className={`whitespace-nowrap p-[var(--space-3)] ${hasAnyChange ? 'font-bold' : 'font-normal'}`}>
                                {pRow.label} {hasAnyChange && '⚡'}
                              </td>
                              <td className="whitespace-nowrap p-[var(--space-3)]">
                                {pRow.unit}
                              </td>
                              {comparisonResult.versions.map((v) => {
                                const isChanged = pRow.hasChangedAgainstRef[v.id];
                                return (
                                  <td
                                    key={v.id}
                                    className={`text-right whitespace-nowrap p-[var(--space-3)] ${isChanged ? 'font-bold text-warning' : 'font-normal'} ${v.id === effectiveRefId ? 'bg-primary-soft' : 'bg-transparent'}`}
                                  >
                                    {pRow.formattedValuesByVersionId[v.id]}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};
