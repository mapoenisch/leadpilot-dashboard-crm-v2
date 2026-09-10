import React, { useState, useMemo } from 'react';
import { useSimulation } from '../../../context/SimulationContext';
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
  const {
    scenarios,
    activeScenario,
    activeVersion,
    scenarioService,
    compareMultipleVersions,
    adoptConfiguration,
  } = useSimulation();

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
  }, [scenarios, scenarioService]);

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
    } catch (err: any) {
      setAdoptMessage(`Fehler bei der Übernahme: ${err.message}`);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Konfiguration übernehmen:
            </span>
            <div style={{ minWidth: '220px' }}>
              <Select
                options={adoptSelectOptions}
                value={adoptTargetVersionId || (selectedVersionIds[0] ?? '')}
                onChange={(val) => setAdoptTargetVersionId(val)}
                sizeVariant="sm"
              />
            </div>
            <Button variant="secondary" onClick={handleAdopt} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              Als neue Version übernehmen
            </Button>
          </div>
          <Button variant="primary" onClick={onClose} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            Schließen
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', width: '100%' }}>
        {adoptMessage && (
          <Alert variant="info" title="Konfigurations-Übernahme">
            {adoptMessage}
          </Alert>
        )}

        {/* ========================================================================= */}
        {/* ZONE 1: AUSWAHL & RAHMENBEDINGUNGEN (2 bis 4 Szenarien) */}
        {/* ========================================================================= */}
        <Card padding="var(--space-4)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                  ZONE 1: Szenario-Auswahl (2 bis maximal 4 Versionen)
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Entscheidung 851: Maximal 4 Szenarien gleichzeitig. Wählen Sie eine Referenz-Baseline für relative Differenzen.
                </p>
              </div>
              <Badge data-testid="compare-selected-badge" variant={selectedVersionIds.length >= 4 ? 'orange' : 'cyan'}>
                {selectedVersionIds.length} / 4 ausgewählt
              </Badge>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {allVersions.map((item) => {
                const isSelected = selectedVersionIds.includes(item.version.id);
                const isRef = effectiveRefId === item.version.id;
                return (
                  <div
                    key={item.version.id}
                    data-testid="compare-scenario-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: '8px 12px',
                      background: isSelected ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                      border: isSelected
                        ? isRef
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-primary-hover)'
                        : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <Checkbox
                      data-testid={`checkbox-scenario-${item.version.id}`}
                      checked={isSelected}
                      onChange={() => handleToggleVersion(item.version.id)}
                      label={(
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 400, color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
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
              <div style={{ maxWidth: '320px', marginTop: 'var(--space-1)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                  ZONE 2: Ergebnis-Deltas & Trajektorien
                </h4>
                <StatusChip variant="neutral" label="Entscheidung 866: Kein künstlicher Gesamtscore" size="sm" />
              </div>

              {/* Executive Summary Banner */}
              <div
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-primary-soft)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '13.5px' }}>
                  {comparisonResult.summaryText}
                </div>
              </div>

              {/* Comparison Warnings (Decisions 854 & 855) */}
              {comparisonResult.comparisonWarnings && comparisonResult.comparisonWarnings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
                <h5 style={{ margin: '0 0 var(--space-2) 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                  KPI-Ergebnismatrix (P50 Median & Deltas zur Referenz)
                </h5>
                <Card padding="0">
                  <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-bg-deep)', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: 'var(--space-3)', whiteSpace: 'nowrap' }}>Metrik (KPI)</th>
                          <th style={{ textAlign: 'right', padding: 'var(--space-3)', whiteSpace: 'nowrap' }}>Baseline 2026</th>
                          {comparisonResult.versions.map((v) => (
                            <th
                              key={v.id}
                              style={{
                                textAlign: 'right',
                                padding: 'var(--space-3)',
                                whiteSpace: 'nowrap',
                                background: v.id === effectiveRefId ? 'var(--color-primary-soft)' : 'transparent',
                              }}
                            >
                              v{v.versionNumber} {v.id === effectiveRefId && '(Ref)'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.kpiMatrix.map((row) => (
                          <tr key={row.kpiId} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                            <td style={{ padding: 'var(--space-3)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {row.label} ({row.unit})
                            </td>
                            <td style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
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
                                  <td key={v.id} style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
                                    – (keine Runs)
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={v.id}
                                  style={{
                                    textAlign: 'right',
                                    padding: 'var(--space-3)',
                                    background: isRef ? 'var(--color-primary-soft)' : 'transparent',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <div style={{ fontWeight: isRef ? 'bold' : 'normal' }}>
                                    {kVal.median.toLocaleString('de-DE')} {row.unit}
                                  </div>
                                  {!isRef && delta !== undefined && (
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: isFav ? 'var(--color-success)' : 'var(--color-accent)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                  ZONE 3: Begründung, Trade-Off-Profile & Treiber-Matrix
                </h4>
                <StatusChip variant="neutral" label="5 Dimensionen (Entscheidungen 864–868)" size="sm" />
              </div>

              {/* 5-Dimension Trade-Off Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 'var(--space-3)',
                }}
              >
                {comparisonResult.tradeOffs.map((tradeOff) => (
                  <Card key={tradeOff.dimension} padding="var(--space-4)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: '1.2rem' }}>{getDimensionIcon(tradeOff.dimension)}</span>
                          <span style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>
                            {tradeOff.label}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {tradeOff.description}
                      </p>

                      <div
                        style={{
                          background: 'var(--color-bg-deep)',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          marginTop: 'var(--space-1)',
                        }}
                      >
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                          {tradeOff.tradeOffSummary}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
                        {comparisonResult.versions.map((v) => {
                          const evalObj = tradeOff.evaluations[v.id];
                          if (!evalObj) return null;
                          return (
                            <div
                              key={v.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 'var(--font-size-xs)',
                                padding: '3px 0',
                                borderBottom: '1px solid var(--color-border-soft)',
                              }}
                            >
                              <span>
                                v{v.versionNumber} ({v.description || 'Version'}):
                              </span>
                              <span style={{ fontWeight: evalObj.isLeader ? 'bold' : 'normal', color: evalObj.isLeader ? 'var(--color-success)' : 'inherit' }}>
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
                <h5 style={{ margin: '0 0 var(--space-2) 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                  Treiber- und Parameter-Matrix (Vergleich zur Referenz)
                </h5>
                <Card padding="0">
                  <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-bg-deep)', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: 'var(--space-3)', whiteSpace: 'nowrap' }}>Treiber / Parameter</th>
                          <th style={{ textAlign: 'left', padding: 'var(--space-3)', whiteSpace: 'nowrap' }}>Einheit</th>
                          {comparisonResult.versions.map((v) => (
                            <th
                              key={v.id}
                              style={{
                                textAlign: 'right',
                                padding: 'var(--space-3)',
                                whiteSpace: 'nowrap',
                                background: v.id === effectiveRefId ? 'var(--color-primary-soft)' : 'transparent',
                              }}
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
                              style={{
                                borderBottom: '1px solid var(--color-border-soft)',
                                background: hasAnyChange ? 'var(--color-warning-soft)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: 'var(--space-3)', fontWeight: hasAnyChange ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
                                {pRow.label} {hasAnyChange && '⚡'}
                              </td>
                              <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                {pRow.unit}
                              </td>
                              {comparisonResult.versions.map((v) => {
                                const isChanged = pRow.hasChangedAgainstRef[v.id];
                                return (
                                  <td
                                    key={v.id}
                                    style={{
                                      textAlign: 'right',
                                      padding: 'var(--space-3)',
                                      whiteSpace: 'nowrap',
                                      color: isChanged ? 'var(--color-warning)' : 'inherit',
                                      fontWeight: isChanged ? 'bold' : 'normal',
                                      background: v.id === effectiveRefId ? 'var(--color-primary-soft)' : 'transparent',
                                    }}
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
