import React, { useState } from 'react';
import { useSimulation } from '../../../context/SimulationContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Select } from '../../../components/ui/Select';
import { dataSourceRegistry } from '../../../services/data';

interface RunActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunActionModal: React.FC<RunActionModalProps> = ({ isOpen, onClose }) => {
  const { activeVersion, runVersion, reRun, runs, reproduce, draftMeasures } = useSimulation();
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSource = dataSourceRegistry.getActive();

  const handleStartRun = async () => {
    if (!activeVersion) return;
    try {
      await runVersion(activeVersion.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Starten des Runs.');
    }
  };

  const handleReRun = async () => {
    if (!activeVersion) return;
    try {
      await reRun(activeVersion.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Ausführen von Re-Run.');
    }
  };

  const handleReproduce = async () => {
    if (!selectedRunId) {
      setErrorMsg('Bitte wählen Sie einen Run zum Reproduzieren aus.');
      return;
    }
    try {
      await reproduce(selectedRunId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Reproduzieren des Runs.');
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="SimulationRun Steuerung" maxWidth="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
        {errorMsg && (
          <Alert variant="error" title="Fehler bei Run-Ausführung">
            {errorMsg}
          </Alert>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text)' }}>
          <div>
            Aktive Version: <strong>{activeVersion ? `v${activeVersion.versionNumber} (${activeVersion.id})` : 'Keine'}</strong>
            {draftMeasures.length > 0 && (
              <span style={{ marginLeft: '8px', color: 'var(--color-primary)', fontSize: '12px' }}>
                ({draftMeasures.length} aktive Maßnahme{draftMeasures.length > 1 ? 'n' : ''})
              </span>
            )}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
            Quelle: <strong style={{ color: 'var(--color-primary)' }}>{activeSource.info.label}</strong> ({activeSource.info.id})
          </div>
        </div>

        {/* Action 1: Standard Run */}
        <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>Run Ausführen (Preflight-Prüfung)</div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 10px 0' }}>
            Führt einen neuen Simulationslauf für die aktive Version aus. Vorab wird die Preflight-Validierung durchgeführt.
          </p>
          <Button variant="primary" onClick={handleStartRun}>
            Neuen Run Starten
          </Button>
        </div>

        {/* Action 2: Re-Run (New Seed) */}
        <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary)' }}>Re-Run (Erneut ausführen - Neuer Seed)</div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 10px 0' }}>
            Generiert einen neuen Zufalls-Seed für dieselbe Szenarioversion. Unveränderliches neues RunManifest wird erzeugt.
          </p>
          <Button variant="secondary" onClick={handleReRun}>
            Re-Run Ausführen
          </Button>
        </div>

        {/* Action 3: Reproduce (Same Seed & Manifest) */}
        <div style={{ padding: '12px', background: 'var(--color-bg-deep)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-accent)' }}>Reproduce (Exakt Reproduzieren - Identischer Seed)</div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 10px 0' }}>
            Nutzt exakt den ursprünglichen Seed und das ursprüngliche Manifest eines bisherigen Runs zur 100% deterministischen Wiederholung.
          </p>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ flex: 1 }}>
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
      </div>
    </Modal>
  );
};
