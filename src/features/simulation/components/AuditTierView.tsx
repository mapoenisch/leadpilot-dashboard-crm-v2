import React, { useState } from 'react';
import { useRuns, useRunActions } from '../../../store/hooks';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { SimulationRun } from '../../../types/scenario';

import { resolveRunSourceAudit } from '../../../services/data/runSourceAudit';

export const AuditTierView: React.FC = () => {
  const runs = useRuns();
  const { reRun, reproduce } = useRunActions();
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
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Header Banner */}
      <Card padding="var(--space-4)">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="m-0 text-[18px] text-text">
              Technik & Audit-Ebene: Technische Run-Historie
            </h3>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-[4px] mb-0 mr-0 ml-0">
              Vollständige technische Liste aller durchgeführten Simulationsläufe (`SimulationRun`), Seeds, Manifeste, Snapshots und Status.
            </p>
          </div>
          <Badge variant="neutral">Gesamtläufe: {runs.length}</Badge>
        </div>
      </Card>

      {/* Technical Run Table */}
      <Card padding="var(--space-5)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] text-left">
            <thead>
              <tr className="border-0 border-b-2 border-solid border-border text-text">
                <th className="p-[12px]">Run-ID</th>
                <th className="p-[12px]">Szenario / Version</th>
                <th className="p-[12px]">Baseline / Quelle</th>
                <th className="p-[12px]">Seed</th>
                <th className="p-[12px]">Status</th>
                <th className="p-[12px]">Ergebnis ARR</th>
                <th className="p-[12px]">Erstellt am</th>
                <th className="text-right p-[12px]">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const finalArr = run.finalMetrics?.liveARR || run.finalState?.metrics?.liveARR || 0;
                const srcAudit = resolveRunSourceAudit(run);
                return (
                  <tr key={run.runId} className="border-0 border-b border-solid border-border-soft">
                    <td className="font-mono font-semibold text-primary p-[12px]">
                      {run.runId}
                    </td>
                    <td className="text-text p-[12px]">
                      <div>{run.scenarioId}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{run.scenarioVersionId}</div>
                    </td>
                    <td className="text-[12px] p-[12px]">
                      <div className="font-mono font-semibold text-primary">
                        {srcAudit.baselineVersion}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        {srcAudit.sourceLabel} ({srcAudit.sourceKind})
                      </div>
                    </td>
                    <td className="font-mono text-[var(--color-text-muted)] p-[12px]">
                      {run.seed}
                    </td>
                    <td className="p-[12px]">
                      <Badge variant={getStatusBadgeVariant(run.status)}>{run.status}</Badge>
                    </td>
                    <td className="font-bold text-accent p-[12px]">
                      {finalArr > 0 ? `${finalArr.toLocaleString('de-DE')} €` : '—'}
                    </td>
                    <td className="text-[11.5px] text-[var(--color-text-muted)] p-[12px]">
                      {run.startedAt ? new Date(run.startedAt).toLocaleTimeString('de-DE') : '—'}
                    </td>
                    <td className="text-right p-[12px]">
                      <div className="flex gap-[6px] justify-end">
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
          <div className="flex flex-col gap-[var(--space-4)] w-full">
            {/* Modal Tabs */}
            <div className="border-0 border-b border-solid border-border flex gap-[8px]">
              <button
                onClick={() => setActiveModalTab('manifest')}
                className={`border-0 rounded-t font-semibold text-[13px] cursor-pointer px-[14px] py-[8px] ${activeModalTab === 'manifest' ? 'bg-primary-soft text-primary' : 'bg-transparent text-[var(--color-text-muted)]'}`}
              >
                RunManifest & Parameter
              </button>
              <button
                onClick={() => setActiveModalTab('snapshot')}
                className={`border-0 rounded-t font-semibold text-[13px] cursor-pointer px-[14px] py-[8px] ${activeModalTab === 'snapshot' ? 'bg-primary-soft text-primary' : 'bg-transparent text-[var(--color-text-muted)]'}`}
              >
                Snapshot Integrität & State
              </button>
            </div>

            {/* TAB 1: RunManifest Details */}
            {activeModalTab === 'manifest' && (
              <div className="flex flex-col gap-[8px] text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Seed:</span>
                  <span className="font-mono font-semibold">{selectedRun.manifest.seed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Model Version:</span>
                  <span>{selectedRun.manifest.modelVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Schema Version:</span>
                  <span>{selectedRun.manifest.schemaVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Correlation ID:</span>
                  <span className="font-mono">{selectedRun.manifest.correlationId}</span>
                </div>

                {/* Data Source & Baseline Snapshot Section */}
                <div className="rounded border border-solid border-border-soft bg-background-deep mt-[4px] px-[12px] py-[10px]">
                  <div className="flex justify-between items-center font-semibold text-text mb-[8px]">
                    <span>Eingefrorene Datenquelle & Baseline</span>
                    <Badge variant="cyan">{selectedSourceAudit.isFrozen ? 'EINGEFROREN (IMMUTABLE)' : 'FROZEN IN RUN'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-[8px] text-[12px]">
                    <div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Baseline-Version:</div>
                      <div className="font-mono font-semibold text-primary">
                        {selectedSourceAudit.baselineVersion}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Datenquellen-ID:</div>
                      <div className="font-mono font-semibold">{selectedSourceAudit.dataSourceId}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Quellenart:</div>
                      <Badge variant={selectedSourceAudit.sourceKind === 'simulated' ? 'mint' : selectedSourceAudit.sourceKind === 'file' ? 'cyan' : 'orange'}>
                        {selectedSourceAudit.sourceKind}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Quellen-Label:</div>
                      <div className="font-semibold">{selectedSourceAudit.sourceLabel}</div>
                    </div>
                  </div>
                  {selectedSourceAudit.counts && (
                    <div className="border-0 border-t border-solid border-border-soft text-[11px] mt-[8px] pt-[6px] text-[var(--color-text-muted)]">
                      Snapshot-Umfang: {selectedSourceAudit.counts.companies} Companies | {selectedSourceAudit.counts.contacts} Kontakte | {selectedSourceAudit.counts.deals} Deals | {selectedSourceAudit.counts.activities} Aktivitäten
                      {selectedSourceAudit.capturedAt && ` (Erfasst: ${new Date(selectedSourceAudit.capturedAt).toLocaleTimeString('de-DE')})`}
                    </div>
                  )}
                </div>

                <div className="mt-[8px]">
                  <div className="font-semibold text-text mb-[4px]">Eingefrorene Run-Parameter:</div>
                  <pre className="rounded bg-background-deep overflow-x-auto text-[11px] text-primary p-[10px]">
                    {JSON.stringify(selectedRun.manifest.parameters, null, 2)}
                  </pre>
                </div>

                {selectedRun.manifest.measures && selectedRun.manifest.measures.length > 0 && (
                  <div className="mt-[8px]">
                    <div className="font-semibold text-text mb-[4px]">
                      Eingefrorene Maßnahmen ({selectedRun.manifest.measures.length}):
                    </div>
                    <pre className="rounded bg-background-deep overflow-x-auto text-[11px] text-accent p-[10px]">
                      {JSON.stringify(selectedRun.manifest.measures, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Snapshot Integrity Details */}
            {activeModalTab === 'snapshot' && (
              <div className="flex flex-col gap-[8px] text-[12.5px]">
                <div className="rounded bg-background-deep p-[10px]">
                  <div className="font-semibold text-text">Finaler State Status:</div>
                  <div className="mt-[4px] text-[var(--color-text-muted)]">
                    Tick-Anzahl: {selectedRun.finalState?.tickCount ?? 0} | Simulationstag: {selectedRun.finalState?.dayIndex ?? 0}
                  </div>
                </div>

                <div className="flex justify-between mt-[8px]">
                  <span className="text-[var(--color-text-muted)]">RNG Endzustand:</span>
                  <span className="font-mono">{selectedRun.rngState}</span>
                </div>

                <div className="rounded bg-background-deep mt-[8px] p-[10px]">
                  <div className="font-semibold text-text">Finanzdaten-Snapshot:</div>
                  <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
                    Net Revenue: {(selectedRun.finalMetrics?.financialMetrics?.netRevenue ?? 0).toLocaleString('de-DE')} € | EBITDA: {(selectedRun.finalMetrics?.financialMetrics?.ebitda ?? 0).toLocaleString('de-DE')} € | OPEX: {(selectedRun.finalMetrics?.financialMetrics?.totalOpex ?? 0).toLocaleString('de-DE')} € | CAC: {(selectedRun.finalMetrics?.financialMetrics?.cac ?? 0).toLocaleString('de-DE')} € | Cash Flow: {(selectedRun.finalMetrics?.financialMetrics?.netCashFlow ?? 0).toLocaleString('de-DE')} €
                  </div>
                </div>

                <div className="rounded bg-background-deep mt-[8px] p-[10px]">
                  <div className="font-semibold text-text flex items-center justify-between">
                    <span>State Machine & Tick-Invarianten:</span>
                    <Badge variant={selectedRun.finalState?.hasInvariantViolation ? 'orange' : 'cyan'}>
                      {selectedRun.finalState?.hasInvariantViolation ? 'INVARIANTEN-VERLETZUNG' : 'INVARIANTEN 100% VALIDE'}
                    </Badge>
                  </div>
                  <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
                    Abgewiesene Transitions: {selectedRun.finalState?.rejectedTransitions?.length ?? 0} Einträge | Regelprüfungen: ARR=MRR×12, Churn Cleanliness, Customer Count.
                  </div>
                </div>

                <div className="rounded bg-background-deep mt-[8px] p-[10px]">
                  <div className="font-semibold text-text flex items-center justify-between">
                    <span>Storage Optimization & Pruning:</span>
                    <Badge variant="mint">RETENTION POLICY AKTIV</Badge>
                  </div>
                  <div className="text-[11.5px] mt-[4px] text-[var(--color-text-muted)]">
                    Selective Pruning: Erhält Tick 0, Meilensteine (alle 30 Ticks), Final-Tick & 100% Projections.
                  </div>
                </div>

                <div className="flex gap-[8px] mt-[12px]">
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
