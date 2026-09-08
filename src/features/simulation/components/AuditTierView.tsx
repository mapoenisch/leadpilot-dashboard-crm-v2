import React, { useState } from 'react';
import { useSimulation } from '../../../context/SimulationContext';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { SimulationRun } from '../../../types/scenario';
import { BaselineSnapshotService } from '../../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../../services/data';

export interface RunSourceAuditInfo {
  baselineVersion: string;
  dataSourceId: string;
  sourceLabel: string;
  sourceKind: 'simulated' | 'file' | 'external';
  sourceDesc: string;
  capturedAt?: string;
  periodStart?: string;
  counts?: { companies: number; contacts: number; deals: number; activities: number };
  isFrozen: boolean;
}

export function resolveRunSourceAudit(run: SimulationRun): RunSourceAuditInfo {
  const baselineVersion = run.manifest.baselineVersion;
  let dataSourceId = run.manifest.dataSourceId;
  let capturedAt: string | undefined;
  let periodStart: string | undefined;
  let counts: { companies: number; contacts: number; deals: number; activities: number } | undefined;
  let isFrozen = false;

  if (BaselineSnapshotService.has(baselineVersion)) {
    const ds = BaselineSnapshotService.get(baselineVersion);
    isFrozen = true;
    dataSourceId = dataSourceId || ds.sourceId;
    capturedAt = ds.capturedAt;
    periodStart = ds.periodStart;
    counts = ds.counts;
  }

  if (!dataSourceId) {
    if (baselineVersion.startsWith('baseline-file:')) {
      dataSourceId = baselineVersion;
    } else if (baselineVersion.startsWith('baseline-')) {
      const parts = baselineVersion.split('-');
      dataSourceId = parts[1] || 'simulated-crm';
    } else {
      dataSourceId = 'simulated-crm';
    }
  }

  let sourceLabel = dataSourceId;
  let sourceKind: 'simulated' | 'file' | 'external' = 'simulated';
  let sourceDesc = '';

  try {
    const info = dataSourceRegistry.get(dataSourceId).info;
    sourceLabel = info.label;
    sourceKind = info.kind;
    sourceDesc = info.description;
  } catch {
    if (dataSourceId.startsWith('baseline-file:')) {
      sourceKind = 'file';
      sourceLabel = `Baseline-Datei (${dataSourceId.replace('baseline-file:', '')})`;
      sourceDesc = 'Eingefrorener Dateidatensatz';
    } else if (dataSourceId.startsWith('hubspot-baseline:')) {
      sourceKind = 'external';
      sourceLabel = `HubSpot-Baseline (${dataSourceId.replace('hubspot-baseline:', '')})`;
      sourceDesc = 'Offline per n8n gezogener HubSpot-Snapshot';
    }
  }

  return {
    baselineVersion,
    dataSourceId,
    sourceLabel,
    sourceKind,
    sourceDesc,
    capturedAt,
    periodStart,
    counts,
    isFrozen,
  };
}

