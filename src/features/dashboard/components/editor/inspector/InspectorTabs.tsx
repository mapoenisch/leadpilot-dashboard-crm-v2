// Executive Dashboard V2 (Auftrag 148 / P05):
// Modulare Tabs für den Kachel-Inspector (Darstellung, Daten & Filter, Schwellenwerte, Interaktion).

import { useEffect, useState, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import type { ActiveCatalogEntry, DashboardView } from '../../../model/dashboardCatalog';
import type { DashboardTileConfigV2, TileThresholdRule } from '../../../model/dashboardConfigV2';

export const AVAILABLE_VIEWS: Array<{ id: DashboardView; label: string }> = [
  { id: 'zahl', label: 'Zahl' },
  { id: 'saeulen', label: 'Säulen' },
  { id: 'balken', label: 'Balken' },
  { id: 'linie', label: 'Linie' },
  { id: 'flaeche', label: 'Fläche' },
  { id: 'ring', label: 'Donut' },
  { id: 'kreis', label: 'Kreis' },
  { id: 'tabelle', label: 'Tabelle' },
  { id: 'gauge', label: 'Gauge' },
  { id: 'sparkline', label: 'Sparkline' },
  { id: 'trichter', label: 'Trichter' },
];

export function InspectorPresentationTab({
  selectedTile,
  supportedViews,
  onTileTitleChange,
  onTileViewChange,
  onTileOverrideChange,
}: {
  selectedTile: DashboardTileConfigV2;
  supportedViews: readonly DashboardView[];
  onTileTitleChange: (tileId: string, newTitle: string) => void;
  onTileViewChange: (tileId: string, view: DashboardView) => void;
  onTileOverrideChange: (tileId: string, patch: Partial<DashboardTileConfigV2>) => void;
}) {
  const [titleInput, setTitleInput] = useState(selectedTile.title);

  useEffect(() => {
    setTitleInput(selectedTile.title);
  }, [selectedTile.id, selectedTile.title]);

  const handleTitleBlur = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== selectedTile.title) {
      onTileTitleChange(selectedTile.id, trimmed);
    } else {
      setTitleInput(selectedTile.title);
    }
  };

  return (
    <div data-testid="tab-content-darstellung" className="space-y-4">
      {/* Titel bearbeiten */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Kacheltitel</label>
        <input
          data-testid="inspector-title-input"
          type="text"
          value={titleInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitleInput(e.target.value)}
          onBlur={handleTitleBlur}
          maxLength={80}
          className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary"
        />
      </div>

      {/* Visualisierungs-Auswahl */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          Darstellungsart
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {AVAILABLE_VIEWS.map((v) => {
            const isSupported = supportedViews.includes(v.id);
            const isSelected = selectedTile.presentation === v.id;

            return (
              <button
                key={v.id}
                type="button"
                disabled={!isSupported}
                data-testid={`view-option-${v.id}`}
                onClick={() => onTileViewChange(selectedTile.id, v.id)}
                className={cn(
                  'flex items-center justify-between rounded border px-2.5 py-1.5 text-xs transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/20 text-primary font-semibold'
                    : isSupported
                      ? 'border-[var(--color-border,#1b3d39)] bg-black/20 text-[var(--color-text-soft)] hover:bg-black/40 hover:text-white'
                      : 'border-white/5 bg-transparent text-[var(--color-text-muted)] opacity-30 cursor-not-allowed',
                )}
              >
                <span>{v.label}</span>
                {!isSupported && <span className="text-[9px] uppercase opacity-60">n/a</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visuelle Optionen */}
      <div className="space-y-2 pt-2 border-t border-[var(--color-border,#1b3d39)]">
        <h5 className="m-0 text-xs font-medium text-[var(--color-text-muted)]">Anzeigeoptionen</h5>
        <label className="flex items-center gap-2 text-xs text-[var(--color-text-soft)] cursor-pointer">
          <input
            type="checkbox"
            data-testid="toggle-legend-checkbox"
            checked={selectedTile.displayOptions?.showLegend ?? true}
            onChange={(e) =>
              onTileOverrideChange(selectedTile.id, {
                displayOptions: {
                  ...selectedTile.displayOptions,
                  showLegend: e.target.checked,
                },
              })
            }
            className="rounded border-[var(--color-border,#1b3d39)]"
          />
          <span>Legende anzeigen</span>
        </label>
      </div>
    </div>
  );
}

export function InspectorDataTab({
  selectedTile,
  catalogEntry,
  onTileOverrideChange,
}: {
  selectedTile: DashboardTileConfigV2;
  catalogEntry: ActiveCatalogEntry | undefined;
  onTileOverrideChange: (tileId: string, patch: Partial<DashboardTileConfigV2>) => void;
}) {
  return (
    <div data-testid="tab-content-daten" className="space-y-4">
      {catalogEntry && (
        <div className="rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-2.5 text-xs space-y-1.5">
          <div className="text-[var(--color-text-muted)] font-medium">Kennzahl-Details:</div>
          <div className="text-white font-semibold">{catalogEntry.name}</div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {catalogEntry.definition}
          </div>
          <div className="flex gap-2 pt-1 text-[10px]">
            <span className="text-[var(--color-text-muted)]">Einheit:</span>
            <span className="text-white font-medium">{catalogEntry.unit}</span>
            <span className="text-[var(--color-text-muted)] ml-2">Quelle:</span>
            <span className="text-white font-medium capitalize">{catalogEntry.source.layer}</span>
          </div>
        </div>
      )}

      {/* Pipeline-Override */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          Pipeline-Zuordnung
        </label>
        <select
          data-testid="inspector-pipeline-override"
          value={selectedTile.pipelineOverride ?? ''}
          onChange={(e) =>
            onTileOverrideChange(selectedTile.id, {
              pipelineOverride: e.target.value || undefined,
            })
          }
          className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
        >
          <option value="" className="bg-[var(--color-bg-deep,#051413)]">
            Standard (folgt Dashboard)
          </option>
          <option value="vertrieb_q4" className="bg-[var(--color-bg-deep,#051413)]">
            Vertrieb Q4
          </option>
          <option value="enterprise" className="bg-[var(--color-bg-deep,#051413)]">
            Enterprise Deals
          </option>
          <option value="inbound" className="bg-[var(--color-bg-deep,#051413)]">
            Inbound Leads
          </option>
        </select>
      </div>

      {/* Zeitraum-Override */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          Zeitraum-Override
        </label>
        <select
          data-testid="inspector-timeframe-override"
          value={selectedTile.timeframeOverride ?? ''}
          onChange={(e) =>
            onTileOverrideChange(selectedTile.id, {
              timeframeOverride: e.target.value || undefined,
            })
          }
          className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
        >
          <option value="" className="bg-[var(--color-bg-deep,#051413)]">
            Standard (folgt Dashboard)
          </option>
          <option value="letzte_7_tage" className="bg-[var(--color-bg-deep,#051413)]">
            Feste 7 Tage
          </option>
          <option value="letzte_30_tage" className="bg-[var(--color-bg-deep,#051413)]">
            Feste 30 Tage
          </option>
          <option value="quartal" className="bg-[var(--color-bg-deep,#051413)]">
            Festes Quartal
          </option>
        </select>
      </div>
    </div>
  );
}

export function InspectorThresholdTab({
  selectedTile,
  onTileThresholdChange,
}: {
  selectedTile: DashboardTileConfigV2;
  onTileThresholdChange: (tileId: string, rule: TileThresholdRule | undefined) => void;
}) {
  return (
    <div data-testid="tab-content-schwellenwerte" className="space-y-4">
      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
        <input
          type="checkbox"
          data-testid="threshold-enable-toggle"
          checked={selectedTile.threshold?.enabled ?? false}
          onChange={(e) =>
            onTileThresholdChange(
              selectedTile.id,
              e.target.checked
                ? {
                    enabled: true,
                    operator: selectedTile.threshold?.operator ?? 'gt',
                    warningValue: selectedTile.threshold?.warningValue ?? 100,
                    criticalValue: selectedTile.threshold?.criticalValue ?? 200,
                  }
                : undefined,
            )
          }
          className="rounded border-[var(--color-border,#1b3d39)]"
        />
        <span className="font-medium">Schwellenwert-Überwachung aktivieren</span>
      </label>

      {selectedTile.threshold?.enabled && (
        <div className="space-y-3 rounded border border-white/10 bg-black/30 p-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--color-text-muted)]">Operator</label>
            <select
              data-testid="threshold-operator-select"
              value={selectedTile.threshold.operator}
              onChange={(e) =>
                onTileThresholdChange(selectedTile.id, {
                  ...selectedTile.threshold!,
                  operator: e.target.value as TileThresholdRule['operator'],
                })
              }
              className="h-7 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none"
            >
              <option value="gt">Größer als (&gt;)</option>
              <option value="lt">Kleiner als (&lt;)</option>
              <option value="gte">Größer gleich (&gt;=)</option>
              <option value="lte">Kleiner gleich (&lt;=)</option>
              <option value="between">Zwischen Bereich</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-amber-300">Warn-Grenze</label>
              <input
                data-testid="threshold-warning-input"
                type="number"
                value={selectedTile.threshold.warningValue ?? ''}
                onChange={(e) =>
                  onTileThresholdChange(selectedTile.id, {
                    ...selectedTile.threshold!,
                    warningValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-7 w-full rounded border border-amber-500/40 bg-black/40 px-2 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-rose-300">Kritisch-Grenze</label>
              <input
                data-testid="threshold-critical-input"
                type="number"
                value={selectedTile.threshold.criticalValue ?? ''}
                onChange={(e) =>
                  onTileThresholdChange(selectedTile.id, {
                    ...selectedTile.threshold!,
                    criticalValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-7 w-full rounded border border-rose-500/40 bg-black/40 px-2 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InspectorInteractionTab({
  selectedTile,
  onTileDrilldownChange,
}: {
  selectedTile: DashboardTileConfigV2;
  onTileDrilldownChange?: (tileId: string, url: string | undefined) => void;
}) {
  return (
    <div data-testid="tab-content-interaktion" className="space-y-3">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">
        Drilldown-Ziel bei Klick
      </label>
      <input
        data-testid="drilldown-url-input"
        type="text"
        placeholder="/crm/deals oder https://…"
        value={selectedTile.drilldownUrl ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onTileDrilldownChange?.(selectedTile.id, e.target.value || undefined)
        }
        className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary"
      />
      <p className="m-0 text-[11px] text-[var(--color-text-muted)]">
        Wird beim Anklicken der Kachel im Lesemodus aufgerufen.
      </p>
    </div>
  );
}
