import React, { useState } from 'react';
import { useActiveVersion, useDraftMeasures, useRunActions, useRuns } from '../../../store/hooks';
import { useOrganization } from '../../../auth/organizationContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Select } from '../../../components/ui/Select';
import { dataSourceRegistry } from '../../../services/data';
import { canControlRuns } from '../../../simulation/runControlService';
import { RunControlBar } from './RunControlBar';

interface RunActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunActionModal: React.FC<RunActionModalProps> = ({ isOpen, onClose }) => {
  const activeVersion = useActiveVersion();
  const { runVersion, reRun, reproduce } = useRunActions();
  // 067F / G49 (freigegebene UI-Verdrahtung): Mit Sitzungs-Mandant läuft der
  // Run mandantengebunden und persistiert atomar auf dem Server.
  const { session } = useOrganization();
  // Viewer strikt lesend (Entscheid 25.09.2026): keine Start-Aktionen.
  const role = session?.role ?? null;
  const readOnly = session !== null && !canControlRuns(role);
  const runs = useRuns();
  const draftMeasures = useDraftMeasures();
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSource = dataSourceRegistry.getActive();

  // 067Q / G63: Ein Abbruch ist kein Fehler — die Steuerleiste zeigt ihn samt
  // Wiederholen-Option; alle anderen Fehler bleiben als Alert sichtbar.
  const reportError = (err: unknown, fallback: string) => {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code: unknown }).code
        : undefined;
    if (code === 'SIMULATION_CANCELLED') return;
    setErrorMsg((err instanceof Error ? err.message : '') || fallback);
  };

  const handleStartRun = async () => {
    if (!activeVersion) return;
    try {
      await runVersion(activeVersion.id, session?.organizationId, role);
      onClose();
    } catch (err) {
      reportError(err, 'Fehler beim Starten des Runs.');
    }
  };

  const handleReRun = async () => {
    if (!activeVersion) return;
    try {
      await reRun(activeVersion.id, role);
      onClose();
    } catch (err) {
      reportError(err, 'Fehler beim Ausführen von Re-Run.');
    }
  };

  const handleReproduce = async () => {
    if (!selectedRunId) {
      setErrorMsg('Bitte wählen Sie einen Run zum Reproduzieren aus.');
      return;
    }
    try {
      await reproduce(selectedRunId, role);
      onClose();
    } catch (err) {
      setErrorMsg(
        (err instanceof Error ? err.message : '') || 'Fehler beim Reproduzieren des Runs.',
      );
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="SimulationRun Steuerung" maxWidth="600px">
      <div className="flex flex-col gap-[var(--space-4)] w-full">
        <RunControlBar />

        {errorMsg && (
          <Alert variant="error" title="Fehler bei Run-Ausführung">
            {errorMsg}
          </Alert>
        )}

        <div className="flex justify-between text-[13px] text-text">
          <div>
            Aktive Version:{' '}
            <strong>
              {activeVersion ? `v${activeVersion.versionNumber} (${activeVersion.id})` : 'Keine'}
            </strong>
            {draftMeasures.length > 0 && (
              <span className="ml-[8px] text-[12px] text-primary">
                ({draftMeasures.length} aktive Maßnahme{draftMeasures.length > 1 ? 'n' : ''})
              </span>
            )}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Quelle: <strong className="text-primary">{activeSource.info.label}</strong> (
            {activeSource.info.id})
          </div>
        </div>

        {readOnly ? (
          <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
            Runs und Ergebnisse sind sichtbar; Starten, Re-Run und Reproduzieren sind nur für Admin
            und Manager möglich (nur Lesezugriff).
          </p>
        ) : (
          <>
            {/* Action 1: Standard Run */}
            <div className="rounded border border-solid border-border-soft bg-background-deep p-[12px]">
              <div className="font-semibold text-[14px] text-text">
                Run Ausführen (Preflight-Prüfung)
              </div>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-[4px] mb-[10px] mr-0 ml-0">
                Führt einen neuen Simulationslauf für die aktive Version aus. Vorab wird die
                Preflight-Validierung durchgeführt.
              </p>
              <Button variant="primary" onClick={handleStartRun}>
                Neuen Run Starten
              </Button>
            </div>

            {/* Action 2: Re-Run (New Seed) */}
            <div className="rounded border border-solid border-border-soft bg-background-deep p-[12px]">
              <div className="font-semibold text-[14px] text-primary">
                Re-Run (Erneut ausführen - Neuer Seed)
              </div>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-[4px] mb-[10px] mr-0 ml-0">
                Generiert einen neuen Zufalls-Seed für dieselbe Szenarioversion. Unveränderliches
                neues RunManifest wird erzeugt.
              </p>
              <Button variant="secondary" onClick={handleReRun}>
                Re-Run Ausführen
              </Button>
            </div>

            {/* Action 3: Reproduce (Same Seed & Manifest) */}
            <div className="rounded border border-solid border-border-soft bg-background-deep p-[12px]">
              <div className="font-semibold text-[14px] text-accent">
                Reproduce (Exakt Reproduzieren - Identischer Seed)
              </div>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-[4px] mb-[10px] mr-0 ml-0">
                Nutzt exakt den ursprünglichen Seed und das ursprüngliche Manifest eines bisherigen
                Runs zur 100% deterministischen Wiederholung.
              </p>

              <div className="flex gap-[8px] items-center mt-[4px]">
                <div className="flex-1">
                  <Select
                    options={[
                      { value: '', label: '-- Run Auswählen --' },
                      ...runs.map((r) => ({
                        value: r.runId,
                        label: `${r.runId} (Seed: ${r.seed})`,
                      })),
                    ]}
                    value={selectedRunId}
                    onChange={setSelectedRunId}
                    placeholder="-- Run Auswählen --"
                    sizeVariant="sm"
                    fullWidth
                  />
                </div>
                <Button variant="secondary" onClick={handleReproduce}>
                  Reproduzieren
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