export const AuditTierView: React.FC = () => {
  const { runs, reRun, reproduce } = useSimulation();
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'manifest' | 'snapshot'>('manifest');

  const getStatusBadgeVariant = (status: string): 'cyan' | 'mint' | 'orange' | 'neutral' => {
    switch (status) {
      case 'COMPLETED':
        return 'cyan';
      case 'RUNNING':
        return 'mint';
      case 'CANCELLED':
        return 'orange';
      case 'FAILED':
      default:
        return 'neutral';
    }
  };

  const handleInspectRun = (run: SimulationRun) => {
    setSelectedRun(run);
    setActiveModalTab('manifest');
  };

  const selectedSourceAudit = selectedRun ? resolveRunSourceAudit(selectedRun) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header Banner */}
      <Card padding="var(--space-4)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>
              Technik & Audit-Ebene: Technische Run-Historie
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Vollständige technische Liste aller durchgeführten Simulationsläufe (`SimulationRun`), Seeds, Manifeste, Snapshots und Status.
            </p>
          </div>
          <Badge variant="neutral">Gesamtläufe: {runs.length}</Badge>
        </div>
      </Card>

      {/* Technical Run Table */}
      <Card padding="var(--space-5)">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text)' }}>
                <th style={{ padding: '12px' }}>Run-ID</th>
                <th style={{ padding: '12px' }}>Szenario / Version</th>
                <th style={{ padding: '12px' }}>Baseline / Quelle</th>
                <th style={{ padding: '12px' }}>Seed</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Ergebnis ARR</th>
                <th style={{ padding: '12px' }}>Erstellt am</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const finalArr = run.finalMetrics?.liveARR || run.finalState?.metrics?.liveARR || 0;
                const srcAudit = resolveRunSourceAudit(run);
                return (
                  <tr key={run.runId} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {run.runId}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-text)' }}>
                      <div>{run.scenarioId}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{run.scenarioVersionId}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {srcAudit.baselineVersion}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {srcAudit.sourceLabel} ({srcAudit.sourceKind})
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                      {run.seed}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant={getStatusBadgeVariant(run.status)}>{run.status}</Badge>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {finalArr > 0 ? `${finalArr.toLocaleString('de-DE')} €` : '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                      {run.startedAt ? new Date(run.startedAt).toLocaleTimeString('de-DE') : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="secondary" onClick={() => handleInspectRun(run)}>
                          Audit
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => reRun(run.scenarioVersionId)}>
                          Re-Run
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => reproduce(run.runId)}>
                          Reproduce
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Technical Audit & Manifest Modal */}
      {selectedRun && selectedSourceAudit && (
        <Modal
          open={Boolean(selectedRun)}
          onClose={() => setSelectedRun(null)}
          title={`Audit-Details: ${selectedRun.runId}`}
          maxWidth="750px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setActiveModalTab('manifest')}
                style={{
                  background: activeModalTab === 'manifest' ? 'var(--color-primary-soft)' : 'transparent',
                  color: activeModalTab === 'manifest' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: 'none',
                  padding: '8px 14px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                }}
              >
                RunManifest & Parameter
              </button>
              <button
                onClick={() => setActiveModalTab('snapshot')}
                style={{
                  background: activeModalTab === 'snapshot' ? 'var(--color-primary-soft)' : 'transparent',
                  color: activeModalTab === 'snapshot' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: 'none',
                  padding: '8px 14px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                }}
              >
                Snapshot Integrität & State
              </button>
            </div>

            {/* TAB 1: RunManifest Details */}
            {activeModalTab === 'manifest' && (
              <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Seed:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedRun.manifest.seed}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Model Version:</span>
                  <span>{selectedRun.manifest.modelVersion}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Schema Version:</span>
                  <span>{selectedRun.manifest.schemaVersion}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Correlation ID:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedRun.manifest.correlationId}</span>
                </div>

                {/* Data Source & Baseline Snapshot Section */}
                <div style={{ background: 'var(--color-bg-deep)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-soft)', marginTop: '4px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Eingefrorene Datenquelle & Baseline</span>
                    <Badge variant="cyan">{selectedSourceAudit.isFrozen ? 'EINGEFROREN (IMMUTABLE)' : 'FROZEN IN RUN'}</Badge>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Baseline-Version:</div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {selectedSourceAudit.baselineVersion}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Datenquellen-ID:</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedSourceAudit.dataSourceId}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Quellenart:</div>
                      <Badge variant={selectedSourceAudit.sourceKind === 'simulated' ? 'mint' : selectedSourceAudit.sourceKind === 'file' ? 'cyan' : 'orange'}>
                        {selectedSourceAudit.sourceKind}
                      </Badge>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Quellen-Label:</div>
                      <div style={{ fontWeight: 600 }}>{selectedSourceAudit.sourceLabel}</div>
                    </div>
                  </div>
                  {selectedSourceAudit.counts && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-soft)', paddingTop: '6px' }}>
                      Snapshot-Umfang: {selectedSourceAudit.counts.companies} Companies | {selectedSourceAudit.counts.contacts} Kontakte | {selectedSourceAudit.counts.deals} Deals | {selectedSourceAudit.counts.activities} Aktivitäten
                      {selectedSourceAudit.capturedAt && ` (Erfasst: ${new Date(selectedSourceAudit.capturedAt).toLocaleTimeString('de-DE')})`}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>Eingefrorene Run-Parameter:</div>
                  <pre
                    style={{
                      background: 'var(--color-bg-deep)',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      overflowX: 'auto',
                      fontSize: '11px',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {JSON.stringify(selectedRun.manifest.parameters, null, 2)}
                  </pre>
                </div>

                {selectedRun.manifest.measures && selectedRun.manifest.measures.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                      Eingefrorene Maßnahmen ({selectedRun.manifest.measures.length}):
                    </div>
                    <pre
                      style={{
                        background: 'var(--color-bg-deep)',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        overflowX: 'auto',
                        fontSize: '11px',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {JSON.stringify(selectedRun.manifest.measures, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Snapshot Integrity Details */}
            {activeModalTab === 'snapshot' && (
              <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'var(--color-bg-deep)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Finaler State Status:</div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Tick-Anzahl: {selectedRun.finalState?.tickCount ?? 0} | Simulationstag: {selectedRun.finalState?.dayIndex ?? 0}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>RNG Endzustand:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedRun.rngState}</span>
                </div>

                <div style={{ background: 'var(--color-bg-deep)', padding: '10px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Finanzdaten-Snapshot:</div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontSize: '11.5px' }}>
                    Net Revenue: {(selectedRun.finalMetrics?.financialMetrics?.netRevenue ?? 0).toLocaleString('de-DE')} € | EBITDA: {(selectedRun.finalMetrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} € | OPEX: {(selectedRun.finalMetrics?.financialMetrics?.totalOpex ?? 0).toLocaleString('de-DE')} € | CAC: {(selectedRun.finalMetrics?.financialMetrics?.cac ?? 0).toLocaleString('de-DE')} € | Cash Flow: {(selectedRun.finalMetrics?.financialMetrics?.netCashFlow ?? 0).toLocaleString('de-DE')} €
                  </div>
                </div>

                <div style={{ background: 'var(--color-bg-deep)', padding: '10px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>State Machine & Tick-Invarianten:</span>
                    <Badge variant={selectedRun.finalState?.hasInvariantViolation ? 'orange' : 'cyan'}>
                      {selectedRun.finalState?.hasInvariantViolation ? 'INVARIANTEN-VERLETZUNG' : 'INVARIANTEN 100% VALIDE'}
                    </Badge>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontSize: '11.5px' }}>
                    Abgewiesene Transitions: {selectedRun.finalState?.rejectedTransitions?.length ?? 0} Einträge | Regelprüfungen: ARR=MRR×12, Churn Cleanliness, Customer Count.
                  </div>
                </div>

                <div style={{ background: 'var(--color-bg-deep)', padding: '10px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Storage Optimization & Pruning:</span>
                    <Badge variant="mint">RETENTION POLICY AKTIV</Badge>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '4px', fontSize: '11.5px' }}>
                    Selective Pruning: Erhält Tick 0, Meilensteine (alle 30 Ticks), Final-Tick & 100% Projections.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Button size="sm" variant="primary" onClick={() => reproduce(selectedRun.runId)}>
                    Diesen Run exakt Reproduzieren
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
