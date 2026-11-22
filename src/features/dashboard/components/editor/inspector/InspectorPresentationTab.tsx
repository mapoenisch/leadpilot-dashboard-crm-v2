// Executive Dashboard V2 (Auftrag 148 / P05):
// Präsentations-Tab des Kachel-Inspectors (Titel, Darstellungsart, Legende).

import { useEffect, useState, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardView } from '../../../model/dashboardCatalog';
import type { DashboardTileConfigV2 } from '../../../model/dashboardConfigV2';

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
  { id: 'heatmap', label: 'Heatmap' },
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
        <label
          htmlFor="inspector-title-input"
          className="text-xs font-medium text-[var(--color-text-muted)]"
        >
          Kacheltitel
        </label>
        <input
          id="inspector-title-input"
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
        <h3 className="m-0 text-xs font-medium text-[var(--color-text-muted)]">Anzeigeoptionen</h3>
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
