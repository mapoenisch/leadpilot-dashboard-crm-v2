import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { NumberStepper } from '../../../components/ui/NumberStepper';
import { Alert } from '../../../components/ui/Alert';
import { parameterRegistry } from '../../../simulation/parameterRegistry';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../../simulation/scenarioRepository';
import { Scenario, ScenarioParameters, ScenarioVersion } from '../../../types/scenario';

interface ScenarioManageTabProps {
  scenarios: Scenario[];
  activeScenario: Scenario | null | undefined;
  activeVersion: ScenarioVersion | null | undefined;
  versions: ScenarioVersion[];
  onSelectScenario: (id: string) => void;
  onSelectVersion: (id: string) => void;
  onOpenDiff: (versionId?: string) => void;
  createNewVersion: (
    scenarioId: string,
    params: Partial<ScenarioParameters>,
    description?: string,
  ) => ScenarioVersion;
}

export const ScenarioManageTab: React.FC<ScenarioManageTabProps> = ({
  scenarios,
  activeScenario,
  activeVersion,
  versions,
  onSelectScenario,
  onSelectVersion,
  onOpenDiff,
  createNewVersion,
}) => {
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formParams, setFormParams] = useState<Partial<ScenarioParameters>>({
    marketingBudgetYearly: activeVersion?.parameters.marketingBudgetYearly ?? 65000,
    trialToPaidConversion: activeVersion?.parameters.trialToPaidConversion ?? 18,
    churnRateMonthly: activeVersion?.parameters.churnRateMonthly ?? 2.8,
    salesRepCount: activeVersion?.parameters.salesRepCount ?? 2,
    csRepCount: activeVersion?.parameters.csRepCount ?? 2,
    salesCycleDays: activeVersion?.parameters.salesCycleDays ?? 38,
    discountPercent: activeVersion?.parameters.discountPercent ?? 12,
  });

  const handleParamChange = (
    field: keyof ScenarioParameters,
    val: ScenarioParameters[keyof ScenarioParameters],
  ) => {
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
      onOpenDiff(newVer.id);
    } catch (err) {
      setValidationError(
        (err instanceof Error ? err.message : '') || 'Fehler beim Erstellen der Version.',
      );
    }
  };

  const scenarioSelectOptions = scenarios.map((s) => ({
    value: s.id,
    label: `${s.name} ${s.isProtected ? '(Geschützt - Base 2026)' : ''}`,
  }));

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {/* Active Scenario Selector */}
      <Select
        label="Szenario wechseln"
        options={scenarioSelectOptions}
        value={activeScenario?.id || ''}
        onChange={(val) => onSelectScenario(val)}
      />

      {/* Version Selection Cards */}
      <div>
        <div className="flex justify-between items-center mb-[8px]">
          <span className="text-[13px] font-semibold text-text">
            Vorhandene Szenario-Versionen:
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">Klicken zum Aktivieren</span>
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
                onClick={() => onSelectVersion(v.id)}
              >
                <div>
                  <div className="flex justify-between items-center mb-[6px]">
                    <span
                      className={`font-bold text-[14px] ${isActive ? 'text-primary' : 'text-text'}`}
                    >
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
                    <div>
                      Sales Reps: <strong>{v.parameters.salesRepCount ?? 2}</strong> · CS Reps:{' '}
                      <strong>{v.parameters.csRepCount ?? 2}</strong>
                    </div>
                    <div>
                      Marketing:{' '}
                      <strong>
                        {(v.parameters.marketingBudgetYearly ?? 65000).toLocaleString('de-DE')} €
                      </strong>
                    </div>
                    <div>
                      Conversion: <strong>{v.parameters.trialToPaidConversion ?? 18} %</strong> ·
                      Churn: <strong>{v.parameters.churnRateMonthly ?? 2.8} %</strong>
                    </div>
                  </div>
                </div>

                <div className="border-0 border-t border-solid border-border-soft flex justify-between items-center mt-[10px] pt-[8px]">
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Erstellt:{' '}
                    {new Date(v.createdAt).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="flex gap-[6px]">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVersion(v.id);
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
                        onOpenDiff(v.id);
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
            <Button variant="secondary" onClick={() => onOpenDiff()}>
              Vergleich gegen andere Version öffnen ➔
            </Button>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleCreateVersion}
          className="flex flex-col gap-[var(--space-3)] mt-[8px]"
        >
          <div className="flex justify-between items-center">
            <h4 className="m-0 text-[14px] text-primary">
              Neue Version (v{versions.length + 1}) konfigurieren
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreatingVersion(false)}
            >
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
  );
};
